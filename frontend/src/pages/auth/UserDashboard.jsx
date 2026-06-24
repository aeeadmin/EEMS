import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="login-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="login-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="d-flex align-items-center gap-3">
          <div className="logo-frame" style={{ width: '90px', height: '90px' }}>
            <img src="/tneb_logo.png" alt="TNEB Logo" />
          </div>
          <div className="login-header-text">
            <h4 style={{ fontSize: '16px', margin: 0 }}>Tamil Nadu Electricity Board (TNEB)</h4>
            <p style={{ fontSize: '11px', margin: 0 }}>Employee Profile View Portal</p>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          className="btn-outline-custom"
          style={{
            color: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.4)',
            background: 'rgba(255,255,255,0.05)',
            padding: '6px 16px',
            fontSize: '13px',
            borderRadius: '6px'
          }}
        >
          <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '6px' }}></i> Sign Out
        </button>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: '650px', width: '100%', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div 
              style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                background: '#4a90d9', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#fff', 
                fontSize: '28px', 
                fontWeight: '700',
                marginBottom: '16px',
                boxShadow: '0 4px 12px rgba(74,144,217,0.3)'
              }}
            >
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <h3 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', margin: 0 }}>{user.name}</h3>
            <span style={{ color: '#6aadec', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>
              {user.designation || 'EMPLOYEE'}
            </span>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Employee ID
                </label>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>{user.employee_id}</span>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Position ID
                </label>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>{user.position_id}</span>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Designation Email
                </label>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '500', wordBreak: 'break-all' }}>{user.designation_email || 'N/A'}</span>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Name Based Email
                </label>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '500', wordBreak: 'break-all' }}>{user.name_based_email || 'N/A'}</span>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Phone Number
                </label>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>{user.phone_number || 'N/A'}</span>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  District Jurisdiction
                </label>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>{user.district}</span>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Date of Birth
                </label>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>
                  {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', textAlign: 'center', background: 'rgba(74, 144, 217, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(74, 144, 217, 0.2)' }}>
            <span style={{ color: '#6aadec', fontSize: '12.5px', fontWeight: '500' }}>
              <i className="fa-solid fa-lock" style={{ marginRight: '6px' }}></i> Read-only Access. Modifications require District Manager approval.
            </span>
          </div>
        </div>
      </main>

      <footer className="login-footer">
        Tamil Nadu Electricity Board © 2026 | Developed for TNEB/TANGEDCO/TANTRANSCO HRMS Administration. All Rights Reserved.
      </footer>
    </div>
  );
}
