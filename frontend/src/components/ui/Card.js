import React from 'react';

export const Card = ({ children, style = {}, className = '' }) => (
  <div className={`card ${className}`} style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '24px', ...style }}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--navy)', marginBottom: 2 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 2 }}>{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const KPICard = ({ icon, label, value, sub, color = 'var(--navy)', trend }) => (
  <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${color}` }}>
    <div style={{ width: 50, height: 50, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '1.8rem', fontWeight: 700, color: color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>{sub}</p>}
    </div>
    {trend !== undefined && <div style={{ fontSize: '0.8rem', color: trend > 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 600 }}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</div>}
  </div>
);

export const Badge = ({ children, type = 'default' }) => {
  const styles = {
    default: { bg: 'var(--gray-100)', color: 'var(--gray-600)' },
    success: { bg: '#dcfce7', color: '#166534' },
    warning: { bg: '#fef9c3', color: '#854d0e' },
    error:   { bg: '#fee2e2', color: '#991b1b' },
    info:    { bg: '#dbeafe', color: '#1e40af' },
    gold:    { bg: 'rgba(201,168,76,0.15)', color: 'var(--gold-dark)' },
  };
  const s = styles[type] || styles.default;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
};

export const Btn = ({ children, variant = 'primary', onClick, type = 'button', disabled = false, size = 'md', style = {}, title }) => {
  const variants = {
    primary:   { bg: 'var(--navy)',    color: 'white', border: 'none' },
    secondary: { bg: 'white',         color: 'var(--navy)', border: '1.5px solid var(--gray-200)' },
    gold:      { bg: 'var(--gold)',    color: 'white', border: 'none' },
    danger:    { bg: 'var(--red)',     color: 'white', border: 'none' },
    success:   { bg: 'var(--emerald)', color: 'white', border: 'none' },
    ghost:     { bg: 'transparent',   color: 'var(--navy)', border: 'none' },
  };
  const sizes = {
    sm: { padding: '5px 12px', fontSize: '0.78rem' },
    md: { padding: '10px 20px', fontSize: '0.88rem' },
    lg: { padding: '13px 28px', fontSize: '0.95rem' },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      style={{ background: v.bg, color: v.color, border: v.border, borderRadius: 9, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', transition: 'all 0.15s',
        ...s, ...style }}>
      {children}
    </button>
  );
};

export const Table = ({ columns, data, emptyMessage = 'Aucune donnée' }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
      <thead>
        <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
          {columns.map((col, i) => (
            <th key={i} style={{ padding: '11px 16px', textAlign: col.align || 'left', color: 'var(--gray-600)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)', fontStyle: 'italic' }}>{emptyMessage}</td></tr>
        ) : data.map((row, i) => (
          <tr key={row.id || i} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {columns.map((col, j) => (
              <td key={j} style={{ padding: '13px 16px', color: 'var(--navy)' }}>
                {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Modal = ({ open, onClose, title, children, width = 600 }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,32,68,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="animate-fade" style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: width, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(15,32,68,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--gray-200)', flexShrink: 0 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--navy)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', fontSize: '1.3rem', color: 'var(--gray-400)', lineHeight: 1, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
};

export const FormRow = ({ children, cols = 2 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '14px 20px', marginBottom: 16 }}>
    {children}
  </div>
);

export const FormField = ({ label, children, required }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
);

export const SearchBar = ({ value, onChange, placeholder = 'Rechercher...' }) => (
  <div style={{ position: 'relative' }}>
    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: '0.9rem' }}>🔍</span>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ paddingLeft: 36, width: '100%' }} />
  </div>
);

export const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
    <div style={{ width: 36, height: 36, border: '3px solid var(--gray-200)', borderTop: '3px solid var(--navy)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

export const AlertBanner = ({ type = 'info', message }) => {
  const styles = {
    error:   { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b', icon: '🔴' },
    warning: { bg: '#fef9c3', border: '#fde68a', color: '#854d0e', icon: '⚠️' },
    info:    { bg: '#dbeafe', border: '#93c5fd', color: '#1e40af', icon: 'ℹ️' },
    success: { bg: '#dcfce7', border: '#86efac', color: '#166534', icon: '✅' },
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, color: s.color, fontSize: '0.85rem' }}>
      <span>{s.icon}</span><span>{message}</span>
    </div>
  );
};
