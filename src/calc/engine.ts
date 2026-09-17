import type {
  Transaction,
  MonthlySummary,
  DailySummary,
  RecoveryStep,
  RecoveryPayment,
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
 *   Earnings and spending capacity are two SEPARATE pools, like a bank balance
 *   and a credit card. Earnings never automatically pay anything off.
 *
 *   - Safe-to-spend is purely "this month's budget minus what you've spent so
 *     far". Earning money never tops it back up.
 *   - If you spend beyond safe-to-spend, the overage becomes a RECOVERY
 *     obligation (like a credit-card balance you now owe).
 *   - Recovery is only ever paid down by an explicit, user-initiated
 *     RecoveryPayment (choosing "I'll pay back ₹X now" from their earnings
 *     balance) — never automatically when a new earning is logged.
 *   - Earnings accumulate in their own running balance (calculateEarningsBalance)
 *     that only goes down when the user spends it on a recovery payment.
 *
 * Four numbers are always kept separate and are NEVER mixed:
 *   - Actual Cash Flow / Actual Balance -> calculateNetCashFlow / actual balance
 *   - Monthly Spending Budget           -> user-configured, calculateBudgetRemaining
 *   - Recovery Amount                   -> calculateRecoveryRequired (budget-based, manually paid down)
 *   - Safe-to-Spend                     -> calculateSafeToSpend (budget-based only)
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

function sortPaymentsChronological(payments: RecoveryPayment[]): RecoveryPayment[] {
  return [...payments].sort((a, b) => {
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

export function sumRecoveryPayments(payments: RecoveryPayment[]): number {
  return round2(payments.reduce((sum, p) => sum + p.amount, 0));
}

/**
 * Safe-to-spend = this month's budget minus what's been spent, full stop.
 * Earnings never top this back up — that would let spending silently
 * self-forgive. Never negative.
 */
export function calculateSafeToSpend(budget: number, expenses: number): number {
  return round2(Math.max(0, budget - expenses));
}

/**
 * Recovery owed = spending beyond the budget, minus whatever the user has
 * manually paid back against it so far. Earnings play no part here.
 */
export function calculateRecoveryRequired(
  expenses: number,
  budget: number,
  recoveryPaid: number = 0
): number {
  const owed = Math.max(0, expenses - budget);
  return round2(Math.max(0, owed - Math.max(0, recoveryPaid)));
}

/** How much of the over-budget debt has actually been paid back (capped at what was owed). */
export function calculateRecoveryRecovered(
  expenses: number,
  budget: number,
  recoveryPaid: number = 0
): number {
  const owed = Math.max(0, expenses - budget);
  return round2(Math.min(owed, Math.max(0, recoveryPaid)));
}

/**
 * The user's own running earnings pool — every earning ever logged, minus
 * every recovery payment ever made out of it. This is the "bank balance" the
 * user draws from when they choose to pay down recovery debt; expenses never
 * touch it directly and it is never auto-applied to anything.
 */
export function calculateEarningsBalance(
  allTransactions: Transaction[],
  allRecoveryPayments: RecoveryPayment[]
): number {
  const earned = calculateMonthlyEarnings(allTransactions);
  const paidOut = sumRecoveryPayments(allRecoveryPayments);
  return round2(earned - paidOut);
}

/**
 * Walks a month's transactions AND recovery payments in chronological order,
 * producing the running recovery/safe-to-spend state after each event. This
 * is the basis for daily breakdowns and per-event "what just happened"
 * messaging. Earning transactions are included for display (day totals) but
 * never move recoveryRequired — only expenses (create debt) and recovery
 * payments (clear debt) do.
 */
export function calculateRecoveryTrace(
  monthTransactions: Transaction[],
  budget: number,
  recoveryPayments: RecoveryPayment[] = []
): RecoveryStep[] {
  type Ev =
    | { date: string; time: string; createdAt: number; kind: 'expense' | 'earning'; transaction: Transaction }
    | { date: string; time: string; createdAt: number; kind: 'recovery-payment'; payment: RecoveryPayment };

  const events: Ev[] = [
    ...sortChronological(monthTransactions).map((t) => ({
      date: t.date,
      time: t.time,
      createdAt: t.createdAt,
      kind: t.type,
      transaction: t,
    })) as Ev[],
    ...sortPaymentsChronological(recoveryPayments).map((p) => ({
      date: p.date,
      time: p.time,
      createdAt: p.createdAt,
      kind: 'recovery-payment' as const,
      payment: p,
    })),
  ].sort((a, b) => {
    const da = `${a.date}T${a.time || '00:00'}`;
    const db = `${b.date}T${b.time || '00:00'}`;
    if (da !== db) return da < db ? -1 : 1;
    return a.createdAt - b.createdAt;
  });

  let cumExpenses = 0;
  let cumRecoveryPaid = 0;
  let recoveryRequired = 0;
  const steps: RecoveryStep[] = [];

  for (const e of events) {
    const before = recoveryRequired;

    if (e.kind === 'expense') {
      cumExpenses = round2(cumExpenses + e.transaction.amount);
    } else if (e.kind === 'recovery-payment') {
      cumRecoveryPaid = round2(cumRecoveryPaid + e.payment.amount);
    }
    // 'earning' events don't affect recovery at all — they only add to the
    // separate earnings balance (see calculateEarningsBalance).

    recoveryRequired = calculateRecoveryRequired(cumExpenses, budget, cumRecoveryPaid);
    const safeToSpendAfter = calculateSafeToSpend(budget, cumExpenses);

    steps.push({
      kind: e.kind,
      transaction: e.kind === 'recovery-payment' ? undefined : e.transaction,
      payment: e.kind === 'recovery-payment' ? e.payment : undefined,
      date: e.date,
      time: e.time,
      recoveryRequiredBefore: before,
      recoveryRequiredAfter: recoveryRequired,
      recoveryChange: round2(before - recoveryRequired),
      safeToSpendAfter,
    });
  }

  return steps;
}

export function calculateDailySpending(
  monthTransactions: Transaction[],
  budget: number,
  recoveryPayments: RecoveryPayment[] = []
): DailySummary[] {
  const trace = calculateRecoveryTrace(monthTransactions, budget, recoveryPayments);
  const byDate = new Map<string, DailySummary>();

  for (const step of trace) {
    const date = step.date;
    let day = byDate.get(date);
    if (!day) {
      day = {
        date,
        earnings: 0,
        expenses: 0,
        net: 0,
        recoveryCreated: 0,
        recoveryRecovered: 0,
        transactions: [],
      };
      byDate.set(date, day);
    }

    if (step.kind === 'earning' && step.transaction) {
      day.earnings = round2(day.earnings + step.transaction.amount);
      day.transactions.push(step.transaction);
    } else if (step.kind === 'expense' && step.transaction) {
      day.expenses = round2(day.expenses + step.transaction.amount);
      const created = round2(Math.max(0, -step.recoveryChange));
      day.recoveryCreated = round2(day.recoveryCreated + created);
      day.transactions.push(step.transaction);
    } else if (step.kind === 'recovery-payment') {
      const recovered = round2(Math.max(0, step.recoveryChange));
      day.recoveryRecovered = round2(day.recoveryRecovered + recovered);
    }
    day.net = round2(day.earnings - day.expenses);
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function calculateMonthlySummary(
  monthTransactions: Transaction[],
  budget: number,
  month: string,
  recoveryPaidThisMonth: number = 0
): MonthlySummary {
  const totalEarnings = calculateMonthlyEarnings(monthTransactions);
  const totalExpenses = calculateMonthlyExpenses(monthTransactions);
  const netCashFlow = calculateNetCashFlow(totalEarnings, totalExpenses);
  const recoveryRequired = calculateRecoveryRequired(totalExpenses, budget, recoveryPaidThisMonth);
  const recoveryRecovered = calculateRecoveryRecovered(totalExpenses, budget, recoveryPaidThisMonth);
  const safeToSpend = calculateSafeToSpend(budget, totalExpenses);
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
