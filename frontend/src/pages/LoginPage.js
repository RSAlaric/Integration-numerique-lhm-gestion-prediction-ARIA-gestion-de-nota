import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login }               = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const navigate                = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      toast.success(lang === 'fr' ? 'Bienvenue !' : 'Welcome!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  const modules = lang === 'fr'
    ? ['Personnel','Stock','Projets','BCC','Volontaires','Congés']
    : ['Staff','Stock','Projects','BCC','Volunteers','Leave'];

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Inter',sans-serif" }}>

      {/* ── PANEL GAUCHE ─────────────────────────────── */}
      <div style={{
        flex:'0 0 52%', minWidth:280,
        background:'linear-gradient(160deg,#091628 0%,#0f2044 45%,#163366 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'48px 40px', position:'relative', overflow:'hidden',
      }}>
        {/* Cercles déco */}
        {[
          {top:-80,right:-80,size:280,opacity:0.07},
          {bottom:-100,left:-60,size:320,opacity:0.04},
          {top:'38%',left:-40,size:120,opacity:0.06},
        ].map((c,i)=>(
          <div key={i} style={{ position:'absolute', top:c.top, right:c.right, bottom:c.bottom,
            left:c.left, width:c.size, height:c.size, borderRadius:'50%',
            background:`rgba(201,168,76,${c.opacity})`, pointerEvents:'none' }} />
        ))}

        <div style={{ maxWidth:420, width:'100%', position:'relative', zIndex:1 }}>
          {/* LOGO grand */}
          <div style={{ marginBottom:40, display:'flex', justifyContent:'center' }}>
            <img src="/logo-lhm.png" alt="LHM Madagascar"
              style={{ maxWidth:340, width:'100%', objectFit:'contain',
                filter:'drop-shadow(0 6px 24px rgba(0,0,0,0.5))' }} />
          </div>

          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', fontWeight:700,
            color:'white', marginBottom:12, lineHeight:1.25 }}>
            {t('systemTitle')}
          </h1>
          <p style={{ color:'rgba(255,255,255,0.7)', lineHeight:1.7, fontSize:'0.92rem', marginBottom:28 }}>
            {t('systemDesc')}
          </p>

          {/* Pills modules */}
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:32 }}>
            {modules.map(m=>(
              <span key={m} style={{ background:'rgba(201,168,76,0.18)', border:'1px solid rgba(201,168,76,0.4)',
                color:'#e0c06e', padding:'5px 13px', borderRadius:20,
                fontSize:'0.77rem', fontWeight:600, letterSpacing:'0.03em' }}>
                {m}
              </span>
            ))}
          </div>

          <div style={{ height:1, background:'rgba(255,255,255,0.1)', marginBottom:22 }} />
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1rem', opacity:.7 }}>✝</span>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.77rem', fontStyle:'italic' }}>
              Feon'ny Filazantsara — Lutheran Hour Ministries Madagascar
            </p>
          </div>
        </div>
      </div>

      {/* ── PANEL DROIT — Formulaire ──────────────────── */}
      <div style={{
        flex:1, minWidth:280, background:'white',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'48px 40px', position:'relative',
      }}>

        {/* Bouton langue */}
        <button onClick={toggleLang} style={{
          position:'absolute', top:22, right:24,
          background:'#f8faff', border:'1.5px solid #e5e7eb', borderRadius:9,
          padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:'0.8rem',
          color:'#0f2044', display:'flex', alignItems:'center', gap:6,
        }}>
          <span>{lang==='fr'?'🇫🇷':'🇬🇧'}</span>
          <span>{lang==='fr'?'FR':'EN'}</span>
          <span style={{ color:'#c9a84c', fontSize:'0.7rem', marginLeft:2 }}>
            → {lang==='fr'?'EN':'FR'}
          </span>
        </button>

        <div style={{ width:'100%', maxWidth:370 }}>

          {/* Logo petit au-dessus du form */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
            <img src="/logo-lhm-dark.png" alt="LHM Madagascar"
              style={{ maxWidth:230, objectFit:'contain' }} />
          </div>

          {/* Titre */}
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.65rem',
            color:'#0f2044', marginBottom:5, fontWeight:700 }}>
            {t('loginTitle')}
          </h2>
          <p style={{ color:'#9ca3af', fontSize:'0.86rem', marginBottom:26, lineHeight:1.5 }}>
            {t('loginSubtitle')}
          </p>

          {/* Erreur */}
          {error && (
            <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', color:'#991b1b',
              padding:'10px 14px', borderRadius:9, fontSize:'0.84rem',
              marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Email */}
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#4b5563',
                marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {t('emailLabel')}
              </label>
              <input type="email" value={form.email}
                onChange={e=>setForm({...form,email:e.target.value})}
                placeholder={lang==='fr'?'votre@email.org':'your@email.org'}
                required autoFocus
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb',
                  borderRadius:9, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#c9a84c'}
                onBlur={e=>e.target.style.borderColor='#e5e7eb'}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#4b5563',
                marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {t('passwordLabel')}
              </label>
              <div style={{ position:'relative' }}>
                <input type={showPwd?'text':'password'} value={form.password}
                  onChange={e=>setForm({...form,password:e.target.value})}
                  placeholder="••••••••" required
                  style={{ width:'100%', padding:'11px 44px 11px 14px', border:'1.5px solid #e5e7eb',
                    borderRadius:9, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }}
                  onFocus={e=>e.target.style.borderColor='#c9a84c'}
                  onBlur={e=>e.target.style.borderColor='#e5e7eb'}
                />
                <button type="button" onClick={()=>setShowPwd(!showPwd)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#9ca3af' }}>
                  {showPwd?'🙈':'👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                background: loading ? '#9ca3af' : 'linear-gradient(135deg,#0f2044,#1a3a6e)',
                color:'white', padding:'13px', borderRadius:10, fontWeight:700,
                fontSize:'0.95rem', border:'none', cursor:loading?'not-allowed':'pointer',
                marginTop:6, boxShadow: loading?'none':'0 4px 14px rgba(15,32,68,0.28)',
                transition:'all 0.2s', letterSpacing:'0.02em',
              }}>
              {loading ? `⏳ ${t('loggingIn')}` : `🔐 ${t('loginBtn')}`}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop:36, textAlign:'center', borderTop:'1px solid #f3f4f6', paddingTop:20 }}>
            <p style={{ fontSize:'0.71rem', color:'#d1d5db' }}>
              © {new Date().getFullYear()} Lutheran Hour Ministries Madagascar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
