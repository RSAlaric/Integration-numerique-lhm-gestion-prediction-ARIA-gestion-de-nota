import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { UserAvatar } from '../ui/UserAvatar';
import './Layout.css';

const ROLE_LABELS = {
  super_admin:'Administrateur Système', admin:'Administrateur', direction:'Direction',
  assistant_admin:'Assistant Administration', rh:'Ressources Humaines',
  responsable_stock:'Responsable Stock', responsable_volontaires:'Responsable Volontaires',
  responsable_bcc:'Responsable BCC', coordinateur:'Coordinateur', utilisateur:'Utilisateur',
};

const ADMIN_ROLES    = ['super_admin','admin'];
const PERSONNEL_ROLES= ['super_admin','admin','assistant_admin','rh','direction'];
const STOCK_ROLES    = ['super_admin','admin','responsable_stock','direction'];
const VOL_ROLES      = ['super_admin','admin','responsable_volontaires','direction'];

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const navigate = useNavigate();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu,   setUserMenu]   = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const can = (roles) => {
    if (!user) return false;
    const r = user.role || '';
    if (r==='admin'||r==='super_admin') return true;
    return roles.includes(r);
  };

  return (
    <div className={`layout ${collapsed?'sidebar-collapsed':''} ${mobileOpen?'mobile-open':''}`}>
      {mobileOpen && <div className="overlay" onClick={()=>setMobileOpen(false)}/>}
      {userMenu && <div style={{position:'fixed',inset:0,zIndex:199}} onClick={()=>setUserMenu(false)}/>}

      {/* ── SIDEBAR ─── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <img src="/logo-lhm.png" alt="LHM"
              className={collapsed?'logo-collapsed':'logo-full'}
              onError={e=>{e.target.style.display='none';}} />
          </div>
          <button className="collapse-btn" onClick={()=>setCollapsed(!collapsed)}>
            {collapsed?'›':'‹'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard */}
          <NavLink to="/" end className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?t('dashboard'):''}>
            <span className="nav-icon">📊</span>{!collapsed&&<span className="nav-label">{t('dashboard')}</span>}
          </NavLink>

          {can(PERSONNEL_ROLES)&&<NavLink to="/personnel" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?t('personnel'):''}>
            <span className="nav-icon">👥</span>{!collapsed&&<span className="nav-label">{t('personnel')}</span>}
          </NavLink>}

          {can(PERSONNEL_ROLES)&&<NavLink to="/absences" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?t('absences'):''}>
            <span className="nav-icon">📅</span>{!collapsed&&<span className="nav-label">{t('absences')}</span>}
          </NavLink>}

          {can(VOL_ROLES)&&<NavLink to="/volontaires" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?t('volunteers'):''}>
            <span className="nav-icon">🤝</span>{!collapsed&&<span className="nav-label">{t('volunteers')}</span>}
          </NavLink>}

          {can(STOCK_ROLES)&&<NavLink to="/stock" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?t('stock'):''}>
            <span className="nav-icon">📦</span>{!collapsed&&<span className="nav-label">{t('stock')}</span>}
          </NavLink>}

          <NavLink to="/projets" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?t('projects'):''}>
            <span className="nav-icon">🎯</span>{!collapsed&&<span className="nav-label">{t('projects')}</span>}
          </NavLink>

          <div className="nav-separator"/>

          <NavLink to="/bcc" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?'BCC':''}>
            <span className="nav-icon">📖</span>{!collapsed&&<span className="nav-label">BCC</span>}
          </NavLink>

          {/* IA */}
          <NavLink to="/ia" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?'ARIA — IA':''}>
            <span className="nav-icon">🤖</span>
            {!collapsed&&(
              <span className="nav-label" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flex:1}}>
                ARIA — IA
                <span style={{background:'linear-gradient(135deg,#c9a84c,#e0c06e)',color:'#0f2044',fontSize:'0.6rem',
                  padding:'1px 5px',borderRadius:6,fontWeight:800,letterSpacing:'0.05em'}}>NEW</span>
              </span>
            )}
          </NavLink>

          <div className="nav-separator"/>

          {can(ADMIN_ROLES)&&<NavLink to="/utilisateurs" className={({isActive})=>`nav-item${isActive?' active':''}`} onClick={()=>setMobileOpen(false)} title={collapsed?t('users'):''}>
            <span className="nav-icon">🔐</span>{!collapsed&&<span className="nav-label">{t('users')}</span>}
          </NavLink>}
        </nav>

        <div className="sidebar-footer">
          {!collapsed&&(
            <div className="user-info" style={{cursor:'pointer'}} onClick={()=>navigate('/profil')}>
              <UserAvatar user={user} size={36}/>
              <div className="user-details">
                <span className="user-name">{user?.name||user?.username}</span>
                <span className="user-role">{ROLE_LABELS[user?.role]||user?.role}</span>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title={t('logout')}>
            <span>🚪</span>{!collapsed&&<span>{t('logout')}</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ─── */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={()=>setMobileOpen(!mobileOpen)}>☰</button>
          <div className="topbar-left">
            <img src="/logo-lhm-dark.png" alt="LHM" className="topbar-logo" onError={e=>e.target.style.display='none'}/>
            <h1 className="page-title" id="page-title">LHM Madagascar</h1>
          </div>
          <div className="topbar-right">
            {/* Bouton langue */}
            <button onClick={toggleLang} style={{background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:8,
              padding:'6px 13px',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',color:'#0f2044',
              display:'flex',alignItems:'center',gap:5}}>
              <span>{lang==='fr'?'🇫🇷':'🇬🇧'}</span>
              <span>{lang==='fr'?'FR':'EN'}</span>
            </button>

            {/* Avatar + menu utilisateur */}
            <div style={{position:'relative'}}>
              <div style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',padding:'4px 8px',
                borderRadius:10,border:'1px solid transparent',transition:'all 0.15s'}}
                onClick={()=>setUserMenu(!userMenu)}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#e5e7eb'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
                <UserAvatar user={user} size={34}/>
                <div style={{lineHeight:1.2}}>
                  <p style={{fontSize:'0.82rem',fontWeight:600,color:'#0f2044'}}>{user?.name||user?.username}</p>
                  <p style={{fontSize:'0.68rem',color:'#9ca3af'}}>{ROLE_LABELS[user?.role]||user?.role}</p>
                </div>
                <span style={{fontSize:'0.7rem',color:'#9ca3af',marginLeft:2}}>▾</span>
              </div>

              {/* Dropdown */}
              {userMenu&&(
                <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:'white',
                  borderRadius:12,boxShadow:'0 8px 32px rgba(15,32,68,0.15)',border:'1px solid #e5e7eb',
                  minWidth:200,zIndex:200,overflow:'hidden'}}>
                  <div style={{padding:'14px 16px',borderBottom:'1px solid #f3f4f6',background:'#f8faff'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <UserAvatar user={user} size={40}/>
                      <div>
                        <p style={{fontWeight:700,fontSize:'0.85rem',color:'#0f2044'}}>{user?.name||user?.username}</p>
                        <p style={{fontSize:'0.72rem',color:'#9ca3af'}}>{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  {[
                    {icon:'👤',label:'Mon profil',  action:()=>{navigate('/profil');setUserMenu(false);}},
                    {icon:'🤖',label:'ARIA — IA',   action:()=>{navigate('/ia');setUserMenu(false);}},
                    {sep:true},
                    {icon:'🚪',label:'Déconnexion', action:handleLogout, danger:true},
                  ].map((item,i)=>
                    item.sep ? <div key={i} style={{height:1,background:'#f3f4f6'}}/> : (
                      <button key={i} onClick={item.action}
                        style={{width:'100%',padding:'10px 16px',border:'none',background:'transparent',
                          cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10,
                          fontSize:'0.85rem',fontWeight:500,color:item.danger?'#dc2626':'#0f2044'}}
                        onMouseEnter={e=>e.currentTarget.style.background=item.danger?'#fef2f2':'#f8faff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span>{item.icon}</span>{item.label}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content"><Outlet/></main>
      </div>
    </div>
  );
}
