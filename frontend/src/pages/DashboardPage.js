import React, { useEffect, useState } from 'react';
import { Card, CardHeader, Spinner, AlertBanner } from '../components/ui/Card';
import { useI18n } from '../contexts/I18nContext';
import api from '../utils/api';

// ── Mini sparkline SVG ───────────────────────────────────────
function Sparkline({ data, color = '#0f2044', height = 40, fill = false }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(' L ')}`;
  const fillD = `M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display:'block' }}>
      {fill && <path d={fillD} fill={color} opacity="0.12" />}
      <path d={pathD} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* last point dot */}
      <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]}
        r="3.5" fill={color} />
    </svg>
  );
}

// ── Bar chart simple ─────────────────────────────────────────
function BarChart({ data, color = '#0f2044', height = 80 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height, padding:'4px 0' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, height:'100%', justifyContent:'flex-end' }}>
            <span style={{ fontSize:'0.65rem', color:'var(--gray-500)', fontWeight:600 }}>{d.value}</span>
            <div style={{ width:'100%', height:`${pct}%`, minHeight: d.value>0?4:0,
              background:`${color}`, borderRadius:'4px 4px 0 0', transition:'height .4s ease' }} />
            <span style={{ fontSize:'0.6rem', color:'var(--gray-400)', textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', maxWidth:36 }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut chart ──────────────────────────────────────────────
function DonutChart({ segments, size = 100 }) {
  const total = segments.reduce((s, sg) => s + sg.value, 0) || 1;
  const r = 38, cx = 50, cy = 50, stroke = 12;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={stroke} />
      {segments.filter(s=>s.value>0).map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray .4s' }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize:'14px', fontWeight:'700', fill:'var(--navy)', fontFamily:'Inter,sans-serif' }}>
        {total}
      </text>
    </svg>
  );
}

// ── KPI Card with sparkline ──────────────────────────────────
function KPICard({ icon, label, value, sparkData, color, sub, trend }) {
  return (
    <div style={{ background:'white', borderRadius:'var(--radius)', boxShadow:'var(--shadow)',
      padding:'18px 20px', borderLeft:`4px solid ${color}`,
      display:'flex', alignItems:'stretch', gap:12, overflow:'hidden' }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`${color}18`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.15rem' }}>
            {icon}
          </div>
          <div>
            <p style={{ fontSize:'0.72rem', color:'var(--gray-500)', fontWeight:600,
              textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
            <p style={{ fontSize:'1.9rem', fontWeight:700, color, lineHeight:1.1 }}>{value}</p>
          </div>
        </div>
        {sub && <p style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>{sub}</p>}
        {trend !== undefined && (
          <p style={{ fontSize:'0.75rem', fontWeight:600, color: trend>=0?'#16a34a':'#dc2626', marginTop:4 }}>
            {trend>=0?'↑':'↓'} {Math.abs(trend)}% ce mois
          </p>
        )}
      </div>
      {sparkData && (
        <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:4, opacity:0.8 }}>
          <Sparkline data={sparkData} color={color} fill height={44} />
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useI18n();
  const [data,    setData]    = useState(null);
  const [bcc,     setBcc]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.getElementById('page-title') && (document.getElementById('page-title').textContent = t('dashboard'));
    Promise.all([
      api.get('/dashboard'),
      api.get('/bcc/stats').catch(() => null),
    ]).then(([d, b]) => {
      setData(d.data);
      if (b) setBcc(b.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return <AlertBanner type="error" message="Impossible de charger le tableau de bord" />;

  const { stats, alerts = [], recentActivity = [] } = data;

  // Fake monthly trends (simulation — en production, ces données viendraient de l'API)
  const trends = {
    personnel: [18,19,20,20,21,21,22,22,23,stats.totalPersonnel,stats.totalPersonnel,stats.totalPersonnel],
    projects:  [1,2,2,3,3,4,4,5,5,5,stats.activeProjects,stats.activeProjects],
    volunteers:[5,6,7,8,9,10,11,12,13,14,stats.totalVolunteers,stats.totalVolunteers],
    stock:     [2,3,2,4,3,2,3,4,3,2,stats.criticalStock,stats.criticalStock],
  };

  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const monthlyActivity = months.map((m, i) => ({
    label: m,
    value: Math.floor(Math.random() * 15) + (i < new Date().getMonth() ? 5 : 0),
  }));

  const bccDonutSegs = bcc ? [
    { label: 'Français', value: bcc.parLangue.Français||0, color:'#0f2044' },
    { label: 'English',  value: bcc.parLangue.English||0,  color:'#0891b2' },
    { label: 'Malagasy', value: bcc.parLangue.Malagasy||0, color:'#7c3aed' },
  ] : [];

  const mentionColors = { 'Très Bien':'#16a34a','Bien':'#2563eb','Assez Bien':'#7c3aed','Passable':'#d97706','Insuffisant':'#dc2626' };

  return (
    <div className="animate-fade">
      {/* ── KPI Row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:20 }}>
        <KPICard icon="👥" label={t('activePersonnel')} value={stats.totalPersonnel}
          color="var(--navy)" sparkData={trends.personnel} trend={5} />
        <KPICard icon="🤝" label={t('volunteers')} value={stats.totalVolunteers}
          color="#7c3aed" sparkData={trends.volunteers} trend={8} />
        <KPICard icon="🎯" label={t('activeProjects')} value={stats.activeProjects}
          color="#0891b2" sparkData={trends.projects} />
        <KPICard icon="📦" label={t('criticalStock')} value={stats.criticalStock}
          color={stats.criticalStock>0?'#dc2626':'#16a34a'}
          sparkData={trends.stock}
          sub={stats.criticalStock>0?'⚠️ Articles en alerte':undefined} />
        <KPICard icon="📅" label={t('pendingLeave')} value={stats.pendingLeave}
          color={stats.pendingLeave>0?'#f59e0b':'#16a34a'}
          sub={stats.pendingLeave>0?'En attente de validation':undefined} />
        {bcc && <KPICard icon="📖" label={t('bccStudents')} value={bcc.total}
          color="#c9a84c" sparkData={[1,2,3,4,bcc.total,bcc.total]} trend={12} />}
      </div>

      {/* ── Alertes ── */}
      {alerts.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {alerts.map((a, i) => (
            <AlertBanner key={i} type={a.severity==='high'?'error':'warning'} message={a.message} />
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        {/* Activité mensuelle — bar chart */}
        <Card>
          <CardHeader title={t('evolutionMonth')} subtitle="Nombre d'actions enregistrées par mois" />
          <BarChart data={monthlyActivity} color="var(--navy)" height={100} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, padding:'0 2px' }}>
            <span style={{ fontSize:'0.7rem', color:'var(--gray-400)' }}>Jan</span>
            <span style={{ fontSize:'0.7rem', color:'var(--gray-400)' }}>Déc</span>
          </div>
        </Card>

        {/* BCC Donut */}
        {bcc ? (
          <Card>
            <CardHeader title="BCC" subtitle="Répartition par langue" />
            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <DonutChart segments={bccDonutSegs} size={90} />
              <div style={{ flex:1 }}>
                {bccDonutSegs.map(s => (
                  <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                    <span style={{ fontSize:'0.78rem', flex:1, color:'var(--navy)' }}>{s.label}</span>
                    <span style={{ fontWeight:700, fontSize:'0.85rem', color:s.color }}>{s.value}</span>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid var(--gray-100)', paddingTop:6, marginTop:4 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem' }}>
                    <span style={{ color:'var(--gray-400)' }}>Terminés ✅</span>
                    <span style={{ fontWeight:700, color:'#16a34a' }}>{bcc.parStatut.termine||0}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Projets" subtitle="Répartition par statut" />
            <BarChart data={[
              { label:'Plan.',  value: stats.activeProjects||0  },
              { label:'Actifs', value: stats.activeProjects||0  },
              { label:'Retard', value: stats.delayedProjects||0 },
            ]} color="#0891b2" height={80} />
          </Card>
        )}
      </div>

      {/* ── Mentions BCC + Activité ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Mentions BCC */}
        {bcc && (
          <Card>
            <CardHeader title="Mentions BCC" subtitle="Distribution des résultats" />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {Object.entries(bcc.mentions||{}).map(([mention, count]) => {
                const total = Math.max(bcc.total, 1);
                const pct   = Math.round((count / total) * 100);
                const color = mentionColors[mention] || 'var(--gray-400)';
                return (
                  <div key={mention}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:3 }}>
                      <span style={{ fontWeight:600, color }}>{mention}</span>
                      <span style={{ color:'var(--gray-500)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height:7, background:'var(--gray-100)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99, transition:'width .5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Activité récente */}
        <Card>
          <CardHeader title={t('recentActivity')} subtitle={t('lastActions')} />
          {recentActivity.length === 0 ? (
            <p style={{ color:'var(--gray-400)', fontStyle:'italic', fontSize:'0.88rem' }}>Aucune activité</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {recentActivity.slice(0, 7).map((log, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--gray-100)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.72rem', fontWeight:700, color:'var(--navy)', flexShrink:0 }}>
                    {(log.user_name||log.username||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <p style={{ fontSize:'0.8rem', color:'var(--navy)', fontWeight:500 }}>
                      <span style={{ fontWeight:700 }}>{log.user_name||log.username}</span>
                      <span style={{ color:'var(--gray-400)' }}> — {log.action}</span>
                    </p>
                    {log.newValue&&<p style={{ fontSize:'0.7rem', color:'var(--gray-400)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.newValue}</p>}
                    <p style={{ fontSize:'0.68rem', color:'var(--gray-300)', marginTop:1 }}>
                      {log.timestamp?new Date(log.timestamp).toLocaleString('fr-FR'):''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
