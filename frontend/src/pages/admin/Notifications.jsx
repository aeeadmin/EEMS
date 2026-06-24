import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { exportData } from '../../services/api';
import { formatRelativeAgeWithTime } from '../../utils/helpers';
import toast, { Toaster } from 'react-hot-toast';

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useSocket();
  const [activeNotif, setActiveNotif] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
    } catch(e) {
      toast.error('Action failed');
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await exportData('notifications', format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Notifications_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
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

  const isPendingOrProgress = (n) => {
    return false;
  };

  const handleItemClick = (n) => {
    setActiveNotif(n);
    if (!n.is_read) {
      markRead(n.id);
    }
  };

  return (
    <Layout title="TNEB EEMS – Notifications">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Notifications Center</h4>
          <p className="page-subtitle">View real-time event logs, system notices, and approval alerts.</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button onClick={() => handleExport('excel')} className="btn btn-outline-custom btn-sm">
            <i className="fa-solid fa-file-excel"></i> Export Excel
          </button>
          <button onClick={() => handleExport('csv')} className="btn btn-outline-custom btn-sm">
            <i className="fa-solid fa-file-csv"></i> Export CSV
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-outline-custom btn-sm">
              <i className="fa-solid fa-envelope-open"></i> Mark All as Read
            </button>
          )}
        </div>
      </div>

      <div className="card mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <div className="card-body py-3 px-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-circle-question me-1 text-primary"></i> Notification Legend:
          </div>
          <div className="d-flex flex-wrap gap-4 align-items-center" style={{ fontSize: '12.5px' }}>
            <div className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-warning fs-5"></i>
              <span><strong>Warning:</strong> Retirement alerts (6m, 3m, 1m warnings)</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-circle-info text-primary fs-5"></i>
              <span><strong>Info:</strong> Edit requests & system logs</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-circle-check text-success fs-5"></i>
              <span><strong>Success:</strong> Account creation & archiving</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-circle-xmark text-danger fs-5"></i>
              <span><strong>Error:</strong> Failed operations or audit alerts</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <div className="card-body p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <i className="fa-regular fa-bell-slash fs-1 d-block mb-3"></i>
                No notifications found
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {notifications.map((n) => {
                  const hasClock = isPendingOrProgress(n);
                  return (
                    <div 
                      key={n.id} 
                      className={`list-group-item p-3 border-bottom d-flex align-items-start gap-3 ${!n.is_read ? 'unread-notif' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleItemClick(n)}
                    >
                      <i className={`fa-solid ${getNotifIcon(n)} fs-4 mt-1`}></i>
                      <div className="flex-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h6 className="m-0 fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{n.title}</span>
                            {hasClock && <i className="fa-solid fa-clock fa-spin text-warning" style={{ fontSize: '12px' }}></i>}
                          </h6>
                          <small className="text-muted">
                            {formatRelativeAgeWithTime(n.created_at)}
                          </small>
                        </div>
                        <p className="m-0 text-secondary" style={{ fontSize: '13.5px' }}>
                          {n.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeNotif && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-box" style={{ maxWidth: '450px', background: 'var(--bg-card)' }} onClick={(e) => e.stopPropagation()}>
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
              <p className="m-0 text-secondary" style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
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
    </Layout>
  );
}
