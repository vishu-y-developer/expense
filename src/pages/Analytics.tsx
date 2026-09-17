import { useMemo, useState } from 'react';
import { useMonthData } from '../hooks/useMonthData';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { formatCurrency } from '../utils/format';
import { currentMonthKey } from '../utils/date';
import { Icon, categoryIcon, paymentIcon, type IconName } from '../components/Icon';
import type { Transaction, TransactionType } from '../types';

function groupSum(transactions: Transaction[], key: (t: Transaction) => string) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    map.set(key(t), (map.get(key(t)) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

function BreakdownList({
  items,
  total,
  color,
  icon,
}: {
  items: { label: string; amount: number }[];
  total: number;
  color: string;
  icon: (label: string) => IconName;
}) {
  if (items.length === 0) return <div className="empty-state">No data yet.</div>;
  return (
    <div className="stack">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
        return (
          <div key={item.label} className="bar-row">
            <div className="row">
              <span style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={icon(item.label)} size={15} style={{ color, opacity: 0.85 }} />
                {item.label}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{formatCurrency(item.amount)}</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Analytics() {
  const [month, setMonth] = useState(currentMonthKey());
  const { monthTransactions, summary, daily } = useMonthData(month);

  const expenses = useMemo(() => monthTransactions.filter((t) => t.type === 'expense'), [monthTransactions]);
  const earnings = useMemo(() => monthTransactions.filter((t) => t.type === 'earning'), [monthTransactions]);

  const byCategory = useMemo(() => groupSum(expenses, (t) => t.category), [expenses]);
  const bySource = useMemo(() => groupSum(earnings, (t) => t.category), [earnings]);
  const byPayment = useMemo(
    () => groupSum(monthTransactions, (t) => t.paymentMethod),
    [monthTransactions]
  );

  const maxDailySpend = Math.max(1, ...daily.map((d) => d.expenses));
  const chronoDaily = [...daily].reverse();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
      </div>

      <div className="card">
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      <div className="card stack elevate-2">
        <span className="section-title">Money Flow</span>
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="label">Earnings</span>
            <AnimatedNumber value={summary.totalEarnings} className="stat-value" style={{ color: 'var(--positive)' }} />
          </div>
          <div className="stat-tile">
            <span className="label">Expenses</span>
            <AnimatedNumber value={summary.totalExpenses} className="stat-value" style={{ color: 'var(--negative)' }} />
          </div>
          <div className="stat-tile">
            <span className="label">Net cash flow</span>
            <AnimatedNumber value={summary.netCashFlow} signed className="stat-value" />
          </div>
          <div className="stat-tile">
            <span className="label">Safe to spend</span>
            <AnimatedNumber value={summary.safeToSpend} className="stat-value" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-tile">
            <span className="label">Avg daily spending</span>
            <span className="stat-value">{formatCurrency(summary.averageDailySpending)}</span>
          </div>
          <div className="stat-tile">
            <span className="label">Avg daily earnings</span>
            <span className="stat-value">{formatCurrency(summary.averageDailyEarnings)}</span>
          </div>
        </div>
      </div>

      <div className="card stack elevate-2">
        <span className="section-title">Daily Spending</span>
        {daily.length === 0 ? (
          <div className="empty-state">No spending recorded this month.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110, padding: '6px 2px 0' }}>
            {chronoDaily.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${formatCurrency(d.expenses)}`}
                style={{
                  flex: 1,
                  background: d.expenses > 0 ? 'linear-gradient(180deg, var(--accent-2), var(--accent))' : 'var(--track)',
                  opacity: d.expenses > 0 ? 0.95 : 0.5,
                  borderRadius: 4,
                  height: `${Math.max(4, (d.expenses / maxDailySpend) * 100)}%`,
                  boxShadow: d.expenses > 0 ? '0 0 12px -2px var(--accent-glow)' : 'none',
                  transition: 'height 500ms var(--ease-out)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card stack elevate-2">
        <span className="section-title">Expense Categories</span>
        <BreakdownList
          items={byCategory}
          total={summary.totalExpenses}
          color="var(--negative)"
          icon={(label) => categoryIcon('expense', label)}
        />
      </div>

      <div className="card stack elevate-2">
        <span className="section-title">Earning Sources</span>
        <BreakdownList
          items={bySource}
          total={summary.totalEarnings}
          color="var(--positive)"
          icon={(label) => categoryIcon('earning' as TransactionType, label)}
        />
      </div>

      <div className="card stack elevate-2">
        <span className="section-title">Payment Methods</span>
        <BreakdownList
          items={byPayment}
          total={summary.totalEarnings + summary.totalExpenses}
          color="var(--accent)"
          icon={paymentIcon}
        />
      </div>

      <div className="card stack elevate-2">
        <span className="section-title">Recovery</span>
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="label">Recovery required</span>
            <span className="stat-value" style={{ color: summary.recoveryRequired > 0 ? 'var(--negative)' : undefined }}>
              {formatCurrency(summary.recoveryRequired)}
            </span>
          </div>
          <div className="stat-tile">
            <span className="label">Recovered</span>
            <span className="stat-value" style={{ color: 'var(--positive)' }}>
              {formatCurrency(summary.recoveryRecovered)}
            </span>
          </div>
        </div>
        <hr className="divider" />
        <span className="hero-sub">
          Every rupee spent must be earned back before it counts as fully free again. Recovery
          required is the portion of this month's spending your future earnings still need to
          replenish.
        </span>
      </div>
    </div>
  );
}
