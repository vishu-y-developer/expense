import type {
  Transaction,
  MonthlySummary,
  DailySummary,
  RecoveryStep,
} from '../types';

/**
 * ============================================================================
 * MONEY & RECOVERY CALCULATION ENGINE
 * ============================================================================
 *
 * This module is the single source of truth for every financial number shown
 * in the app. It is pure (no React, no IndexedDB) so it can be unit tested in
 * isolation.
 *
 * THE RECOVERY RULE (configurable, isolated here so it is never re-implemented
 * ad-hoc elsewhere):
 *
 *   Every expense consumes "safe-to-spend" capacity. If an expense is paid
 *   for out of capacity that hasn't been earned yet, the shortfall becomes a
 *   RECOVERY obligation. Future earnings pay down outstanding recovery first
 *   (oldest debt first / FIFO), and only the leftover after recovery adds
 *   back to safe-to-spend.
 *
 * Four numbers are always kept separate and are NEVER mixed:
 *   - Actual Cash Flow / Actual Balance -> calculateNetCashFlow / actual balance
 *   - Monthly Spending Budget           -> user-configured, calculateBudgetRemaining
 *   - Recovery Amount                   -> calculateRecoveryRequired
 *   - Safe-to-Spend                     -> calculateSafeToSpend
 */

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function monthKeyOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function sortChronological(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const da = `${a.date}T${a.time || '00:00'}`;
    const db = `${b.date}T${b.time || '00:00'}`;
    if (da !== db) return da < db ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

export function calculateMonthlyExpenses(transactions: Transaction[]): number {
  return round2(
    transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

export function calculateMonthlyEarnings(transactions: Transaction[]): number {
  return round2(
    transactions
      .filter((t) => t.type === 'earning')
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

export function calculateNetCashFlow(earnings: number, expenses: number): number {
  return round2(earnings - expenses);
}

export function calculateBudgetRemaining(budget: number, expenses: number): number {
  return round2(budget - expenses);
}

export function calculateBudgetUsedPercent(budget: number, expenses: number): number {
  if (budget <= 0) return expenses > 0 ? 100 : 0;
  return round2(Math.min(100, Math.max(0, (expenses / budget) * 100)));
}

/**
 * Total recovery still owed to future earnings, given cumulative totals.
 * Order-independent: only the running totals matter at any snapshot in time.
 */
export function calculateRecoveryRequired(
  cumulativeExpenses: number,
  cumulativeEarnings: number
): number {
  return round2(Math.max(0, cumulativeExpenses - cumulativeEarnings));
}

export function calculateRecoveryRecovered(
  cumulativeExpenses: number,
  cumulativeEarnings: number
): number {
  return round2(Math.min(cumulativeExpenses, cumulativeEarnings));
}

/**
 * Deterministic allocation of a single incoming earning against an existing
 * recovery debt. Recovery is paid first (FIFO), any leftover is free.
 */
export function calculateRecoveryFromEarning(
  recoveryRequiredBefore: number,
  earningAmount: number
): { recovered: number; remainder: number; recoveryRequiredAfter: number } {
  const safeDebt = Math.max(0, recoveryRequiredBefore);
  const safeEarning = Math.max(0, earningAmount);
  const recovered = round2(Math.min(safeDebt, safeEarning));
  const remainder = round2(safeEarning - recovered);
  const recoveryRequiredAfter = round2(safeDebt - recovered);
  return { recovered, remainder, recoveryRequiredAfter };
}

/**
 * Safe-to-spend = the monthly budget, reduced by outstanding recovery debt,
 * increased by earnings beyond what recovery needed.
 * Equivalent closed form: max(0, budget + netCashFlow).
 */
export function calculateSafeToSpend(budget: number, netCashFlow: number): number {
  return round2(Math.max(0, budget + netCashFlow));
}

/**
 * Walks a month's transactions in chronological order, producing the running
 * recovery/safe-to-spend state after each transaction. This is the basis for
 * daily breakdowns and per-transaction "what just happened" messaging.
 */
export function calculateRecoveryTrace(
  monthTransactions: Transaction[],
  budget: number
): RecoveryStep[] {
  const ordered = sortChronological(monthTransactions);
  let cumExpenses = 0;
  let cumEarnings = 0;
  let recoveryRequired = 0;
  const steps: RecoveryStep[] = [];

  for (const t of ordered) {
    const recoveryRequiredBefore = recoveryRequired;
    let recoveredByThisTxn = 0;
    let remainderAfterRecovery = 0;

    if (t.type === 'expense') {
      cumExpenses = round2(cumExpenses + t.amount);
      recoveryRequired = calculateRecoveryRequired(cumExpenses, cumEarnings);
    } else {
      cumEarnings = round2(cumEarnings + t.amount);
      const alloc = calculateRecoveryFromEarning(recoveryRequiredBefore, t.amount);
      recoveredByThisTxn = alloc.recovered;
      remainderAfterRecovery = alloc.remainder;
      recoveryRequired = calculateRecoveryRequired(cumExpenses, cumEarnings);
    }

    const netCashFlow = calculateNetCashFlow(cumEarnings, cumExpenses);
    const safeToSpendAfter = calculateSafeToSpend(budget, netCashFlow);

    steps.push({
      transaction: t,
      recoveryRequiredBefore,
      recoveryRequiredAfter: recoveryRequired,
      recoveredByThisTxn,
      remainderAfterRecovery,
      safeToSpendAfter,
    });
  }

  return steps;
}

export function calculateDailySpending(
  monthTransactions: Transaction[],
  budget: number
): DailySummary[] {
  const trace = calculateRecoveryTrace(monthTransactions, budget);
  const byDate = new Map<string, DailySummary>();

  for (const step of trace) {
    const t = step.transaction;
    let day = byDate.get(t.date);
    if (!day) {
      day = {
        date: t.date,
        earnings: 0,
        expenses: 0,
        net: 0,
        recoveryCreated: 0,
        recoveryRecovered: 0,
        transactions: [],
      };
      byDate.set(t.date, day);
    }
    if (t.type === 'earning') {
      day.earnings = round2(day.earnings + t.amount);
      day.recoveryRecovered = round2(day.recoveryRecovered + step.recoveredByThisTxn);
    } else {
      day.expenses = round2(day.expenses + t.amount);
      const created = round2(
        Math.max(0, step.recoveryRequiredAfter - step.recoveryRequiredBefore)
      );
      day.recoveryCreated = round2(day.recoveryCreated + created);
    }
    day.net = round2(day.earnings - day.expenses);
    day.transactions.push(t);
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function calculateMonthlySummary(
  monthTransactions: Transaction[],
  budget: number,
  month: string
): MonthlySummary {
  const totalEarnings = calculateMonthlyEarnings(monthTransactions);
  const totalExpenses = calculateMonthlyExpenses(monthTransactions);
  const netCashFlow = calculateNetCashFlow(totalEarnings, totalExpenses);
  const recoveryRequired = calculateRecoveryRequired(totalExpenses, totalEarnings);
  const recoveryRecovered = calculateRecoveryRecovered(totalExpenses, totalEarnings);
  const safeToSpend = calculateSafeToSpend(budget, netCashFlow);
  const budgetRemaining = calculateBudgetRemaining(budget, totalExpenses);
  const budgetUsedPercent = calculateBudgetUsedPercent(budget, totalExpenses);

  const daysWithData = new Set(monthTransactions.map((t) => t.date)).size || 1;

  return {
    month,
    budget,
    totalEarnings,
    totalExpenses,
    netCashFlow,
    budgetUsed: totalExpenses,
    budgetRemaining,
    budgetUsedPercent,
    recoveryRequired,
    recoveryRecovered,
    safeToSpend,
    averageDailySpending: round2(totalExpenses / daysWithData),
    averageDailyEarnings: round2(totalEarnings / daysWithData),
    earningCount: monthTransactions.filter((t) => t.type === 'earning').length,
    expenseCount: monthTransactions.filter((t) => t.type === 'expense').length,
  };
}

/** All-time recorded balance: total earnings ever minus total expenses ever. */
export function calculateActualBalance(allTransactions: Transaction[]): number {
  const earnings = calculateMonthlyEarnings(allTransactions);
  const expenses = calculateMonthlyExpenses(allTransactions);
  return round2(earnings - expenses);
}

export function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}
