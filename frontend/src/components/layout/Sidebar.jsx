import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const role = user.role;

  const adminNav = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'fa-gauge' },
    { label: 'Employee Details', path: '/admin/employees', icon: 'fa-users' },
    { label: 'Requests', path: '/admin/requests', icon: 'fa-envelope-open-text' },
    { label: 'Manager Details', path: '/admin/managers', icon: 'fa-user-tie' },
    { label: 'Admin Details', path: '/admin/admins', icon: 'fa-user-shield' },
    { label: 'Upcoming Retirement', path: '/admin/retirements', icon: 'fa-hourglass-half' },
    { label: 'Notifications', path: '/admin/notifications', icon: 'fa-bell' },
    { label: 'Reports', path: '/admin/reports', icon: 'fa-chart-pie' },
    { label: 'Awareness Mail', path: '/admin/awareness', icon: 'fa-bullhorn' },
    { label: 'Audit Logs', path: '/admin/audit', icon: 'fa-list-check' },
    { label: 'Settings', path: '/admin/settings', icon: 'fa-sliders' },
    { label: 'Database Editor', path: '/admin/db-editor', icon: 'fa-database' },
  ];

  const managerNav = [
    { label: 'Dashboard', path: '/manager/dashboard', icon: 'fa-gauge' },
    { label: 'Employee Details', path: '/manager/employees', icon: 'fa-users' },
    { label: 'Request Status', path: '/manager/requests', icon: 'fa-clock-rotate-left' },
    { label: 'Notifications', path: '/manager/notifications', icon: 'fa-bell' },
    { label: 'Settings', path: '/manager/settings', icon: 'fa-sliders' },
  ];

  const navigation = role === 'ADMIN' ? adminNav : managerNav;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-frame">
          <img src="/tneb_logo.png" alt="TNEB Logo" />
        </div>
        <div className="sidebar-logo-text">
          <h6>TNEB EEMS</h6>
          <small>Administration</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navigation.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={idx}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}

        <div className="nav-section-label">Account</div>
        <button onClick={logout} className="nav-item nav-item-logout border-0 bg-transparent text-start w-100">
          <i className="fa-solid fa-right-from-bracket"></i>
          <span className="nav-label">Sign Out</span>
        </button>
      </nav>

      <div className="sidebar-toggle">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-toggle-btn"
          title={collapsed ? 'Expand Menu' : 'Collapse Menu'}
        >
          <i className={`fa-solid ${collapsed ? 'fa-angle-right' : 'fa-angle-left'}`}></i>
        </button>
      </div>
    </aside>
  );
}
