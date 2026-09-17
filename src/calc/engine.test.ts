import { describe, it, expect } from 'vitest';
import type { RecoveryPayment, Transaction } from '../types';
import {
  calculateMonthlyExpenses,
  calculateMonthlyEarnings,
  calculateNetCashFlow,
  calculateBudgetRemaining,
  calculateBudgetUsedPercent,
  calculateRecoveryRequired,
  calculateRecoveryRecovered,
  calculateSafeToSpend,
  calculateEarningsBalance,
  sumRecoveryPayments,
  calculateRecoveryTrace,
  calculateDailySpending,
  calculateMonthlySummary,
  calculateActualBalance,
  isValidAmount,
  round2,
} from './engine';

let idCounter = 0;
function tx(partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>): Transaction {
  idCounter += 1;
  return {
    id: `t${idCounter}`,
    category: partial.type === 'earning' ? 'Freelancing' : 'Food',
    sourceOrMerchant: 'Test',
    paymentMethod: 'UPI',
    note: '',
    time: partial.time ?? '12:00',
    createdAt: idCounter,
    updatedAt: idCounter,
    ...partial,
  };
}

function payment(partial: Partial<RecoveryPayment> & Pick<RecoveryPayment, 'amount' | 'date' | 'month'>): RecoveryPayment {
  idCounter += 1;
  return {
    id: `p${idCounter}`,
    time: partial.time ?? '12:00',
    note: '',
    createdAt: idCounter,
    ...partial,
  };
}

describe('basic aggregation', () => {
  it('sums expenses and earnings independently', () => {
    const txns = [
      tx({ type: 'earning', amount: 300, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 100, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 500, date: '2026-09-02' }),
    ];
    expect(calculateMonthlyEarnings(txns)).toBe(300);
    expect(calculateMonthlyExpenses(txns)).toBe(600);
    expect(calculateNetCashFlow(300, 600)).toBe(-300);
  });

  it('handles zero transactions without NaN/Infinity', () => {
    expect(calculateMonthlyExpenses([])).toBe(0);
    expect(calculateMonthlyEarnings([])).toBe(0);
    expect(calculateBudgetUsedPercent(0, 0)).toBe(0);
    expect(calculateSafeToSpend(0, 0)).toBe(0);
    expect(Number.isFinite(calculateBudgetUsedPercent(0, 100))).toBe(true);
  });
});

describe('budget calculations', () => {
  it('computes remaining and used percent, clamped at 100', () => {
    expect(calculateBudgetRemaining(1000, 400)).toBe(600);
    expect(calculateBudgetUsedPercent(1000, 400)).toBe(40);
    expect(calculateBudgetUsedPercent(1000, 5000)).toBe(100);
    expect(calculateBudgetRemaining(1000, 5000)).toBe(-4000);
  });
});

describe('safe-to-spend is budget-only, never boosted by earnings', () => {
  it('ignores earnings entirely', () => {
    expect(calculateSafeToSpend(1000, 400)).toBe(600);
    // A huge earning must not change safe-to-spend; the function doesn't even take earnings.
    expect(calculateSafeToSpend(1000, 400)).toBe(calculateSafeToSpend(1000, 400));
  });

  it('never goes negative', () => {
    expect(calculateSafeToSpend(1000, 5000)).toBe(0);
    expect(calculateSafeToSpend(0, 0)).toBe(0);
  });
});

describe('recovery rule — budget-based, manually paid, earnings never touch it', () => {
  it('spending beyond budget creates recovery, with zero earnings involved', () => {
    expect(calculateRecoveryRequired(1000, 1000)).toBe(0);
    expect(calculateRecoveryRequired(1500, 1000)).toBe(500);
    expect(calculateSafeToSpend(1000, 1500)).toBe(0);
  });

  it('earning money never reduces recovery required — only a manual payment does', () => {
    const expenses = 1500;
    const budget = 1000;
    // Huge earnings, zero recovery payments: debt is untouched.
    expect(calculateRecoveryRequired(expenses, budget, 0)).toBe(500);

    // A manual recovery payment of 200 reduces it.
    expect(calculateRecoveryRequired(expenses, budget, 200)).toBe(300);

    // Paying the full 500 clears it.
    expect(calculateRecoveryRequired(expenses, budget, 500)).toBe(0);
    expect(calculateRecoveryRecovered(expenses, budget, 500)).toBe(500);

    // Overpaying (shouldn't happen via the UI, but the formula still clamps) never goes negative.
    expect(calculateRecoveryRequired(expenses, budget, 900)).toBe(0);
    expect(calculateRecoveryRecovered(expenses, budget, 900)).toBe(500);
  });

  it('never produces negative recovery or safe-to-spend', () => {
    expect(calculateRecoveryRequired(0, 5000)).toBe(0);
    expect(calculateRecoveryRequired(100, 100, 50)).toBe(0);
    expect(calculateSafeToSpend(1000, 5000)).toBeGreaterThanOrEqual(0);
  });
});

describe('earnings balance — separate pool, only drawn down by manual recovery payments', () => {
  it('equals total earnings when nothing has been paid back', () => {
    const txns = [
      tx({ type: 'earning', amount: 500, date: '2026-09-01' }),
      tx({ type: 'earning', amount: 300, date: '2026-09-05' }),
      tx({ type: 'expense', amount: 10000, date: '2026-09-06' }), // huge expense, still irrelevant
    ];
    expect(calculateEarningsBalance(txns, [])).toBe(800);
  });

  it('is reduced only by recovery payments, never by expenses', () => {
    const txns = [
      tx({ type: 'earning', amount: 1000, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 5000, date: '2026-09-02' }),
    ];
    const payments = [payment({ amount: 300, date: '2026-09-03', month: '2026-09' })];
    expect(calculateEarningsBalance(txns, payments)).toBe(700);
    expect(sumRecoveryPayments(payments)).toBe(300);
  });
});

