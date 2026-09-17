import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useMonthData } from '../hooks/useMonthData';
import {
  EXPENSE_CATEGORIES,
  EARNING_CATEGORIES,
  PAYMENT_METHODS,
  type TransactionType,
} from '../types';
import { todayISO, nowTime, currentMonthKey, monthKeyOfDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { calculateRecoveryFromEarning, isValidAmount } from '../calc/engine';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon, categoryIcon, paymentIcon } from '../components/Icon';

export function AddTransaction() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const {
    transactions,
    settings,
    createTransaction,
    editTransaction,
    removeTransaction,
  } = useApp();

  const editing = useMemo(
    () => (editId ? transactions.find((t) => t.id === editId) : undefined),
    [editId, transactions]
  );

  const initialType: TransactionType =
    (editing?.type as TransactionType) ??
    (params.get('type') === 'earning' ? 'earning' : 'expense');

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [category, setCategory] = useState(
    editing?.category ?? settings.recentCategory[initialType] ?? ''
  );
  const [merchant, setMerchant] = useState(editing?.sourceOrMerchant ?? '');
  const [paymentMethod, setPaymentMethod] = useState(
    editing?.paymentMethod ?? settings.recentPaymentMethod ?? 'UPI'
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [time, setTime] = useState(editing?.time ?? nowTime());
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const monthKey = monthKeyOfDate(date) || currentMonthKey();
  const { summary } = useMonthData(monthKey);

  useEffect(() => {
    if (!editing) {
      setCategory(settings.recentCategory[type] ?? '');
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseCategories = type === 'expense' ? EXPENSE_CATEGORIES : EARNING_CATEGORIES;
  const savedCustom =
    type === 'expense' ? settings.customExpenseCategories : settings.customEarningCategories;
  const allCategories = useMemo(
    () => Array.from(new Set([...baseCategories, ...savedCustom, ...customCategories])),
    [baseCategories, savedCustom, customCategories]
  );

  const numericAmount = parseFloat(amount);
  const validAmount = isValidAmount(numericAmount);

  const earningPreview = useMemo(() => {
    if (type !== 'earning' || !validAmount) return null;
    return calculateRecoveryFromEarning(summary.recoveryRequired, numericAmount);
  }, [type, validAmount, numericAmount, summary.recoveryRequired]);

  const expenseWarning = useMemo(() => {
    if (type !== 'expense' || !validAmount) return null;
    if (numericAmount <= summary.safeToSpend) return null;
    return numericAmount - summary.safeToSpend;
  }, [type, validAmount, numericAmount, summary.safeToSpend]);

  async function handleSubmit() {
    setError(null);
    if (!validAmount) {
      setError('Enter a valid amount greater than 0.');
      return;
    }
    if (!category) {
      setError('Choose a category.');
      return;
    }
    const input = {
      type,
      amount: numericAmount,
      category,
      sourceOrMerchant: merchant.trim(),
      paymentMethod,
      note: note.trim(),
      date,
      time,
    };
    try {
      if (editing) {
        await editTransaction(editing.id, input);
      } else {
        await createTransaction(input);
      }
      navigate(-1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save transaction.');
    }
  }

  function addCustomCategory() {
    const name = window.prompt('New category name');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomCategories((prev) => Array.from(new Set([...prev, trimmed])));
    setCategory(trimmed);
  }

  async function handleDelete() {
    if (!editing) return;
    await removeTransaction(editing.id);
    navigate(-1);
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="close" size={17} />
        </button>
        <h1 className="page-title">{editing ? 'Edit' : 'Add'} Transaction</h1>
        <span style={{ width: 36 }} />
      </div>

      <div className="type-toggle">
        <button
          className={type === 'expense' ? 'active-expense' : ''}
          onClick={() => setType('expense')}
          disabled={!!editing}
        >
          Expense
        </button>
        <button
          className={type === 'earning' ? 'active-earning' : ''}
          onClick={() => setType('earning')}
          disabled={!!editing}
        >
          Earning
        </button>
      </div>

      <div className="glass-hero" style={{ padding: '30px 24px' }}>
        <input
          className="amount-input"
          inputMode="decimal"
          type="number"
          min="0"
          step="0.01"
          placeholder={'₹0'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      {type === 'earning' && earningPreview && (
        <div className="card stack" style={{ background: 'var(--positive-soft)', border: 'none' }}>
          <div className="row">
            <span className="hero-sub">Earning</span>
            <span style={{ color: 'var(--positive)', fontWeight: 700 }}>
              +{formatCurrency(numericAmount)}
            </span>
          </div>
          {summary.recoveryRequired > 0 && (
            <div className="row">
              <span className="hero-sub">Recovery needed</span>
              <span>{formatCurrency(summary.recoveryRequired)}</span>
            </div>
          )}
          {earningPreview.recovered > 0 && (
            <div className="row">
              <span className="hero-sub">Recovered by this earning</span>
              <span style={{ color: 'var(--positive)' }}>{formatCurrency(earningPreview.recovered)}</span>
            </div>
          )}
          <div className="row">
            <span className="hero-sub">
              {earningPreview.recovered > 0 ? 'Remaining earning after recovery' : 'Adds to safe-to-spend'}
            </span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(earningPreview.remainder)}</span>
          </div>
        </div>
      )}

      {type === 'expense' && expenseWarning !== null && (
        <div className="card stack" style={{ background: 'var(--warning-soft)', border: 'none' }}>
          <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={14} /> Recovery Required
          </span>
          <div className="row">
            <span className="hero-sub">Safe to spend</span>
            <span>{formatCurrency(summary.safeToSpend)}</span>
          </div>
          <div className="row">
            <span className="hero-sub">This expense</span>
            <span>{formatCurrency(numericAmount)}</span>
          </div>
          <div className="row">
            <span className="hero-sub">Recovery required after</span>
            <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
              {formatCurrency(expenseWarning)}
            </span>
          </div>
        </div>
      )}

      <div className="card stack">
        <div className="form-group">
          <span className="form-label">Category</span>
          <div className="chip-row">
            {allCategories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(c)}
              >
                <Icon name={categoryIcon(type, c)} size={14} />
                {c}
              </button>
            ))}
            <button className="chip" onClick={addCustomCategory}>
              <Icon name="plus" size={14} />
              Custom
            </button>
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">{type === 'expense' ? 'Merchant / Where' : 'Source'}</span>
          <input
            className="input"
            placeholder={type === 'expense' ? 'e.g. Zomato, Local Shop' : 'e.g. Freelancing client'}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </div>

        <div className="form-group">
          <span className="form-label">Payment Method</span>
          <div className="chip-row">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                className={`chip ${paymentMethod === m ? 'active' : ''}`}
                onClick={() => setPaymentMethod(m)}
              >
                <Icon name={paymentIcon(m)} size={14} />
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Note</span>
          <input
            className="input"
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <span className="form-label">Date</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <span className="form-label">Time</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ color: 'var(--negative)', fontSize: 14, background: 'var(--negative-soft)', border: 'none' }}>
          {error}
        </div>
      )}

      <button className="btn" onClick={handleSubmit}>
        {editing ? 'Save Changes' : `Add ${type === 'expense' ? 'Expense' : 'Earning'}`}
      </button>

      {editing && (
        <button className="btn btn-secondary" style={{ color: 'var(--negative)' }} onClick={() => setShowDelete(true)}>
          Delete Transaction
        </button>
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete transaction?"
          message="This cannot be undone. The transaction will be permanently removed."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
