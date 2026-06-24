import { useNavigate } from 'react-router-dom';

export default function PortalChoice() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      {/* Top Left User Icon */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        <button 
          onClick={() => navigate('/user/login')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <i className="fa-solid fa-circle-user" style={{ fontSize: '16px', color: '#6aadec' }}></i>
          User
        </button>
      </div>

      <header className="login-header" style={{ paddingLeft: '140px' }}>
        <div className="logo-frame">
          <img src="/tneb_logo.png" alt="TNEB Logo" />
        </div>
        <div className="login-header-text">
          <h4>Tamil Nadu Electricity Board (TNEB)</h4>
          <p>Employee Email Management System (EEMS)</p>
        </div>
      </header>

      <main className="login-main" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: '#fff', fontWeight: '800', fontSize: '28px', textAlign: 'center', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          Welcome to Email Administration Portal
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', marginBottom: '32px', textAlign: 'center', maxWidth: '600px' }}>
          Select the appropriate portal option below to verify, update, and manage designated email mapping and employee profile records.
        </p>

        <div className="login-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', maxWidth: '800px', width: '100%' }}>
          {/* Admin Choice Panel */}
          <div 
            className="login-panel" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center', 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s'
            }}
            onClick={() => navigate('/admin/login')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span className="login-role-icon" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>🛡️</span>
            <h5 className="login-panel-title" style={{ fontSize: '20px', marginBottom: '10px' }}>Administrator Portal</h5>
            <p className="login-panel-subtitle" style={{ fontSize: '13.5px', marginBottom: '24px', flexGrow: 1 }}>
              Access controls, audit logging, management approvals, and overall employee record mapping.
            </p>
            <button 
              className="login-btn login-btn-admin" 
              style={{ width: 'auto', padding: '10px 24px', pointerEvents: 'none' }}
            >
              Enter Admin Portal
            </button>
          </div>

          {/* Manager Choice Panel */}
          <div 
            className="login-panel" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center', 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s'
            }}
            onClick={() => navigate('/manager/login')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span className="login-role-icon" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>💼</span>
            <h5 className="login-panel-title" style={{ fontSize: '20px', marginBottom: '10px' }}>District Manager Portal</h5>
            <p className="login-panel-subtitle" style={{ fontSize: '13.5px', marginBottom: '24px', flexGrow: 1 }}>
              Submit email edit requests, track status logs, and view your district's engineering profiles.
            </p>
            <button 
              className="login-btn login-btn-manager" 
              style={{ width: 'auto', padding: '10px 24px', pointerEvents: 'none' }}
            >
              Enter Manager Portal
            </button>
          </div>
        </div>
      </main>

      <footer className="login-footer">
        Tamil Nadu Electricity Board © 2026 | Developed for TNEB/TANGEDCO/TANTRANSCO HRMS Administration. All Rights Reserved.
      </footer>
    </div>
  );
}