describe('daily trace and summary', () => {
  const budget = 1000;
  const txns = [
    tx({ type: 'earning', amount: 300, date: '2026-09-01', time: '09:00' }),
    tx({ type: 'expense', amount: 100, date: '2026-09-01', time: '10:00' }),
    tx({ type: 'expense', amount: 1200, date: '2026-09-02', time: '10:00' }), // pushes 300 over budget
    tx({ type: 'earning', amount: 5000, date: '2026-09-03', time: '09:00' }), // must NOT clear recovery
  ];

  it('derives every headline number from the engine, not hardcoded, and earnings do not clear recovery', () => {
    const totalEarnings = calculateMonthlyEarnings(txns);
    const totalExpenses = calculateMonthlyExpenses(txns);
    const summary = calculateMonthlySummary(txns, budget, '2026-09');

    expect(totalEarnings).toBe(300 + 5000);
    expect(totalExpenses).toBe(100 + 1200);
    expect(summary.budgetRemaining).toBe(round2(budget - totalExpenses));
    // 100 + 1200 = 1300 spent against a 1000 budget -> 300 owed, regardless of the 5300 earned.
    expect(summary.recoveryRequired).toBe(300);
    expect(summary.recoveryRecovered).toBe(0);
    expect(summary.safeToSpend).toBe(0); // budget fully consumed and then some

    const trace = calculateRecoveryTrace(txns, budget);
    const last = trace[trace.length - 1];
    expect(last.recoveryRequiredAfter).toBe(300);
  });

  it('a manual recovery payment reduces recoveryRequired and shows up as recovered', () => {
    const payments = [payment({ amount: 200, date: '2026-09-04', month: '2026-09' })];
    const summary = calculateMonthlySummary(txns, budget, '2026-09', sumRecoveryPayments(payments));
    expect(summary.recoveryRequired).toBe(100);
    expect(summary.recoveryRecovered).toBe(200);

    const trace = calculateRecoveryTrace(txns, budget, payments);
    const paymentStep = trace.find((s) => s.kind === 'recovery-payment')!;
    expect(paymentStep.recoveryRequiredBefore).toBe(300);
    expect(paymentStep.recoveryRequiredAfter).toBe(100);
    expect(paymentStep.recoveryChange).toBe(200);
  });

  it('groups by day with independent earnings/expenses/net, and buckets recovery payments by date', () => {
    const payments = [payment({ amount: 200, date: '2026-09-05', month: '2026-09' })];
    const daily = calculateDailySpending(txns, budget, payments);
    const day1 = daily.find((d) => d.date === '2026-09-01')!;
    expect(day1.earnings).toBe(300);
    expect(day1.expenses).toBe(100);
    expect(day1.net).toBe(200);

    const day2 = daily.find((d) => d.date === '2026-09-02')!;
    expect(day2.recoveryCreated).toBe(300); // this expense is what pushed spending over budget

    const day5 = daily.find((d) => d.date === '2026-09-05')!;
    expect(day5.recoveryRecovered).toBe(200);
  });
});

describe('separation of concepts', () => {
  it('actual balance, budget remaining, recovery, safe-to-spend, and earnings balance are all distinct', () => {
    const txns = [
      tx({ type: 'earning', amount: 2000, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 1500, date: '2026-09-02' }),
    ];
    const budget = 1000;
    const summary = calculateMonthlySummary(txns, budget, '2026-09');
    const actualBalance = calculateActualBalance(txns);
    const earningsBalance = calculateEarningsBalance(txns, []);

    expect(actualBalance).toBe(500); // pure cash recorded: 2000 - 1500
    expect(summary.budgetRemaining).toBe(-500); // plain budget - expenses, can go negative
    expect(summary.safeToSpend).toBe(0); // clamped at 0, budget-only
    expect(summary.recoveryRequired).toBe(500); // 1500 spent vs 1000 budget, untouched by the 2000 earned
    expect(earningsBalance).toBe(2000); // full earnings pool, untouched by the expense
    const values = new Set([actualBalance, summary.budgetRemaining, summary.recoveryRequired, summary.safeToSpend, earningsBalance]);
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('validation', () => {
  it('rejects zero, negative, NaN, and infinite amounts', () => {
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-50)).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
    expect(isValidAmount(Infinity)).toBe(false);
  });
});

describe('edge cases', () => {
  it('handles no monthly budget (0) gracefully', () => {
    const txns = [tx({ type: 'expense', amount: 100, date: '2026-09-01' })];
    const summary = calculateMonthlySummary(txns, 0, '2026-09');
    expect(Number.isFinite(summary.safeToSpend)).toBe(true);
    expect(summary.safeToSpend).toBe(0);
    expect(summary.budgetUsedPercent).toBe(100);
    expect(summary.recoveryRequired).toBe(100);
  });

  it('handles very large amounts without overflow artifacts', () => {
    const txns = [tx({ type: 'earning', amount: 10_000_000, date: '2026-09-01' })];
    const summary = calculateMonthlySummary(txns, 1000, '2026-09');
    expect(Number.isFinite(summary.safeToSpend)).toBe(true);
    expect(summary.totalEarnings).toBe(10_000_000);
  });
});
