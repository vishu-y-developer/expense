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

/**
 * A manual, user-initiated payment against outstanding recovery debt. Recovery is NEVER
 * paid automatically from earnings — the user explicitly chooses to pay it down, like
 * paying off a credit card from a separate bank balance. See engine.ts's header comment.
 */
export interface RecoveryPayment {
  id: string;
  /** The month whose recovery debt this payment reduces, e.g. "2026-09" */
  month: string;
  amount: number;
  date: string;
  time: string;
  note: string;
  createdAt: number;
}

export interface AppSettings {
  id: 'settings';
  theme: 'light' | 'dark' | 'batman' | 'system';
  recentCategory: Partial<Record<TransactionType, string>>;
  recentPaymentMethod: string;
  customExpenseCategories: string[];
  customEarningCategories: string[];
}

export type RecoveryStepKind = 'expense' | 'earning' | 'recovery-payment';

export interface RecoveryStep {
  kind: RecoveryStepKind;
  /** Present for kind 'expense' | 'earning' */
  transaction?: Transaction;
  /** Present for kind 'recovery-payment' */
  payment?: RecoveryPayment;
  date: string;
  time: string;
  recoveryRequiredBefore: number;
  recoveryRequiredAfter: number;
  /** Positive = this step reduced recovery debt (a payment), negative = it created debt (an over-budget expense). */
  recoveryChange: number;
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
  /** How much of this month's over-budget spending is still unpaid. Never reduced by earnings automatically. */
  recoveryRequired: number;
  /** How much of this month's over-budget spending has been manually paid back so far. */
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
