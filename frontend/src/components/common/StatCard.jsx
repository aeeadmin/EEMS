export default function StatCard({ icon, iconClass, color, value, label, title, trend }) {
  const displayLabel = label || title;
  const displayIconClass = iconClass || color || 'blue';
  const displayIcon = icon && (icon.includes('fa-solid') || icon.includes('fa-regular') || icon.includes('fa-brands')) 
    ? icon 
    : `fa-solid ${icon || ''}`;

  return (
    <div className="stat-card">
      <div className={`stat-icon ${displayIconClass}`}>
        <i className={displayIcon}></i>
      </div>
      <div className="stat-info">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{displayLabel}</div>
        {trend && (
          <div style={{ fontSize: 11, marginTop: 6, color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}>
            <i className={`fa-solid fa-arrow-${trend > 0 ? 'up' : 'down'}`} style={{ marginRight: 4 }}></i>
            {Math.abs(trend)}% from last month
          </div>
        )}
      </div>
    </div>
  );
}
