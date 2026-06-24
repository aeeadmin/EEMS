import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDashboardStats, getMyRequests } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { formatRelativeAge } from '../../utils/helpers';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const loadData = async () => {
    try {
      const statsRes = await getDashboardStats();
      setStats(statsRes.data);

      const reqRes = await getMyRequests({ page: 1, limit: 5 });
      setMyRequests(reqRes.data.requests);
    } catch (err) {
      console.error('Failed to load Manager dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (socket) {
      socket.on('dashboard:updated', loadData);
      socket.on('request:updated', loadData);
    }

    return () => {
      if (socket) {
        socket.off('dashboard:updated', loadData);
        socket.off('request:updated', loadData);
      }
    };
  }, [socket]);

  if (loading || !stats) {
    return (
      <Layout title="TNEB EEMS – Manager Dashboard">
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout title="TNEB EEMS – Manager Dashboard">
      <div className="welcome-card">
        <div>
          <h4>Welcome back, {user?.name}</h4>
          <p>Jurisdiction: <strong>{user?.district} District</strong>. You can view employee directory mappings and submit correction/edit requests for your personnel.</p>
        </div>
        <div className="welcome-card-icon">
          <i className="fa-solid fa-user-tie"></i>
        </div>
      </div>

      <div className="row g-4 mb-4 animate__animated animate__fadeIn">
        <div className="col-xl-3 col-md-6">
          <StatCard 
            title="Total District Employees" 
            value={stats.totalEmployees} 
            icon="fa-users" 
            color="blue" 
          />
        </div>
        <div className="col-xl-3 col-md-6">
          <StatCard 
            title="Active Employees" 
            value={stats.activeEmployees} 
            icon="fa-user-check" 
            color="green" 
          />
        </div>
        <div className="col-xl-3 col-md-6">
          <StatCard 
            title="My District Requests" 
            value={stats.districtRequests} 
            icon="fa-clock-rotate-left" 
            color="orange" 
          />
        </div>
        <div className="col-xl-3 col-md-6">
          <StatCard 
            title="Retired Employees" 
            value={stats.retiredEmployees} 
            icon="fa-user-slash" 
            color="red" 
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">My Submitted Requests</h5>
              <Link to="/manager/requests" className="btn btn-outline-custom btn-sm py-1">View Status</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-scroll">
                <table className="m-0">
                  <thead>
                    <tr>
                      <th>Req ID</th>
                      <th>Employee Name</th>
                      <th>Request Type</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-secondary">No requests submitted yet</td>
                      </tr>
                    ) : (
                      myRequests.map(r => (
                        <tr key={r.id}>
                          <td className="fw-semibold">#{r.id}</td>
                          <td>{r.employee_name || r.employee_id}</td>
                          <td>{r.request_type}</td>
                          <td>{r.subject}</td>
                          <td>{r.status}</td>
                          <td>
                            {new Date(r.created_at).toLocaleDateString()} ({formatRelativeAge(r.created_at)})
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">District Quick Access</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/manager/employees" className="btn btn-primary-custom w-100 text-center justify-content-center">
                  <i className="fa-solid fa-users me-1"></i> View District Employees
                </Link>
                <Link to="/manager/requests" className="btn btn-outline-custom w-100 text-center justify-content-center">
                  <i className="fa-solid fa-clock-rotate-left me-1"></i> Check Request Status
                </Link>
                <Link to="/manager/notifications" className="btn btn-outline-custom w-100 text-center justify-content-center">
                  <i className="fa-solid fa-bell me-1"></i> View Alerts & Notifications
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
