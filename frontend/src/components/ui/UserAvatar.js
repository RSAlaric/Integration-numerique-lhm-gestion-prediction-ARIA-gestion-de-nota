import React, { useRef } from 'react';
import toast from 'react-hot-toast';

const COLORS = [
  ['#0f2044','#1a3a6e'],['#7c3aed','#5b21b6'],['#0891b2','#0e7490'],
  ['#16a34a','#15803d'],['#c9a84c','#a8883a'],['#dc2626','#b91c1c'],
];

function getColor(name='') {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
}

export function UserAvatar({ user, size=40, onClick, editable=false, onPhotoChange }) {
  const ref = useRef();
  const [c1, c2] = getColor(user?.name || user?.username || '?');
  const initials = (user?.name || user?.username || '?')
    .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error('Photo max 2 Mo'); return; }
    const r = new FileReader();
    r.onload = ev => onPhotoChange?.(ev.target.result);
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const fontSize = size <= 32 ? '0.6rem' : size <= 48 ? '0.75rem' : size <= 64 ? '0.9rem' : '1.1rem';

  return (
    <div
      onClick={editable ? () => ref.current?.click() : onClick}
      style={{
        width: size, height: size, minWidth: size,
        borderRadius: '50%', overflow: 'hidden',
        background: `linear-gradient(135deg,${c1},${c2})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: editable ? 'pointer' : (onClick ? 'pointer' : 'default'),
        position: 'relative', flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
      title={editable ? 'Cliquer pour changer la photo' : (user?.name || user?.username)}
    >
      {user?.photo ? (
        <img src={user.photo} alt={user.name || user.username}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: 'white', fontWeight: 700, fontSize, fontFamily: 'Inter,sans-serif', letterSpacing: '0.03em' }}>
          {initials}
        </span>
      )}
      {editable && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}>
          <span style={{ fontSize: size > 50 ? '1.2rem' : '0.9rem' }}>📷</span>
        </div>
      )}
      {editable && <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />}
    </div>
  );
}

export default UserAvatar;
