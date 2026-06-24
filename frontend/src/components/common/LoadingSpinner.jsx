export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-overlay" style={{ flexDirection: 'column', gap: 16 }}>
      <div className="spinner-ring"></div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{message}</p>
    </div>
  );
}
