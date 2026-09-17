import { useNavigate, useParams } from 'react-router-dom';
import { useMonthData } from '../hooks/useMonthData';
import { monthKeyOfDate, formatDateLabelFull } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { sortChronological } from '../calc/engine';
import { TransactionRow } from '../components/TransactionRow';
import { Icon } from '../components/Icon';

export function DayView() {
  const navigate = useNavigate();
  const { date } = useParams<{ date: string }>();
  const dateISO = date ?? '';
  const monthKey = monthKeyOfDate(dateISO);
  const { daily } = useMonthData(monthKey);

  const day = daily.find((d) => d.date === dateISO);
  const transactions = day ? sortChronological(day.transactions).reverse() : [];

  return (
    <div className="page">
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="chevronLeft" size={16} />
        </button>
        <h1 className="page-title" style={{ fontSize: 17 }}>
          {formatDateLabelFull(dateISO)}
        </h1>
        <span style={{ width: 36 }} />
      </div>

      <div className="card stack elevate-2">
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="label">Earnings</span>
            <span className="stat-value" style={{ color: 'var(--positive)' }}>
              {formatCurrency(day?.earnings ?? 0)}
            </span>
          </div>
          <div className="stat-tile">
            <span className="label">Expenses</span>
            <span className="stat-value" style={{ color: 'var(--negative)' }}>
              {formatCurrency(day?.expenses ?? 0)}
            </span>
          </div>
          <div className="stat-tile">
            <span className="label">Net</span>
            <span className="stat-value">{formatCurrency(day?.net ?? 0)}</span>
          </div>
        </div>
        {(day?.recoveryCreated ?? 0) > 0 || (day?.recoveryRecovered ?? 0) > 0 ? (
          <>
            <hr className="divider" />
            <div className="stat-grid">
              <div className="stat-tile">
                <span className="label">Recovery created</span>
                <span className="stat-value" style={{ color: 'var(--negative)' }}>
                  {formatCurrency(day?.recoveryCreated ?? 0)}
                </span>
              </div>
              <div className="stat-tile">
                <span className="label">Recovered</span>
                <span className="stat-value" style={{ color: 'var(--positive)' }}>
                  {formatCurrency(day?.recoveryRecovered ?? 0)}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="card stack elevate-2">
        <span className="section-title">Transactions</span>
        {transactions.length === 0 ? (
          <div className="empty-state">No transactions on this day.</div>
        ) : (
          transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} onClick={() => navigate(`/add?edit=${t.id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
