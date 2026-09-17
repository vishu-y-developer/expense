import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/format';
import { todayISO, nowTime } from '../utils/date';
import { isValidAmount } from '../calc/engine';

/**
 * Manual recovery settlement — like paying off a credit-card balance from a
 * separate bank account. Never triggered automatically; the user explicitly
 * chooses how much of their earnings balance to apply toward recovery debt.
 */
export function RecoverModal({
  month,
  recoveryRequired,
  earningsBalance,
  onClose,
}: {
  month: string;
  recoveryRequired: number;
  earningsBalance: number;
  onClose: () => void;
}) {
  const { recordRecoveryPayment } = useApp();
  const maxPayable = Math.max(0, Math.min(recoveryRequired, earningsBalance));
  const [amount, setAmount] = useState(maxPayable > 0 ? String(maxPayable) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const numericAmount = parseFloat(amount);

  async function handleConfirm() {
    setError(null);
    if (!isValidAmount(numericAmount)) {
      setError('Enter a valid amount greater than 0.');
      return;
    }
    if (numericAmount > recoveryRequired + 0.001) {
      setError(`You only owe ${formatCurrency(recoveryRequired)} in recovery — enter that or less.`);
      return;
    }
    if (numericAmount > earningsBalance + 0.001) {
      setError(`Your earnings balance is only ${formatCurrency(earningsBalance)}.`);
      return;
    }
    setSaving(true);
    try {
      await recordRecoveryPayment({
        month,
        amount: numericAmount,
        date: todayISO(),
        time: nowTime(),
        note: 'Manual recovery payment',
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record this payment.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-drag-indicator" />
        <h3 style={{ margin: '0 0 8px' }}>Pay back recovery</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, margin: '0 0 16px' }}>
          Choose how much to pay from your earnings balance toward this month's recovery debt.
          Nothing is deducted automatically — only what you confirm here.
        </p>

        <div className="row" style={{ marginBottom: 6 }}>
          <span className="hero-sub">Recovery owed</span>
          <span style={{ fontWeight: 700, color: 'var(--negative)' }}>{formatCurrency(recoveryRequired)}</span>
        </div>
        <div className="row" style={{ marginBottom: 16 }}>
          <span className="hero-sub">Earnings balance available</span>
          <span style={{ fontWeight: 700, color: 'var(--positive)' }}>{formatCurrency(earningsBalance)}</span>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <span className="form-label">Amount to pay back</span>
          <input
            className="input"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            max={maxPayable || undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        {error && (
          <div
            className="card"
            style={{ color: 'var(--negative)', fontSize: 14, background: 'var(--negative-soft)', border: 'none', marginBottom: 16, padding: 14 }}
          >
            {error}
          </div>
        )}

        <div className="stack">
          <button className="btn" onClick={handleConfirm} disabled={saving || maxPayable <= 0}>
            {saving ? 'Saving…' : `Pay back ${amount ? formatCurrency(numericAmount || 0) : ''}`}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
