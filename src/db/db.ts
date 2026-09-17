import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppSettings, MonthlyBudget, Transaction } from '../types';

interface MoneyDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-date': string; 'by-type': string };
  };
  budgets: {
    key: string;
    value: MonthlyBudget;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'money-tracker-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MoneyDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MoneyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MoneyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('by-date', 'date');
          store.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'month' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  theme: 'dark',
  recentCategory: {},
  recentPaymentMethod: 'UPI',
  customExpenseCategories: [],
  customEarningCategories: [],
};
