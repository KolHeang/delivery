interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  change?: string;
  changeType?: 'up' | 'down';
}

export default function StatsCard({ icon, label, value, color, bg, change, changeType }: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="stats-card-icon" style={{ background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {typeof icon === 'string' && icon.startsWith('/') ? (
          <img src={icon} alt={label} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
        ) : (
          icon
        )}
      </div>
      <div className="stats-card-info">
        <div className="stats-card-value" style={{ color }}>{value}</div>
        <div className="stats-card-label">{label}</div>
        {change && (
          <div className={`stats-card-change ${changeType === 'down' ? 'change-down' : 'change-up'}`}>
            {changeType === 'up' ? '↑' : '↓'} {change}
          </div>
        )}
      </div>
    </div>
  );
}
