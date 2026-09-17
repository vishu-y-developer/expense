import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useMonthData } from '../hooks/useMonthData';
import { formatCurrency } from '../utils/format';
import { formatMonthLabel, currentMonthKey } from '../utils/date';
import { TransactionRow } from '../components/TransactionRow';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { GlassProgress } from '../components/Glass';
import { Icon } from '../components/Icon';

export function Dashboard() {
  const navigate = useNavigate();
  const month = currentMonthKey();
  const { summary, todaySummary, recentTransactions, budget } = useMonthData(month);
  const { transactions } = useApp();

  const todayEarnings = todaySummary?.earnings ?? 0;
  const todayExpenses = todaySummary?.expenses ?? 0;
  const todayNet = todaySummary?.net ?? 0;
  const todayRecoveryCreated = todaySummary?.recoveryCreated ?? 0;
  const todayRecoveryRecovered = todaySummary?.recoveryRecovered ?? 0;

  const usedPercent = summary.budgetUsedPercent;
  const recoveryTotal = summary.recoveryRequired + summary.recoveryRecovered;
  const recoveryPercent = recoveryTotal > 0 ? (summary.recoveryRecovered / recoveryTotal) * 100 : 100;

  const hasAnyData = transactions.length > 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Money</h1>
        <span className="pill pill-neutral">{formatMonthLabel(month)}</span>
      </div>

      {/* 1. SAFE TO SPEND — hero */}
      <div className="glass-hero safe-hero">
        <span className="hero-label">Safe to Spend</span>
        <AnimatedNumber value={summary.safeToSpend} className="hero-amount" />
        <span className="hero-sub">
          Available according to your budget and recovery rules.
        </span>
        <div className="hero-footer">
          <div className="hero-footer-item">
            <span className="label">Monthly capacity</span>
            <span className="hero-footer-value">{formatCurrency(budget)}</span>
          </div>
          <div className="hero-footer-item">
            <span className="label">Recovery</span>
            <span className="hero-footer-value" style={{ color: summary.recoveryRequired > 0 ? 'var(--negative)' : 'var(--positive)' }}>
              {formatCurrency(summary.recoveryRequired)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. TODAY + 3. RECOVERY */}
      <div className="dash-pair">
      <div className="glass-card stack elevate-2">
        <span className="section-title">Today</span>
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="label">Earned</span>
            <AnimatedNumber value={todayEarnings} className="stat-value" style={{ color: 'var(--positive)' }} />
          </div>
          <div className="stat-tile">
            <span className="label">Spent</span>
            <AnimatedNumber value={todayExpenses} className="stat-value" style={{ color: 'var(--negative)' }} />
          </div>
          <div className="stat-tile">
            <span className="label">Net</span>
            <AnimatedNumber value={todayNet} signed className="stat-value" />
          </div>
          <div className="stat-tile">
            <span className="label">Safe to spend</span>
            <AnimatedNumber value={summary.safeToSpend} className="stat-value" />
          </div>
        </div>
        {(todayRecoveryCreated > 0 || todayRecoveryRecovered > 0) && (
          <>
            <hr className="divider" />
            <div className="stat-grid">
              <div className="stat-tile">
                <span className="label">Recovery created</span>
                <span className="stat-value" style={{ color: 'var(--negative)' }}>
                  {formatCurrency(todayRecoveryCreated)}
                </span>
              </div>
              <div className="stat-tile">
                <span className="label">Recovered</span>
                <span className="stat-value" style={{ color: 'var(--positive)' }}>
                  {formatCurrency(todayRecoveryRecovered)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="glass-card elevate-2">
        <div className="recovery-ring-row">
          <div className="recovery-copy">
            <span className="label">Recovery</span>
            <span className="recovery-amount">
              {summary.recoveryRequired > 0 ? `${formatCurrency(summary.recoveryRequired)} remaining` : 'All clear'}
            </span>
            <span className="hero-sub" style={{ marginTop: 4 }}>
              {summary.recoveryRequired > 0
                ? 'Your next earnings will cover this first.'
                : 'No spending currently owes a future earning.'}
            </span>
          </div>
          <GlassProgress
            percent={recoveryPercent}
            value={`${Math.round(recoveryPercent)}%`}
            caption="recovered"
            color={summary.recoveryRequired > 0 ? 'var(--accent)' : 'var(--positive)'}
          />
        </div>
        {recoveryTotal > 0 && (
          <div className="recovery-calm-note" style={{ marginTop: 14 }}>
            <Icon name="shield" size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
            <span>
              {formatCurrency(summary.recoveryRecovered)} recovered of {formatCurrency(recoveryTotal)} total this month.
            </span>
          </div>
        )}
      </div>
      </div>

      {/* 4. MONTHLY OVERVIEW */}
      <div className="glass-card stack elevate-2">
        <div className="row">
          <span className="section-title" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 13 }}>
            {formatMonthLabel(month)}
          </span>
          <span className="label" style={{ textTransform: 'none' }}>Budget {formatCurrency(budget)}</span>
        </div>

        <div className="recovery-ring-row">
          <div className="recovery-copy">
            <span className="stat-value" style={{ fontSize: 22 }}>
              {formatCurrency(summary.totalExpenses)} spent
            </span>
            <span className="hero-sub">{formatCurrency(summary.budgetRemaining)} remaining</span>
          </div>
          <GlassProgress
            percent={usedPercent}
            value={`${Math.round(usedPercent)}%`}
            caption="used"
            color={usedPercent >= 100 ? 'var(--negative)' : 'var(--accent)'}
          />
        </div>

        <div className="money-flow-grid" style={{ marginTop: 4 }}>
          <div className="flow-tile earned">
            <div className="flow-icon"><Icon name="arrowDown" size={15} style={{ color: 'var(--positive)' }} /></div>
            <span className="label">Earned</span>
            <AnimatedNumber value={summary.totalEarnings} className="flow-value" />
          </div>
          <div className="flow-tile spent">
            <div className="flow-icon"><Icon name="arrowUp" size={15} style={{ color: 'var(--negative)' }} /></div>
            <span className="label">Spent</span>
            <AnimatedNumber value={summary.totalExpenses} className="flow-value" />
          </div>
          <div className="flow-tile net">
            <div>
              <span className="label">Net cash flow</span>
              <AnimatedNumber value={summary.netCashFlow} signed className="flow-value" />
            </div>
            <div className="flow-icon"><Icon name="trendUp" size={16} style={{ color: 'var(--accent)' }} /></div>
          </div>
        </div>
      </div>

      {/* 5. RECENT TRANSACTIONS */}
      <div className="glass-card stack elevate-2">
        <div className="row">
          <span className="section-title">Recent transactions</span>
          <button className="btn-ghost" onClick={() => navigate('/history')}>
            See all
          </button>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="empty-state">
            {hasAnyData
              ? 'No transactions yet this month.'
              : 'No transactions yet. Tap + to add your first earning or expense.'}
          </div>
        ) : (
          recentTransactions
            .slice(0, 6)
            .map((t) => <TransactionRow key={t.id} transaction={t} onClick={() => navigate(`/add?edit=${t.id}`)} />)
        )}
      </div>
    </div>
  );
}
