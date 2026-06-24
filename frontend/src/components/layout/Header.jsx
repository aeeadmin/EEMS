import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useTheme } from '../../context/ThemeContext';
import NotificationDropdown from '../notifications/NotificationDropdown';

export default function Header({ title }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead } = useSocket();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const notifRef = useRef();
  const userRef = useRef();

  // Close menus on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!user) return null;

  return (
    <header className="header">
      <div className="header-title">
        <span>{title || 'Tamil Nadu Electricity Board (TNEB) – EEMS'}</span>
      </div>

      <div className="header-actions">
        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
          <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
        </button>

        {/* Notification Bell */}
        <div className="notification-wrapper" ref={notifRef}>
          <button onClick={() => setShowNotif(!showNotif)} className="notification-btn">
            <i className="fa-solid fa-bell"></i>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          {showNotif && (
            <NotificationDropdown 
              notifications={notifications} 
              unreadCount={unreadCount}
              markAllRead={markAllRead}
              onClose={() => setShowNotif(false)} 
            />
          )}
        </div>

        {/* User Profile Menu */}
        <div className="user-menu" ref={userRef} onClick={() => setShowUserMenu(!showUserMenu)}>
          <div className="user-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info d-none d-md-block">
            <div className="name">{user.name}</div>
            <div className="role-badge">
              {user.is_view_admin === 1 || user.is_view_admin === true ? 'READ-ONLY ADMIN' : user.role}
            </div>
          </div>
          <i className="fa-solid fa-caret-down text-secondary ms-1"></i>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="px-3 py-2 border-bottom">
                <div className="fw-bold text-truncate" style={{ fontSize: '13px' }}>{user.name}</div>
                <small className="text-muted text-truncate d-block">{user.email || user.unique_id}</small>
              </div>
              <button 
                onClick={logout} 
                className="user-dropdown-item danger text-danger border-0 bg-transparent text-start w-100 mt-1"
              >
                <i className="fa-solid fa-right-from-bracket me-2"></i>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
