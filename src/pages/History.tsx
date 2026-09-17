import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { EXPENSE_CATEGORIES, EARNING_CATEGORIES, PAYMENT_METHODS, type TransactionType } from '../types';
import { sortChronological } from '../calc/engine';
import { formatDateLabel, monthKeyOfDate, currentMonthKey } from '../utils/date';
import { TransactionRow } from '../components/TransactionRow';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { Icon } from '../components/Icon';

type TypeFilter = 'all' | TransactionType;

export function History() {
  const navigate = useNavigate();
  const { transactions } = useApp();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [month, setMonth] = useState(currentMonthKey());
  const [allTime, setAllTime] = useState(false);

  const allCategories = useMemo(
    () => Array.from(new Set([...EXPENSE_CATEGORIES, ...EARNING_CATEGORIES, ...transactions.map((t) => t.category)])),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (!allTime && monthKeyOfDate(t.date) !== month) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (paymentFilter !== 'all' && t.paymentMethod !== paymentFilter) return false;
      if (q) {
        const haystack = `${t.category} ${t.sourceOrMerchant} ${t.note} ${t.paymentMethod}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, query, typeFilter, categoryFilter, paymentFilter, month, allTime]);

  const grouped = useMemo(() => {
    const sorted = sortChronological(filtered).reverse();
    const map = new Map<string, typeof sorted>();
    for (const t of sorted) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">History</h1>
      </div>

      <div className="card stack card-tight">
        <div className="row">
          {allTime ? (
            <span className="section-title">All time</span>
          ) : (
            <MonthSwitcher month={month} onChange={setMonth} />
          )}
          <button className="chip" onClick={() => setAllTime((v) => !v)}>
            {allTime ? 'Show by month' : 'All time'}
          </button>
        </div>
        <div className="search-box">
          <Icon
            name="search"
            size={16}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
          />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            placeholder="Search category, merchant, note..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-row">
          {(['all', 'expense', 'earning'] as TypeFilter[]).map((f) => (
            <button
              key={f}
              className={`chip ${typeFilter === f ? 'active' : ''}`}
              onClick={() => setTypeFilter(f)}
            >
              {f === 'all' ? 'All types' : f === 'expense' ? 'Expenses' : 'Earnings'}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="select" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">All payment methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="empty-state">No transactions match your filters.</div>
      ) : (
        grouped.map(([date, txns]) => (
          <div key={date} className="card stack elevate-2">
            <div className="row">
              <span className="section-title">{formatDateLabel(date)}</span>
              <button className="btn-ghost" onClick={() => navigate(`/day/${date}`)}>
                View day
              </button>
            </div>
            {txns.map((t) => (
              <TransactionRow key={t.id} transaction={t} onClick={() => navigate(`/add?edit=${t.id}`)} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
