import { describe, it, expect } from 'vitest';
import type { Transaction } from '../types';
import {
  calculateMonthlyExpenses,
  calculateMonthlyEarnings,
  calculateNetCashFlow,
  calculateBudgetRemaining,
  calculateBudgetUsedPercent,
  calculateRecoveryRequired,
  calculateRecoveryRecovered,
  calculateRecoveryFromEarning,
  calculateSafeToSpend,
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

describe('recovery rule', () => {
  it('spending the full capacity creates full recovery requirement, not remaining budget', () => {
    const required = calculateRecoveryRequired(1000, 0);
    expect(required).toBe(1000);
    expect(calculateSafeToSpend(1000, -1000)).toBe(0);
  });

  it('matches the documented recovery ledger example', () => {
    // Starting capacity 1000, spend 700
    let cumExpenses = 700;
    let cumEarnings = 0;
    expect(calculateRecoveryRequired(cumExpenses, cumEarnings)).toBe(700);

    // Earn 500 -> recovery required drops to 200
    let alloc = calculateRecoveryFromEarning(700, 500);
    expect(alloc.recovered).toBe(500);
    expect(alloc.remainder).toBe(0);
    expect(alloc.recoveryRequiredAfter).toBe(200);
    cumEarnings += 500;
    expect(calculateRecoveryRequired(cumExpenses, cumEarnings)).toBe(200);

    // Earn 300 more -> recovery complete, 100 free remainder
    alloc = calculateRecoveryFromEarning(200, 300);
    expect(alloc.recovered).toBe(200);
    expect(alloc.remainder).toBe(100);
    expect(alloc.recoveryRequiredAfter).toBe(0);
    cumEarnings += 300;
    expect(calculateRecoveryRequired(cumExpenses, cumEarnings)).toBe(0);
    expect(calculateRecoveryRecovered(cumExpenses, cumEarnings)).toBe(700);
  });

  it('allocates earnings deterministically regardless of split', () => {
    // Whether one earning of 1000 or two of 500 arrive, total recovered must match.
    const a = calculateRecoveryFromEarning(700, 1000);
    expect(a.recovered).toBe(700);
    expect(a.remainder).toBe(300);

    let debt = 700;
    let recoveredTotal = 0;
    let r = calculateRecoveryFromEarning(debt, 500);
    debt = r.recoveryRequiredAfter;
    recoveredTotal += r.recovered;
    r = calculateRecoveryFromEarning(debt, 500);
    debt = r.recoveryRequiredAfter;
    recoveredTotal += r.recovered;
    expect(recoveredTotal).toBe(700);
    expect(debt).toBe(0);
  });

  it('never produces negative recovery or safe-to-spend', () => {
    expect(calculateRecoveryRequired(0, 5000)).toBe(0);
    expect(calculateSafeToSpend(1000, 5000)).toBeGreaterThanOrEqual(0);
    expect(calculateRecoveryFromEarning(0, 500).recoveryRequiredAfter).toBe(0);
  });
});

describe('section 9 exact scenario', () => {
  const budget = 1000;
  const txns = [
    tx({ type: 'earning', amount: 300, date: '2026-09-01', time: '09:00' }),
    tx({ type: 'expense', amount: 100, date: '2026-09-01', time: '10:00' }),
    tx({ type: 'expense', amount: 500, date: '2026-09-02', time: '10:00' }),
    tx({ type: 'earning', amount: 200, date: '2026-09-03', time: '09:00' }),
    tx({ type: 'earning', amount: 600, date: '2026-09-04', time: '09:00' }),
    tx({ type: 'expense', amount: 100, date: '2026-09-04', time: '10:00' }),
  ];

  it('derives every headline number from the engine, not hardcoded', () => {
    const totalEarnings = calculateMonthlyEarnings(txns);
    const totalExpenses = calculateMonthlyExpenses(txns);
    const netCashFlow = calculateNetCashFlow(totalEarnings, totalExpenses);
    const summary = calculateMonthlySummary(txns, budget, '2026-09');

    expect(totalEarnings).toBe(300 + 200 + 600);
    expect(totalExpenses).toBe(100 + 500 + 100);
    expect(netCashFlow).toBe(totalEarnings - totalExpenses);
    expect(summary.budgetUsed).toBe(totalExpenses);
    expect(summary.budgetRemaining).toBe(round2(budget - totalExpenses));
    expect(summary.recoveryRequired).toBe(round2(Math.max(0, totalExpenses - totalEarnings)));
    expect(summary.recoveryRecovered).toBe(round2(Math.min(totalExpenses, totalEarnings)));
    expect(summary.safeToSpend).toBe(round2(Math.max(0, budget + netCashFlow)));

    // Sanity: trace's final running state agrees with the aggregate summary.
    const trace = calculateRecoveryTrace(txns, budget);
    const last = trace[trace.length - 1];
    expect(last.recoveryRequiredAfter).toBe(summary.recoveryRequired);
    expect(last.safeToSpendAfter).toBe(summary.safeToSpend);
  });

  it('walks the day-by-day trajectory deterministically', () => {
    const trace = calculateRecoveryTrace(txns, budget);
    // Day 1: earn 300 (no debt yet) then spend 100 -> no recovery created (within capacity)
    expect(trace[0].recoveryRequiredAfter).toBe(0);
    expect(trace[1].recoveryRequiredAfter).toBe(0);
    // Day 2: spend 500 more -> cumulative expenses 600 vs earnings 300 -> 300 owed
    expect(trace[2].recoveryRequiredAfter).toBe(300);
  });

  it('groups by day with independent earnings/expenses/net', () => {
    const daily = calculateDailySpending(txns, budget);
    const day1 = daily.find((d) => d.date === '2026-09-01')!;
    expect(day1.earnings).toBe(300);
    expect(day1.expenses).toBe(100);
    expect(day1.net).toBe(200);
  });
});

describe('separation of concepts (section 7)', () => {
  it('actual balance, budget remaining, recovery, and safe-to-spend never collapse into one formula', () => {
    const txns = [
      tx({ type: 'earning', amount: 2000, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 500, date: '2026-09-02' }),
    ];
    const budget = 1000;
    const summary = calculateMonthlySummary(txns, budget, '2026-09');
    const actualBalance = calculateActualBalance(txns);

    expect(actualBalance).toBe(1500); // pure cash recorded
    expect(summary.budgetRemaining).toBe(500); // plain budget - expenses
    expect(summary.recoveryRequired).toBe(0); // earnings covered the expense
    expect(summary.safeToSpend).toBe(2500); // budget + net cash flow
    // All four are distinct numbers for the same data set.
    const values = new Set([actualBalance, summary.budgetRemaining, summary.recoveryRequired, summary.safeToSpend]);
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
  });

  it('handles very large amounts without overflow artifacts', () => {
    const txns = [tx({ type: 'earning', amount: 10_000_000, date: '2026-09-01' })];
    const summary = calculateMonthlySummary(txns, 1000, '2026-09');
    expect(Number.isFinite(summary.safeToSpend)).toBe(true);
    expect(summary.totalEarnings).toBe(10_000_000);
  });
});
