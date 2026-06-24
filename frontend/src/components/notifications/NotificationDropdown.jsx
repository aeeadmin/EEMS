import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeAgeWithTime } from '../../utils/helpers';

export default function NotificationDropdown({ notifications, unreadCount, markAllRead, onClose }) {
  const [activeNotif, setActiveNotif] = useState(null);
  const { markRead } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const recentNotifs = notifications ? notifications.slice(0, 10) : [];
  
  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllRead();
  };

  const isPendingOrProgress = (n) => {
    return false;
  };

  const getNotifIcon = (n) => {
    if (!n) return 'fa-circle-info text-primary';
    const type = n.type;
    const titleLower = (n.title || '').toLowerCase();
    const msgLower = (n.message || '').toLowerCase();
    const isRetirement = titleLower.includes('retirement') || msgLower.includes('retirement') || msgLower.includes('retire');

    switch (type) {
      case 'SUCCESS': return 'fa-circle-check text-success';
      case 'WARNING': 
        if (isRetirement) {
          return 'fa-triangle-exclamation text-warning';
        }
        return 'fa-circle-info text-primary';
      case 'ERROR': return 'fa-circle-xmark text-danger';
      default: return 'fa-circle-info text-primary';
    }
  };

  const handleItemClick = (n) => {
    setActiveNotif(n);
    if (!n.is_read) {
      markRead(n.id);
    }
  };

  return (
    <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
      <div className="notification-panel-header">
        <span>Notifications ({unreadCount})</span>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead} 
            className="btn btn-link btn-sm text-decoration-none p-0 text-primary fw-semibold"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-list">
        {recentNotifs.length === 0 ? (
          <div className="notification-empty">No new notifications</div>
        ) : (
          recentNotifs.map((n) => {
            const hasClock = isPendingOrProgress(n);
            return (
              <div 
                key={n.id} 
                className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => handleItemClick(n)}
              >
                <span className={`notification-dot ${n.is_read ? 'read' : ''}`}></span>
                <div className="notification-content">
                  <div className="ntitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {hasClock && <i className="fa-solid fa-clock fa-spin text-warning" style={{ fontSize: '11px' }}></i>}
                    <span>{n.title}</span>
                  </div>
                  <div className="nmsg">{n.message}</div>
                  <div className="ntime">{formatRelativeAgeWithTime(n.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="notification-footer">
        <button 
          onClick={onClose} 
          className="btn btn-link btn-sm text-decoration-none w-100 p-0 text-center text-secondary"
        >
          Close Panel
        </button>
      </div>

      {activeNotif && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-box" style={{ maxWidth: '420px', background: 'var(--bg-card)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">{activeNotif.title}</h5>
              <button className="modal-close" onClick={() => setActiveNotif(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="d-flex align-items-center mb-3">
                <i className={`fa-solid ${getNotifIcon(activeNotif)} me-2 fs-5`}></i>
                <span className="text-muted" style={{ fontSize: '12px' }}>
                  {formatRelativeAgeWithTime(activeNotif.created_at)}
                </span>
              </div>
              <p className="m-0 text-secondary" style={{ fontSize: '13.5px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                {activeNotif.message}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary-custom btn-sm" onClick={() => setActiveNotif(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
