import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  calculateMonthlySummary,
  calculateDailySpending,
  calculateActualBalance,
  calculateEarningsBalance,
  sumRecoveryPayments,
  sortChronological,
} from '../calc/engine';
import { monthKeyOfDate, todayISO } from '../utils/date';

export function useMonthData(monthKey: string) {
  const { transactions, getBudget, recoveryPayments } = useApp();

  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKeyOfDate(t.date) === monthKey),
    [transactions, monthKey]
  );

  const monthRecoveryPayments = useMemo(
    () => recoveryPayments.filter((p) => p.month === monthKey),
    [recoveryPayments, monthKey]
  );

  const budget = getBudget(monthKey);

  const recoveryPaidThisMonth = useMemo(
    () => sumRecoveryPayments(monthRecoveryPayments),
    [monthRecoveryPayments]
  );

  const summary = useMemo(
    () => calculateMonthlySummary(monthTransactions, budget, monthKey, recoveryPaidThisMonth),
    [monthTransactions, budget, monthKey, recoveryPaidThisMonth]
  );

  const daily = useMemo(
    () => calculateDailySpending(monthTransactions, budget, monthRecoveryPayments),
    [monthTransactions, budget, monthRecoveryPayments]
  );

  const actualBalance = useMemo(() => calculateActualBalance(transactions), [transactions]);

  /** All-time earnings pool available to pay down recovery debt (never auto-applied). */
  const earningsBalance = useMemo(
    () => calculateEarningsBalance(transactions, recoveryPayments),
    [transactions, recoveryPayments]
  );

  const today = todayISO();
  const todaySummary = useMemo(
    () => daily.find((d) => d.date === today),
    [daily, today]
  );

  const recentTransactions = useMemo(
    () => sortChronological(monthTransactions).reverse(),
    [monthTransactions]
  );

  return {
    monthTransactions,
    monthRecoveryPayments,
    budget,
    summary,
    daily,
    actualBalance,
    earningsBalance,
    todaySummary,
    recentTransactions,
  };
}
