import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CaptchaWidget from '../../components/common/CaptchaWidget';
import { forgotPasswordRequest, forgotPasswordVerifyOtp, forgotPasswordReset } from '../../services/api';

export default function ManagerLogin() {
  const { loginManager } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forgot Password Workflow States
  const [mode, setMode] = useState('login'); // 'login', 'forgot-email', 'forgot-otp', 'forgot-reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isCaptchaValid) {
      setError('Please solve the CAPTCHA correctly.');
      return;
    }

    setSubmitting(true);
    try {
      const success = await loginManager(userId, password);
      if (success) {
        navigate('/manager/dashboard');
      } else {
        setError('Invalid Manager Credentials');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');
    setSubmitting(true);
    try {
      const res = await forgotPasswordRequest(forgotEmail);
      setInfoMessage(res.data.message);
      setMode('forgot-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request OTP. Please verify your email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setSubmitting(true);
    try {
      await forgotPasswordVerifyOtp(forgotEmail, otp);
      setInfoMessage('OTP verified successfully. Please choose a new password.');
      setMode('forgot-reset');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await forgotPasswordReset(forgotEmail, newPassword, confirmPassword);
      setInfoMessage('Password has been reset successfully! You can now log in.');
      setUserId('');
      setPassword('');
      setMode('login');
      setForgotEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
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
        <div style={{ maxWidth: '440px', width: '100%' }}>
          <div className="login-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <Link to="/" style={{ color: '#6aadec', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Back to Choice
              </Link>
              <span className="login-role-icon" style={{ fontSize: '28px' }}>💼</span>
            </div>
            
            <h5 className="login-panel-title">Manager Sign In</h5>
            <p className="login-panel-subtitle">Access your district employee listings and request logs.</p>
            
            {error && (
              <div className="login-error" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-check"></i>
                <span>{infoMessage}</span>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleSubmit}>
                <input 
                  type="text" 
                  placeholder="Manager User ID (e.g. MGR001)" 
                  className="login-input"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  disabled={submitting}
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />

                <CaptchaWidget onValidate={setIsCaptchaValid} />

                <button 
                  type="submit" 
                  className="login-btn login-btn-manager"
                  disabled={submitting}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Signing In...
                    </>
                  ) : 'Sign In as Manager'}
                </button>

                <div style={{ textAlign: 'right', marginTop: '14px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setMode('forgot-email'); setError(''); setInfoMessage(''); }} 
                    style={{ background: 'none', border: 'none', color: '#6aadec', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot-email' && (
              <form onSubmit={handleRequestOtp}>
                <h6 style={{ color: '#fff', marginBottom: '12px', fontSize: '14px' }}>Reset Password Request</h6>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '16px', lineHeight: '1.4' }}>
                  Enter your registered email address. We will verify and send a one-time password (OTP).
                </p>
                <input 
                  type="email" 
                  placeholder="Enter Registered Email" 
                  className="login-input"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
                <button 
                  type="submit" 
                  className="login-btn login-btn-manager"
                  disabled={submitting}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Requesting OTP...
                    </>
                  ) : 'Send OTP'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setMode('login'); setError(''); setInfoMessage(''); }}
                    style={{ color: '#6aadec', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot-otp' && (
              <form onSubmit={handleVerifyOtp}>
                <h6 style={{ color: '#fff', marginBottom: '12px', fontSize: '14px' }}>Verify One-Time Password (OTP)</h6>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '16px', lineHeight: '1.4' }}>
                  Enter the 6-digit OTP code sent to your email <strong>{forgotEmail}</strong>.
                </p>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="Enter 6-Digit OTP" 
                  className="login-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={submitting}
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }}
                />
                <button 
                  type="submit" 
                  className="login-btn login-btn-manager"
                  disabled={submitting}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Verifying...
                    </>
                  ) : 'Verify OTP'}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={handleRequestOtp}
                    disabled={submitting}
                    style={{ color: '#6aadec', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Resend OTP
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setMode('forgot-email'); setError(''); setInfoMessage(''); }}
                    style={{ color: '#6aadec', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot-reset' && (
              <form onSubmit={handleResetPassword}>
                <h6 style={{ color: '#fff', marginBottom: '12px', fontSize: '14px' }}>Create New Password</h6>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '16px', lineHeight: '1.4' }}>
                  Enter your new login password. Passwords must match.
                </p>
                <input 
                  type="password" 
                  placeholder="New Password" 
                  className="login-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
                <input 
                  type="password" 
                  placeholder="Confirm New Password" 
                  className="login-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
                <button 
                  type="submit" 
                  className="login-btn login-btn-manager"
                  disabled={submitting}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Updating Password...
                    </>
                  ) : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="login-footer">
        Tamil Nadu Electricity Board © 2026 | Developed for TNEB/TANGEDCO/TANTRANSCO HRMS Administration. All Rights Reserved.
      </footer>
    </div>
  );
}
