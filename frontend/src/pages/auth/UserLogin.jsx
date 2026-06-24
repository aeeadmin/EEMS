import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CaptchaWidget from '../../components/common/CaptchaWidget';

export default function UserLogin() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isCaptchaValid) {
      setError('Please solve the CAPTCHA correctly.');
      return;
    }

    setSubmitting(true);
    try {
      const success = await loginUser(userId);
      if (success) {
        navigate('/user/dashboard');
      } else {
        setError('Employee profile not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Check failed. Please check network connection.');
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
              <span className="login-role-icon" style={{ fontSize: '28px' }}>👤</span>
            </div>
            
            <h5 className="login-panel-title">Employee Details Check</h5>
            <p className="login-panel-subtitle">Access and view your designated email mapping and profile details without password.</p>
            
            {error && (
              <div className="login-error" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input 
                type="text" 
                placeholder="Employee ID / Position ID / Designation Email" 
                className="login-input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={submitting}
              />

              <CaptchaWidget onValidate={setIsCaptchaValid} />

              <button 
                type="submit" 
                className="login-btn"
                disabled={submitting}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#4a90d9', color: '#fff' }}
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Checking...
                  </>
                ) : 'Check My Details'}
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
