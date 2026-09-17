import type { Transaction } from '../types';
import { formatCurrency } from '../utils/format';
import { formatTimeLabel } from '../utils/date';
import { Icon, categoryIcon } from './Icon';

export function TransactionRow({
  transaction,
  onClick,
}: {
  transaction: Transaction;
  onClick?: () => void;
}) {
  const isEarning = transaction.type === 'earning';
  return (
    <div
      className="txn-item"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
    >
      <div className={`txn-icon ${transaction.type}`}>
        <Icon name={categoryIcon(transaction.type, transaction.category)} size={19} />
      </div>
      <div className="txn-body">
        <div className="txn-title">{transaction.sourceOrMerchant || transaction.category}</div>
        <div className="txn-meta">
          {transaction.category} {'·'} {transaction.paymentMethod}
        </div>
      </div>
      <div className="txn-trailing">
        <span className={`txn-amount ${transaction.type}`}>
          {isEarning ? '+' : '−'}
          {formatCurrency(transaction.amount)}
        </span>
        <span className="txn-time">{formatTimeLabel(transaction.time)}</span>
      </div>
    </div>
  );
}
