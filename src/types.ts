export type TransactionType = 'earning' | 'expense';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Education',
  'Health',
  'Entertainment',
  'Subscriptions',
  'Personal',
  'Other',
] as const;

export const EARNING_CATEGORIES = [
  'Salary',
  'Freelancing',
  'Business',
  'Pocket Money',
  'Gift',
  'Refund',
  'Other',
] as const;

export const PAYMENT_METHODS = [
  'UPI',
  'Cash',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Other',
] as const;

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  /** Source (for earnings) or Merchant/Place (for expenses) */
  sourceOrMerchant: string;
  paymentMethod: string;
  note: string;
  /** ISO date, e.g. 2026-09-17 */
  date: string;
  /** HH:mm 24h */
  time: string;
  createdAt: number;
  updatedAt: number;
}

export interface MonthlyBudget {
  /** e.g. "2026-09" */
  month: string;
  amount: number;
}

export interface AppSettings {
  id: 'settings';
  theme: 'light' | 'dark' | 'system';
  recentCategory: Partial<Record<TransactionType, string>>;
  recentPaymentMethod: string;
  customExpenseCategories: string[];
  customEarningCategories: string[];
}

export interface RecoveryStep {
  transaction: Transaction;
  recoveryRequiredBefore: number;
  recoveryRequiredAfter: number;
  recoveredByThisTxn: number;
  remainderAfterRecovery: number;
  safeToSpendAfter: number;
}

export interface MonthlySummary {
  month: string;
  budget: number;
  totalEarnings: number;
  totalExpenses: number;
  netCashFlow: number;
  budgetUsed: number;
  budgetRemaining: number;
  budgetUsedPercent: number;
  recoveryRequired: number;
  recoveryRecovered: number;
  safeToSpend: number;
  averageDailySpending: number;
  averageDailyEarnings: number;
  earningCount: number;
  expenseCount: number;
}

export interface DailySummary {
  date: string;
  earnings: number;
  expenses: number;
  net: number;
  recoveryCreated: number;
  recoveryRecovered: number;
  transactions: Transaction[];
}
