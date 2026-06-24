import Layout from '../../components/layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Layout title="TNEB EEMS – System Settings">
      <div className="page-header">
        <div>
          <h4 className="page-title">Profile & Preferences</h4>
          <p className="page-subtitle">Manage UI preferences and view government ERP security privileges.</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">User Profile Details</h5>
            </div>
            <div className="card-body">
              <div className="profile-avatar mx-auto">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="profile-info-box mt-4">
                <div className="profile-info-row">
                  <label>Full Name:</label>
                  <span>{user?.name}</span>
                </div>
                <div className="profile-info-row">
                  <label>Unique ID:</label>
                  <span>{user?.unique_id}</span>
                </div>
                <div className="profile-info-row">
                  <label>Employee ID:</label>
                  <span>{user?.employee_id}</span>
                </div>
                <div className="profile-info-row">
                  <label>Assigned Role:</label>
                  <span className="badge badge-primary">{user?.role}</span>
                </div>
                <div className="profile-info-row">
                  <label>District Allocation:</label>
                  <span>{user?.district}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title">Portal Preferences</h5>
            </div>
            <div className="card-body">
              <div className="settings-section">
                <h5 className="form-label mb-3">Theme Selection</h5>
                <div 
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => theme !== 'light' && toggleTheme()}
                >
                  <div className="theme-preview light"></div>
                  <div>
                    <strong className="d-block">Light Theme</strong>
                    <small className="text-secondary">Standard light government ERP style interface.</small>
                  </div>
                </div>

                <div 
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                >
                  <div className="theme-preview dark"></div>
                  <div>
                    <strong className="d-block">Dark Theme</strong>
                    <small className="text-secondary">Dark background design for low-light office environments.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
