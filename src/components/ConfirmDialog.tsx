export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-drag-indicator" />
        <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px' }}>
          {message}
        </p>
        <div className="stack">
          <button className={`btn ${danger ? 'btn-danger' : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
