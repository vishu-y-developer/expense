import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  calculateMonthlySummary,
  calculateDailySpending,
  calculateActualBalance,
  sortChronological,
} from '../calc/engine';
import { monthKeyOfDate, todayISO } from '../utils/date';

export function useMonthData(monthKey: string) {
  const { transactions, getBudget } = useApp();

  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKeyOfDate(t.date) === monthKey),
    [transactions, monthKey]
  );

  const budget = getBudget(monthKey);

  const summary = useMemo(
    () => calculateMonthlySummary(monthTransactions, budget, monthKey),
    [monthTransactions, budget, monthKey]
  );

  const daily = useMemo(
    () => calculateDailySpending(monthTransactions, budget),
    [monthTransactions, budget]
  );

  const actualBalance = useMemo(() => calculateActualBalance(transactions), [transactions]);

  const today = todayISO();
  const todaySummary = useMemo(
    () => daily.find((d) => d.date === today),
    [daily, today]
  );

  const recentTransactions = useMemo(
    () => sortChronological(monthTransactions).reverse(),
    [monthTransactions]
  );

  return { monthTransactions, budget, summary, daily, actualBalance, todaySummary, recentTransactions };
}
