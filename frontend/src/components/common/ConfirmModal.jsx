export default function ConfirmModal({ isOpen, title, message, subMessage, confirmText = 'Confirm', confirmClass = 'btn-danger-custom', onConfirm, onCancel, icon, loading }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          {icon && (
            <div className="confirm-icon">
              <i className={icon}></i>
            </div>
          )}
          <div className="confirm-message">{title}</div>
          {message && <div className="confirm-submessage" style={{ marginTop: 8 }}>{message}</div>}
          {subMessage && <div className="confirm-submessage" style={{ marginTop: 4, color: 'var(--danger)', fontSize: 12 }}>{subMessage}</div>}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
          <button className="btn-outline-custom" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={confirmClass} onClick={onConfirm} disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing…</> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
