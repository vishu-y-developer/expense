import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppSettings, Transaction } from '../types';
import { DEFAULT_SETTINGS } from '../db/db';
import {
  addTransaction,
  deleteTransaction,
  getAllTransactions,
  getAllBudgets,
  getSettings,
  saveSettings,
  setBudgetForMonth as dbSetBudgetForMonth,
  updateTransaction as dbUpdateTransaction,
  type NewTransactionInput,
} from '../db/repository';
import { currentMonthKey } from '../utils/date';

interface AppContextValue {
  loading: boolean;
  transactions: Transaction[];
  budgets: Record<string, number>;
  settings: AppSettings;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  getBudget: (month: string) => number;
  setBudget: (month: string, amount: number) => Promise<void>;
  createTransaction: (input: NewTransactionInput) => Promise<Transaction>;
  editTransaction: (id: string, input: NewTransactionInput) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  updateTheme: (theme: AppSettings['theme']) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey());

  const refreshAll = useCallback(async () => {
    const [txns, budgetRecords, s] = await Promise.all([
      getAllTransactions(),
      getAllBudgets(),
      getSettings(),
    ]);
    setTransactions(txns);
    const budgetMap: Record<string, number> = {};
    for (const b of budgetRecords) budgetMap[b.month] = b.amount;
    setBudgets(budgetMap);
    setSettings(s);
  }, []);

  useEffect(() => {
    refreshAll().finally(() => setLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (theme: AppSettings['theme']) => {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', theme);
      }
    };
    apply(settings.theme);
    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => apply('system');
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  const getBudget = useCallback((month: string) => budgets[month] ?? 0, [budgets]);

  const setBudget = useCallback(async (month: string, amount: number) => {
    await dbSetBudgetForMonth(month, amount);
    setBudgets((prev) => ({ ...prev, [month]: amount }));
  }, []);

  const createTransaction = useCallback(async (input: NewTransactionInput) => {
    const t = await addTransaction(input);
    await refreshAll();
    return t;
  }, [refreshAll]);

  const editTransaction = useCallback(async (id: string, input: NewTransactionInput) => {
    const t = await dbUpdateTransaction(id, input);
    await refreshAll();
    return t;
  }, [refreshAll]);

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id);
    await refreshAll();
  }, [refreshAll]);

  const updateTheme = useCallback(async (theme: AppSettings['theme']) => {
    const next = { ...settings, theme };
    setSettings(next);
    await saveSettings(next);
  }, [settings]);

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      transactions,
      budgets,
      settings,
      selectedMonth,
      setSelectedMonth,
      getBudget,
      setBudget,
      createTransaction,
      editTransaction,
      removeTransaction,
      updateTheme,
      refreshAll,
    }),
    [
      loading,
      transactions,
      budgets,
      settings,
      selectedMonth,
      getBudget,
      setBudget,
      createTransaction,
      editTransaction,
      removeTransaction,
      updateTheme,
      refreshAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
