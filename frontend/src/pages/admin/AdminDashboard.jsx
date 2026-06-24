import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDashboardStats, getRequests, getCyberCampaignSettings, updateCyberCampaignSettings } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeAge } from '../../utils/helpers';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCampaignSettings, setShowCampaignSettings] = useState(false);
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [campaignSaving, setCampaignSaving] = useState(false);
  const { socket } = useSocket();

  const loadData = async () => {
    try {
      const statsRes = await getDashboardStats();
      setStats(statsRes.data);

      const requestsRes = await getRequests({ page: 1, limit: 5 });
      setRecentRequests(requestsRes.data.requests);
      
      const settingsRes = await getCyberCampaignSettings();
      setCampaignStartDate(settingsRes.data.startDate);
      setCampaignEndDate(settingsRes.data.endDate);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time updates
    if (socket) {
      socket.on('dashboard:updated', loadData);
      socket.on('request:new', loadData);
      socket.on('request:updated', loadData);
    }

    return () => {
      if (socket) {
        socket.off('dashboard:updated', loadData);
        socket.off('request:new', loadData);
        socket.off('request:updated', loadData);
      }
    };
  }, [socket]);

  if (loading || !stats) {
    return (
      <Layout title="TNEB EEMS – Admin Dashboard">
        <LoadingSpinner />
      </Layout>
    );
  }

  const handleSaveCampaignSettings = async (e) => {
    e.preventDefault();
    if (!campaignStartDate || !campaignEndDate) {
      toast.error('Both start and end dates are required.');
      return;
    }
    if (new Date(campaignStartDate) > new Date(campaignEndDate)) {
      toast.error('Start date must be before or equal to end date.');
      return;
    }
    setCampaignSaving(true);
    try {
      const res = await updateCyberCampaignSettings({
        startDate: campaignStartDate,
        endDate: campaignEndDate
      });
      toast.success(res.data.message || 'Campaign dates updated successfully.');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update campaign dates.');
    } finally {
      setCampaignSaving(false);
    }
  };

  const getCampaignStatusText = () => {
    if (!campaignStartDate || !campaignEndDate) return 'Not Scheduled';
    const start = new Date(campaignStartDate);
    const end = new Date(campaignEndDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (today < start) {
      const diffTime = start - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Scheduled (Starts in ${diffDays} day${diffDays > 1 ? 's' : ''})`;
    }
    if (today > end) {
      return 'Completed/Inactive';
    }
    const diffTime = today - start;
    const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `Active – Day ${elapsedDays}`;
  };

  return (
    <Layout title="TNEB EEMS – Admin Dashboard">
      <Toaster position="top-right" />
      <div className="welcome-card">
        <div>
          <h4>Tamil Nadu Electricity Board ERP Portal</h4>
          <p>Logged in as Administrator. Use the side menu to manage employees, approvals, retirements, and view audit trails.</p>
        </div>
        <div className="welcome-card-icon">
          <i className="fa-solid fa-building-columns"></i>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatCard 
            title="Total Employees" 
            value={stats.totalEmployees} 
            icon="fa-users" 
            color="blue" 
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatCard 
            title="Active Employees" 
            value={stats.activeEmployees} 
            icon="fa-user-check" 
            color="green" 
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatCard 
            title="Retired Employees" 
            value={stats.retiredEmployees} 
            icon="fa-user-slash" 
            color="red" 
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatCard 
            title="Pending Requests" 
            value={stats.pendingRequests} 
            icon="fa-envelope" 
            color="orange" 
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatCard 
            title="Approved Requests" 
            value={stats.approvedRequests} 
            icon="fa-envelope-circle-check" 
            color="teal" 
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatCard 
            title="Rejected Requests" 
            value={stats.rejectedRequests} 
            icon="fa-circle-xmark" 
            color="purple" 
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">Recent Requests</h5>
              <Link to="/admin/requests" className="btn btn-outline-custom btn-sm py-1">View All</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-scroll">
                <table className="m-0">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>District</th>
                      <th>Request Type</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-secondary">No requests found</td>
                      </tr>
                    ) : (
                      recentRequests.map(r => {
                        return (
                          <tr key={r.id}>
                            <td>{r.employee_name || r.employee_id}</td>
                            <td>{r.district}</td>
                            <td>{r.request_type}</td>
                            <td>{r.status}</td>
                            <td>{new Date(r.created_at).toLocaleDateString()} ({formatRelativeAge(r.created_at)})</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Buttons and Panels */}
      <>
        {/* Quick Actions Button & Panel */}
        <button 
          className="floating-quick-actions-btn" 
          onClick={() => {
            setShowQuickActions(!showQuickActions);
            setShowCampaignSettings(false);
          }}
          title="Open Quick Actions"
        >
          <i className="fa-solid fa-bolt text-warning me-1"></i> Quick Actions
        </button>

        <div className={`floating-quick-actions ${showQuickActions ? 'open' : ''}`}>
          <div className="floating-quick-actions-header">
            <h5 className="m-0 fw-bold" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-bolt text-warning me-1"></i> Quick Actions
            </h5>
            <button className="modal-close" onClick={() => setShowQuickActions(false)} title="Close Panel">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="floating-quick-actions-body">
            <div className="d-grid gap-2">
              <Link to="/admin/employees" className="btn btn-primary-custom w-100 text-center justify-content-center" onClick={() => setShowQuickActions(false)}>
                <i className="fa-solid fa-user-plus me-1"></i> Add / Manage Employees
              </Link>
              <Link to="/admin/requests" className="btn btn-outline-custom w-100 text-center justify-content-center" onClick={() => setShowQuickActions(false)}>
                <i className="fa-solid fa-list-check me-1"></i> Process Pending Approvals
              </Link>
              <Link to="/admin/retirements" className="btn btn-outline-custom w-100 text-center justify-content-center" onClick={() => setShowQuickActions(false)}>
                <i className="fa-solid fa-hourglass-half me-1"></i> View Upcoming Retirements
              </Link>
              <Link to="/admin/reports" className="btn btn-outline-custom w-100 text-center justify-content-center" onClick={() => setShowQuickActions(false)}>
                <i className="fa-solid fa-file-excel me-1"></i> Export Excel Data Reports
              </Link>
            </div>
          </div>
        </div>

        {/* Cyber Campaign Schedule Button & Panel */}
        <button 
          className="floating-quick-actions-btn" 
          style={{ top: '65%' }}
          onClick={() => {
            setShowCampaignSettings(!showCampaignSettings);
            setShowQuickActions(false);
          }}
          title="Open Cyber Campaign Schedule"
        >
          <i className="fa-solid fa-shield-halved text-warning me-1"></i> Cyber Campaign
        </button>

        <div className={`floating-quick-actions ${showCampaignSettings ? 'open' : ''}`} style={{ top: '200px', height: '430px' }}>
          <div className="floating-quick-actions-header">
            <h5 className="m-0 fw-bold" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-shield-halved text-primary me-2"></i> Cyber Campaign Schedule
            </h5>
            <button className="modal-close" onClick={() => setShowCampaignSettings(false)} title="Close Panel">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="floating-quick-actions-body p-4">
            <form onSubmit={handleSaveCampaignSettings}>
              <div className="mb-3">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '13px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  style={{ 
                    height: '42px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-body)', 
                    color: 'var(--text-primary)',
                    paddingLeft: '12px'
                  }}
                  value={campaignStartDate}
                  onChange={(e) => setCampaignStartDate(e.target.value)}
                  disabled={campaignSaving}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '13px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  style={{ 
                    height: '42px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-body)', 
                    color: 'var(--text-primary)',
                    paddingLeft: '12px'
                  }}
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                  disabled={campaignSaving}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-bold text-secondary d-block mb-2" style={{ fontSize: '13px' }}>
                  Campaign Status
                </label>
                <span className={`badge ${getCampaignStatusText().startsWith('Active') ? 'bg-success' : getCampaignStatusText().startsWith('Scheduled') ? 'bg-info' : 'bg-secondary'} px-3 py-2 fs-7 fw-semibold`} style={{ borderRadius: '6px' }}>
                  {getCampaignStatusText()}
                </span>
              </div>
              <div className="text-end mt-4">
                <button
                  type="submit"
                  className="btn btn-primary-custom py-2 px-3 w-100 text-center justify-content-center"
                  disabled={campaignSaving}
                  style={{ borderRadius: '6px', height: '42px' }}
                >
                  {campaignSaving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin me-2"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk me-2"></i> Save Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    </Layout>
  );
}
