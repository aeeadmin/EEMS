import { useState, useCallback, useEffect } from 'react';

function generateAlphanumericCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // Avoid confusing chars like O, 0, I, 1, l
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CaptchaWidget({ onValidate }) {
  const [code, setCode] = useState(generateAlphanumericCaptcha);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    const newCode = generateAlphanumericCaptcha();
    setCode(newCode);
    setInput('');
    setError('');
    onValidate(false);
  }, [onValidate]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (val === '') {
      setError('');
      onValidate(false);
      return;
    }
    if (val.toLowerCase() === code.toLowerCase()) {
      setError('');
      onValidate(true);
    } else {
      setError('Incorrect CAPTCHA code');
      onValidate(false);
    }
  };

  // Generate new code on mount
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <div className="captcha-box" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div 
            style={{ 
              background: 'linear-gradient(45deg, #1e293b, #0f172a)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#38bdf8',
              letterSpacing: '6px',
              textDecoration: 'line-through',
              fontStyle: 'italic',
              userSelect: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
              display: 'inline-block'
            }}
          >
            {code}
          </div>
          <button type="button" className="captcha-refresh" onClick={refresh} title="Refresh CAPTCHA" style={{ padding: '6px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <i className="fa-solid fa-rotate-right" style={{ fontSize: '16px' }}></i>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
          <input
            type="text"
            className="login-input"
            style={{ margin: 0, padding: '8px 12px', fontSize: '13px' }}
            placeholder="Enter CAPTCHA Code"
            value={input}
            onChange={handleChange}
          />
        </div>
      </div>
      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '-8px', marginBottom: '8px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 4 }}></i>{error}
        </div>
      )}
    </div>
  );
}
