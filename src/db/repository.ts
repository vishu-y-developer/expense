import { getDB, DEFAULT_SETTINGS } from './db';
import type { AppSettings, MonthlyBudget, Transaction } from '../types';
import { generateId } from '../utils/id';
import { isValidAmount } from '../calc/engine';

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  return db.getAll('transactions');
}

export async function getTransactionsForMonth(monthKey: string): Promise<Transaction[]> {
  const db = await getDB();
  const range = IDBKeyRange.bound(`${monthKey}-01`, `${monthKey}-31`);
  return db.getAllFromIndex('transactions', 'by-date', range);
}

export async function getTransactionsForDate(dateISO: string): Promise<Transaction[]> {
  const db = await getDB();
  return db.getAllFromIndex('transactions', 'by-date', dateISO);
}

export interface NewTransactionInput {
  type: Transaction['type'];
  amount: number;
  category: string;
  sourceOrMerchant: string;
  paymentMethod: string;
  note: string;
  date: string;
  time: string;
}

export function validateTransactionInput(input: NewTransactionInput): string | null {
  if (!isValidAmount(input.amount)) return 'Enter a valid amount greater than 0.';
  if (!input.category) return 'Choose a category.';
  if (!input.date) return 'Choose a date.';
  if (!input.time) return 'Choose a time.';
  return null;
}

export async function addTransaction(input: NewTransactionInput): Promise<Transaction> {
  const error = validateTransactionInput(input);
  if (error) throw new Error(error);
  const now = Date.now();
  const transaction: Transaction = {
    id: generateId(),
    ...input,
    amount: Math.round(input.amount * 100) / 100,
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDB();
  await db.put('transactions', transaction);
  await updateRecents(transaction.type, transaction.category, transaction.paymentMethod);
  return transaction;
}

export async function updateTransaction(
  id: string,
  input: NewTransactionInput
): Promise<Transaction> {
  const error = validateTransactionInput(input);
  if (error) throw new Error(error);
  const db = await getDB();
  const existing = await db.get('transactions', id);
  if (!existing) throw new Error('Transaction not found.');
  const updated: Transaction = {
    ...existing,
    ...input,
    amount: Math.round(input.amount * 100) / 100,
    updatedAt: Date.now(),
  };
  await db.put('transactions', updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('transactions', id);
}

export async function getBudgetForMonth(monthKey: string): Promise<number> {
  const db = await getDB();
  const record = await db.get('budgets', monthKey);
  return record?.amount ?? 0;
}

export async function setBudgetForMonth(monthKey: string, amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Budget must be zero or a positive number.');
  }
  const db = await getDB();
  const record: MonthlyBudget = { month: monthKey, amount: Math.round(amount * 100) / 100 };
  await db.put('budgets', record);
}

export async function getAllBudgets(): Promise<MonthlyBudget[]> {
  const db = await getDB();
  return db.getAll('budgets');
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'settings');
  return settings ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}

async function updateRecents(
  type: Transaction['type'],
  category: string,
  paymentMethod: string
): Promise<void> {
  const settings = await getSettings();
  settings.recentCategory = { ...settings.recentCategory, [type]: category };
  settings.recentPaymentMethod = paymentMethod;
  await saveSettings(settings);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['transactions', 'budgets', 'settings'], 'readwrite');
  await Promise.all([
    tx.objectStore('transactions').clear(),
    tx.objectStore('budgets').clear(),
    tx.objectStore('settings').clear(),
    tx.done,
  ]);
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  settings: AppSettings;
}

export async function exportBackup(): Promise<BackupData> {
  const [transactions, budgets, settings] = await Promise.all([
    getAllTransactions(),
    getAllBudgets(),
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    budgets,
    settings,
  };
}

export function validateBackupData(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<BackupData>;
  if (!Array.isArray(d.transactions) || !Array.isArray(d.budgets)) return false;
  return d.transactions.every(
    (t) =>
      t &&
      typeof t.id === 'string' &&
      (t.type === 'earning' || t.type === 'expense') &&
      typeof t.amount === 'number' &&
      Number.isFinite(t.amount) &&
      typeof t.date === 'string'
  );
}

/** Replaces all existing data with the imported backup. Caller must confirm first. */
export async function importBackupReplace(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['transactions', 'budgets', 'settings'], 'readwrite');
  await tx.objectStore('transactions').clear();
  await tx.objectStore('budgets').clear();
  for (const t of data.transactions) {
    await tx.objectStore('transactions').put(t);
  }
  for (const b of data.budgets) {
    await tx.objectStore('budgets').put(b);
  }
  if (data.settings) {
    await tx.objectStore('settings').put(data.settings);
  }
  await tx.done;
}

/** Merges imported transactions, skipping duplicates by id. Returns counts. */
export async function importBackupMerge(
  data: BackupData
): Promise<{ added: number; skipped: number }> {
  const db = await getDB();
  const existing = await db.getAll('transactions');
  const existingIds = new Set(existing.map((t) => t.id));
  let added = 0;
  let skipped = 0;
  const tx = db.transaction('transactions', 'readwrite');
  for (const t of data.transactions) {
    if (existingIds.has(t.id)) {
      skipped += 1;
      continue;
    }
    await tx.store.put(t);
    existingIds.add(t.id);
    added += 1;
  }
  await tx.done;

  const budgetTx = db.transaction('budgets', 'readwrite');
  for (const b of data.budgets) {
    const current = await budgetTx.store.get(b.month);
    if (!current) await budgetTx.store.put(b);
  }
  await budgetTx.done;

  return { added, skipped };
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const header = [
    'id',
    'type',
    'amount',
    'category',
    'sourceOrMerchant',
    'paymentMethod',
    'note',
    'date',
    'time',
    'createdAt',
    'updatedAt',
  ];
  const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
  const rows = transactions.map((t) =>
    [
      t.id,
      t.type,
      t.amount,
      t.category,
      t.sourceOrMerchant,
      t.paymentMethod,
      t.note,
      t.date,
      t.time,
      t.createdAt,
      t.updatedAt,
    ]
      .map((v) => escape(String(v)))
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
