import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CaptchaWidget from '../../components/common/CaptchaWidget';

export default function LandingPage() {
  const { loginAdmin, loginManager, error: authError } = useAuth();
  const navigate = useNavigate();

  // Admin login states
  const [adminUserId, setAdminUserId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminCaptchaValid, setIsAdminCaptchaValid] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Manager login states
  const [managerUserId, setManagerUserId] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [isManagerCaptchaValid, setIsManagerCaptchaValid] = useState(false);
  const [managerError, setManagerError] = useState('');

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminError('');

    if (!isAdminCaptchaValid) {
      setAdminError('Please solve the CAPTCHA correctly.');
      return;
    }

    try {
      const success = await loginAdmin(adminUserId, adminPassword);
      if (success) {
        navigate('/admin/dashboard');
      } else {
        setAdminError('Invalid Admin Credentials');
      }
    } catch (err) {
      setAdminError(err.response?.data?.message || 'Login failed. Please check network connection.');
    }
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    setManagerError('');

    if (!isManagerCaptchaValid) {
      setManagerError('Please solve the CAPTCHA correctly.');
      return;
    }

    try {
      const success = await loginManager(managerUserId, managerPassword);
      if (success) {
        navigate('/manager/dashboard');
      } else {
        setManagerError('Invalid Manager Credentials');
      }
    } catch (err) {
      setManagerError(err.response?.data?.message || 'Login failed. Please check network connection.');
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="logo-frame">
          <img src="/tneb_logo.png" alt="TNEB Logo" />
        </div>
        <div className="login-header-text">
          <h4>Tamil Nadu Electricity Board (TNEB)</h4>
          <p>Employee Email Management System (EEMS)</p>
        </div>
      </header>

      <main className="login-main">
        <div className="login-panels">
          {/* Admin Login Panel */}
          <div className="login-panel">
            <span className="login-role-icon">🛡️</span>
            <h5 className="login-panel-title">Administrator Portal</h5>
            <p className="login-panel-subtitle">Access controls, audit logging, approvals, and employee mapping management.</p>
            
            {adminError && (
              <div className="login-error">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminSubmit}>
              <input 
                type="text" 
                placeholder="Admin User ID (e.g. ADM001)" 
                className="login-input"
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="login-input"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />

              <CaptchaWidget onValidate={setIsAdminCaptchaValid} />

              <button type="submit" className="login-btn login-btn-admin">
                Sign In as Admin
              </button>
            </form>
          </div>

          {/* Manager Login Panel */}
          <div className="login-panel">
            <span className="login-role-icon">💼</span>
            <h5 className="login-panel-title">District Manager Portal</h5>
            <p className="login-panel-subtitle">Submit edit requests, view district employee details, and check request history.</p>

            {managerError && (
              <div className="login-error">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{managerError}</span>
              </div>
            )}

            <form onSubmit={handleManagerSubmit}>
              <input 
                type="text" 
                placeholder="Manager User ID (e.g. MGR001)" 
                className="login-input"
                value={managerUserId}
                onChange={(e) => setManagerUserId(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="login-input"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                required
              />

              <CaptchaWidget onValidate={setIsManagerCaptchaValid} />

              <button type="submit" className="login-btn login-btn-manager">
                Sign In as Manager
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="login-footer">
        Tamil Nadu Electricity Board © 2026 | Developed for TNEB/TANGEDCO/TANTRANSCO HRMS Administration. All Rights Reserved.
      </footer>
    </div>
  );
}
