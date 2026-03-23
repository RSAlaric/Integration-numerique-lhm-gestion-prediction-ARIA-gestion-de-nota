import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, Btn } from '../components/ui/Card';
import api from '../utils/api';

// ══════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════
const SUGGESTIONS = [
  { icon:'📊', text:'Analyser les performances BCC',    prompt:'Analyse les performances générales des étudiants BCC et identifie les tendances importantes.' },
  { icon:'🔮', text:'Prédire les risques d\'abandon',   prompt:'Quels étudiants BCC sont à risque d\'abandon ou d\'échec ? Base-toi sur les données disponibles.' },
  { icon:'📦', text:'Optimiser le stock',               prompt:'Analyse l\'état du stock et donne des recommandations pour éviter les ruptures critiques.' },
  { icon:'👥', text:'Analyse du personnel',             prompt:'Donne un aperçu de la gestion du personnel : absences, contrats, points d\'attention.' },
  { icon:'🎯', text:'Évaluer les projets',              prompt:'Évalue l\'avancement des projets et identifie les risques potentiels de retard.' },
  { icon:'📅', text:'Prédire les pics d\'absence',      prompt:'Sur la base des tendances, quelles périodes présentent des risques de congés élevés ?' },
];

function buildContext(dash, bcc) {
  const parts = [];
  if (dash?.stats) {
    const s = dash.stats;
    parts.push(`SYSTÈME LHM MADAGASCAR:\n- Personnel actif: ${s.totalPersonnel}\n- Volontaires: ${s.totalVolunteers}\n- Projets actifs: ${s.activeProjects}, en retard: ${s.delayedProjects||0}\n- Stock critique: ${s.criticalStock} articles\n- Congés en attente: ${s.pendingLeave}`);
  }
  if (bcc) {
    parts.push(`\nBCC:\n- Total étudiants: ${bcc.total}\n- Français: ${bcc.parLangue?.Français||0}, English: ${bcc.parLangue?.English||0}, Malagasy: ${bcc.parLangue?.Malagasy||0}\n- Actifs: ${bcc.parStatut?.actif||0}, Terminés: ${bcc.parStatut?.termine||0}\n- Mentions: Très Bien=${bcc.mentions?.['Très Bien']||0}, Insuffisant=${bcc.mentions?.['Insuffisant']||0}`);
  }
  return parts.join('\n') || 'Données non disponibles';
}

// ── Composants UI ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', padding:'12px 16px' }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#c9a84c',
          animation:'bcc-bounce 1.2s ease infinite', animationDelay:`${i*0.2}s` }}/>
      ))}
      <style>{`@keyframes bcc-bounce{0%,80%,100%{transform:scale(0.4);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

function MsgBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display:'flex', justifyContent:isUser?'flex-end':'flex-start', marginBottom:14, gap:10 }}>
      {!isUser && (
        <div style={{ width:34,height:34,borderRadius:'50%',flexShrink:0,
          background:'linear-gradient(135deg,#0f2044,#c9a84c)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.95rem' }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth:'76%', padding:'11px 16px',
        borderRadius: isUser?'18px 18px 4px 18px':'18px 18px 18px 4px',
        background: isUser?'linear-gradient(135deg,#0f2044,#1a3a6e)':'white',
        color: isUser?'white':'#0f2044',
        boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
        border: isUser?'none':'1px solid #e5e7eb',
        fontSize:'0.87rem', lineHeight:1.65, whiteSpace:'pre-wrap',
      }}>
        {msg.content}
        <div style={{ fontSize:'0.65rem', opacity:.55, marginTop:5, textAlign:isUser?'right':'left' }}>
          {new Date(msg.time).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>
      {isUser && (
        <div style={{ width:34,height:34,borderRadius:'50%',flexShrink:0,
          background:'linear-gradient(135deg,#0f2044,#1a3a6e)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:'0.72rem',fontWeight:700,color:'white' }}>
          Moi
        </div>
      )}
    </div>
  );
}

// ── Panneau de configuration clé API ──────────────────────────
function NoKeyBanner({ onDismiss }) {
  return (
    <div style={{ background:'linear-gradient(135deg,#fef9c3,#fef3c7)', border:'1px solid #f59e0b',
      borderRadius:12, padding:'18px 22px', marginBottom:16 }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <span style={{ fontSize:'1.6rem', flexShrink:0 }}>🔑</span>
        <div style={{ flex:1 }}>
          <h3 style={{ fontWeight:700, color:'#92400e', marginBottom:6, fontSize:'0.95rem' }}>
            Configuration requise — Clé API Anthropic
          </h3>
          <p style={{ fontSize:'0.84rem', color:'#78350f', lineHeight:1.6, marginBottom:10 }}>
            Pour activer ARIA, vous devez ajouter votre clé API Anthropic dans le fichier <code style={{ background:'rgba(0,0,0,0.08)', padding:'1px 6px', borderRadius:4 }}>backend/.env</code>
          </p>
          <div style={{ background:'rgba(0,0,0,0.06)', borderRadius:8, padding:'10px 14px', fontFamily:'monospace', fontSize:'0.82rem', color:'#451a03', marginBottom:10 }}>
            <p style={{ marginBottom:4, opacity:.7 }}># Ouvrez backend/.env et remplacez :</p>
            <p style={{ color:'#d97706' }}>ANTHROPIC_API_KEY=sk-ant-ici-votre-cle-api-anthropic</p>
            <p style={{ marginTop:4, opacity:.7 }}># Par votre vraie clé (commence par sk-ant-...)</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
              style={{ background:'#d97706', color:'white', padding:'7px 16px', borderRadius:8,
                textDecoration:'none', fontSize:'0.82rem', fontWeight:700 }}>
              🔗 Obtenir une clé sur console.anthropic.com
            </a>
            <button onClick={onDismiss}
              style={{ background:'transparent', border:'1px solid #f59e0b', color:'#92400e',
                padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
              J'ai déjà configuré ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panneau Prédictions ────────────────────────────────────────
function PredictionsPanel({ dashData, bccData }) {
  const [loading, setLoading] = useState(false);
  const [preds,   setPreds]   = useState(null);
  const [error,   setError]   = useState('');
  const [showKey, setShowKey] = useState(false);

  const run = async () => {
    setLoading(true); setError(''); setShowKey(false);
    try {
      const r = await api.post('/ai/predict', { context: buildContext(dashData, bccData) });
      setPreds(r.data.data);
    } catch(err) {
      const code = err.response?.data?.code;
      if (code === 'NO_API_KEY') { setShowKey(true); }
      else setError(err.response?.data?.message || 'Erreur lors de l\'analyse');
    } finally { setLoading(false); }
  };

  const niveauStyle = {
    high:   { bg:'#fee2e2', border:'#fca5a5', color:'#991b1b', label:'🔴 Critique' },
    medium: { bg:'#fef9c3', border:'#fde68a', color:'#92400e', label:'🟡 Attention' },
    low:    { bg:'#dcfce7', border:'#86efac', color:'#166534', label:'🟢 Info' },
  };

  if (showKey) return <NoKeyBanner onDismiss={()=>{setShowKey(false);run();}}/>;

  if (!preds && !loading && !error) return (
    <div style={{ textAlign:'center', padding:'32px 16px' }}>
      <div style={{ fontSize:'3rem', marginBottom:12 }}>🔮</div>
      <h3 style={{ color:'#0f2044', marginBottom:8, fontFamily:"'Playfair Display',serif" }}>Analyse prédictive IA</h3>
      <p style={{ color:'#9ca3af', fontSize:'0.86rem', marginBottom:20, maxWidth:360, margin:'0 auto 20px' }}>
        ARIA analyse vos données en temps réel pour détecter risques, tendances et opportunités.
      </p>
      <Btn variant="gold" onClick={run}>🔮 Lancer l'analyse</Btn>
    </div>
  );

  if (loading) return (
    <div style={{ textAlign:'center', padding:'40px 16px' }}>
      <div style={{ width:48,height:48,border:'3px solid #e5e7eb',borderTop:'3px solid #c9a84c',
        borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 14px' }}/>
      <p style={{ color:'#9ca3af', fontSize:'0.86rem' }}>ARIA analyse vos données...</p>
    </div>
  );

  if (error) return (
    <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:10, padding:'16px 18px', color:'#991b1b' }}>
      <p style={{ fontWeight:600, marginBottom:6 }}>⚠️ Erreur</p>
      <p style={{ fontSize:'0.83rem', marginBottom:10 }}>{error}</p>
      <button onClick={run} style={{ background:'white', border:'1px solid #fca5a5', borderRadius:7,
        padding:'6px 14px', cursor:'pointer', color:'#dc2626', fontSize:'0.8rem', fontWeight:600 }}>
        🔄 Réessayer
      </button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Résumé */}
      <div style={{ background:'linear-gradient(135deg,#0f2044,#1a3a6e)', borderRadius:12, padding:'16px 20px', color:'white' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <span style={{ fontSize:'1.1rem' }}>🤖</span>
          <p style={{ fontWeight:700, fontSize:'0.82rem', opacity:.8 }}>ARIA — Résumé exécutif</p>
        </div>
        <p style={{ fontSize:'0.88rem', lineHeight:1.65 }}>{preds.resume}</p>
      </div>

      {/* Alertes */}
      {preds.alertes?.length>0&&(
        <div>
          <p style={{ fontSize:'0.72rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>⚠️ Alertes</p>
          {preds.alertes.map((a,i)=>{
            const s = niveauStyle[a.niveau]||niveauStyle.low;
            return (
              <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`,
                borderLeft:`4px solid ${s.color}`, borderRadius:10, padding:'10px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, flexWrap:'wrap', gap:4 }}>
                  <p style={{ fontWeight:700, color:s.color, fontSize:'0.84rem' }}>{a.titre}</p>
                  <span style={{ fontSize:'0.7rem', fontWeight:700, color:s.color }}>{s.label}</span>
                </div>
                <p style={{ fontSize:'0.79rem', color:'#4b5563', marginBottom:4 }}>{a.description}</p>
                <p style={{ fontSize:'0.74rem', color:s.color, fontWeight:600 }}>→ {a.action}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Prédictions */}
      {preds.predictions?.length>0&&(
        <div>
          <p style={{ fontSize:'0.72rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>🔮 Prédictions</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:10 }}>
            {preds.predictions.map((p,i)=>{
              const pc = p.probabilite>=70?'#dc2626':p.probabilite>=40?'#f59e0b':'#16a34a';
              const ic = p.impact==='positif'?'#16a34a':p.impact==='negatif'?'#dc2626':'#6b7280';
              return (
                <div key={i} style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:'12px 14px', background:'white' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7, alignItems:'flex-start' }}>
                    <span style={{ background:'#f0f4ff', color:'#0f2044', padding:'2px 8px', borderRadius:6, fontSize:'0.68rem', fontWeight:700 }}>{p.domaine}</span>
                    <span style={{ fontWeight:800, color:pc, fontSize:'0.85rem' }}>{p.probabilite}%</span>
                  </div>
                  <p style={{ fontWeight:700, fontSize:'0.84rem', color:'#0f2044', marginBottom:4 }}>{p.titre}</p>
                  <p style={{ fontSize:'0.74rem', color:'#6b7280', marginBottom:7, lineHeight:1.5 }}>{p.detail}</p>
                  <div style={{ height:5, background:'#e5e7eb', borderRadius:99, marginBottom:5 }}>
                    <div style={{ height:'100%', width:`${p.probabilite}%`, background:pc, borderRadius:99 }}/>
                  </div>
                  <p style={{ fontSize:'0.7rem', color:ic, fontWeight:600 }}>
                    {p.impact==='positif'?'↑ Positif':p.impact==='negatif'?'↓ Négatif':'→ Neutre'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommandations */}
      {preds.recommandations?.length>0&&(
        <div>
          <p style={{ fontSize:'0.72rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>💡 Recommandations</p>
          {preds.recommandations.sort((a,b)=>a.priorite-b.priorite).map((r,i)=>{
            const pc = r.priorite===1?'#dc2626':r.priorite===2?'#f59e0b':'#16a34a';
            const bg = r.priorite===1?'#fee2e2':r.priorite===2?'#fef9c3':'#dcfce7';
            return (
              <div key={i} style={{ display:'flex', gap:12, padding:'10px 14px', border:'1px solid #e5e7eb', borderRadius:10, marginBottom:8, background:'white' }}>
                <div style={{ width:28,height:28,borderRadius:'50%',background:bg,color:pc,
                  display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.8rem',flexShrink:0 }}>
                  {r.priorite}
                </div>
                <div>
                  <p style={{ fontWeight:700, fontSize:'0.84rem', color:'#0f2044', marginBottom:3 }}>{r.titre}</p>
                  <p style={{ fontSize:'0.77rem', color:'#6b7280', marginBottom:4 }}>{r.description}</p>
                  <p style={{ fontSize:'0.73rem', color:'#16a34a', fontWeight:600 }}>✅ {r.benefice}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={run} style={{ background:'transparent', border:'1px solid #e5e7eb', borderRadius:8,
        padding:'8px 16px', cursor:'pointer', fontSize:'0.76rem', color:'#9ca3af', fontWeight:600 }}>
        🔄 Actualiser l'analyse
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function AIPage() {
  const [messages,  setMessages]   = useState([{
    role:'assistant',
    content:'Bonjour ! Je suis **ARIA**, votre assistant IA pour LHM Madagascar. 🤖✝️\n\nJe peux vous aider à :\n• Analyser les performances des étudiants BCC\n• Prédire les risques (abandon, stock critique, surcharge)\n• Recommander des actions prioritaires\n• Répondre à vos questions sur les données\n\nQue puis-je faire pour vous ?',
    time: Date.now(),
  }]);
  const [input,     setInput]      = useState('');
  const [loading,   setLoading]    = useState(false);
  const [activeTab, setActiveTab]  = useState('chat');
  const [dashData,  setDashData]   = useState(null);
  const [bccData,   setBccData]    = useState(null);
  const [showKey,   setShowKey]    = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    document.getElementById('page-title') && (document.getElementById('page-title').textContent = 'ARIA — Intelligence Artificielle');
    Promise.all([
      api.get('/dashboard').catch(()=>null),
      api.get('/bcc/stats').catch(()=>null),
    ]).then(([d,b]) => {
      if (d) setDashData(d.data);
      if (b) setBccData(b.data.data);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text = input) => {
    const txt = text.trim();
    if (!txt || loading) return;
    const userMsg = { role:'user', content:txt, time:Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setLoading(true); setShowKey(false);

    try {
      const history = [...messages, userMsg]
        .slice(-10)
        .map(m => ({ role:m.role, content:m.content }));

      const r = await api.post('/ai/chat', {
        messages: history,
        context:  buildContext(dashData, bccData),
      });

      setMessages(prev => [...prev, { role:'assistant', content:r.data.reply, time:Date.now() }]);
    } catch(err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.message || 'Erreur de connexion';
      if (code === 'NO_API_KEY') {
        setShowKey(true);
        setMessages(prev => [...prev, {
          role:'assistant',
          content:'🔑 Clé API non configurée. Veuillez ajouter ANTHROPIC_API_KEY dans le fichier backend/.env\n\nConsultez la bannière ci-dessous pour les instructions.',
          time:Date.now()
        }]);
      } else {
        setMessages(prev => [...prev, { role:'assistant', content:`⚠️ ${msg}`, time:Date.now() }]);
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0f2044,#1a3a6e)', borderRadius:16,
        padding:'18px 26px', marginBottom:18, display:'flex', alignItems:'center', gap:14,
        flexWrap:'wrap', boxShadow:'0 8px 32px rgba(15,32,68,0.2)' }}>
        <div style={{ width:52,height:52,borderRadius:'50%',
          background:'linear-gradient(135deg,#c9a84c,#e0c06e)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',flexShrink:0,
          boxShadow:'0 4px 14px rgba(201,168,76,0.4)' }}>🤖</div>
        <div style={{ flex:1, color:'white' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.25rem', fontWeight:700, marginBottom:2 }}>
            ARIA — Intelligence Artificielle
          </h2>
          <p style={{ opacity:.75, fontSize:'0.82rem' }}>Artificial Religious Intelligence Assistant · Powered by Claude</p>
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          {['Analyse IA','Prédictions','Recommandations'].map(t=>(
            <span key={t} style={{ background:'rgba(201,168,76,0.2)', border:'1px solid rgba(201,168,76,0.3)',
              color:'#e0c06e', padding:'4px 12px', borderRadius:20, fontSize:'0.74rem', fontWeight:600 }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Bannière clé API si besoin */}
      {showKey && <NoKeyBanner onDismiss={()=>setShowKey(false)}/>}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'2px solid #f3f4f6', marginBottom:16 }}>
        {[{id:'chat',label:'💬 Chat IA'},{id:'predictions',label:'🔮 Prédictions & Alertes'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ padding:'10px 22px', border:'none', background:'transparent', cursor:'pointer',
              fontSize:'0.87rem', fontWeight:600,
              color:activeTab===t.id?'#0f2044':'#9ca3af',
              borderBottom:activeTab===t.id?'2px solid #c9a84c':'2px solid transparent', marginBottom:'-2px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHAT ── */}
      {activeTab==='chat'&&(
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16, alignItems:'start' }}>
          <Card style={{ display:'flex', flexDirection:'column', height:'70vh', padding:0, overflow:'hidden' }}>
            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
              {messages.map((m,i) => <MsgBubble key={i} msg={m}/>)}
              {loading&&(
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:34,height:34,borderRadius:'50%',
                    background:'linear-gradient(135deg,#0f2044,#c9a84c)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem' }}>🤖</div>
                  <div style={{ background:'white',border:'1px solid #e5e7eb',borderRadius:'18px 18px 18px 4px',overflow:'hidden' }}>
                    <TypingDots/>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Zone de saisie */}
            <div style={{ borderTop:'1px solid #f3f4f6', padding:'13px 18px', background:'#fafafa' }}>
              <div style={{ display:'flex', gap:9, alignItems:'flex-end' }}>
                <textarea ref={inputRef} value={input}
                  onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Posez votre question à ARIA... (Entrée pour envoyer)"
                  rows={2} disabled={loading}
                  style={{ flex:1, resize:'none', padding:'10px 14px', border:'1.5px solid #e5e7eb',
                    borderRadius:12, fontSize:'0.87rem', outline:'none', fontFamily:'Inter,sans-serif',
                    background:'white', lineHeight:1.5 }}
                  onFocus={e=>e.target.style.borderColor='#c9a84c'}
                  onBlur={e=>e.target.style.borderColor='#e5e7eb'}
                />
                <button onClick={()=>sendMessage()} disabled={loading||!input.trim()}
                  style={{ width:44,height:44,borderRadius:'50%',border:'none',flexShrink:0,
                    background:input.trim()&&!loading?'linear-gradient(135deg,#0f2044,#1a3a6e)':'#e5e7eb',
                    color:input.trim()&&!loading?'white':'#9ca3af',
                    cursor:input.trim()&&!loading?'pointer':'not-allowed',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.05rem',
                    transition:'all 0.2s' }}>
                  ➤
                </button>
              </div>
              <p style={{ fontSize:'0.66rem', color:'#d1d5db', marginTop:5, textAlign:'right' }}>
                Shift+Entrée = nouvelle ligne · Entrée = envoyer
              </p>
            </div>
          </Card>

          {/* Suggestions */}
          <div>
            <p style={{ fontSize:'0.72rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>
              💡 Suggestions
            </p>
            {SUGGESTIONS.map((s,i)=>(
              <button key={i} onClick={()=>sendMessage(s.prompt)} disabled={loading}
                style={{ width:'100%', background:'white', border:'1px solid #e5e7eb', borderRadius:10,
                  padding:'10px 13px', cursor:loading?'not-allowed':'pointer', textAlign:'left',
                  display:'flex', alignItems:'center', gap:9, marginBottom:8,
                  transition:'all 0.15s', opacity:loading?0.6:1 }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#c9a84c';e.currentTarget.style.background='#fefce8'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.background='white'}}>
                <span style={{ fontSize:'1.15rem' }}>{s.icon}</span>
                <span style={{ fontSize:'0.79rem', fontWeight:500, color:'#0f2044', lineHeight:1.35 }}>{s.text}</span>
              </button>
            ))}
            {messages.length>2&&(
              <button onClick={()=>setMessages([messages[0]])}
                style={{ width:'100%', background:'transparent', border:'1px solid #fca5a5',
                  borderRadius:8, padding:'7px 12px', cursor:'pointer',
                  fontSize:'0.74rem', color:'#dc2626', fontWeight:600, marginTop:4 }}>
                🗑️ Effacer la conversation
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PRÉDICTIONS ── */}
      {activeTab==='predictions'&&(
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card>
            <CardHeader title="Analyse prédictive" subtitle="ARIA analyse vos données en temps réel"/>
            <PredictionsPanel dashData={dashData} bccData={bccData}/>
          </Card>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Card>
              <CardHeader title="Données analysées" subtitle="Sources utilisées par ARIA"/>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[
                  { icon:'👥', label:'Personnel',      value:dashData?.stats?.totalPersonnel||0, unit:'actifs' },
                  { icon:'📖', label:'Étudiants BCC',  value:bccData?.total||0,                  unit:'inscrits' },
                  { icon:'📦', label:'Stock critique',  value:dashData?.stats?.criticalStock||0,  unit:'articles', alert:dashData?.stats?.criticalStock>0 },
                  { icon:'📅', label:'Congés attente',  value:dashData?.stats?.pendingLeave||0,   unit:'demandes', alert:dashData?.stats?.pendingLeave>0 },
                  { icon:'🎯', label:'Projets actifs',  value:dashData?.stats?.activeProjects||0, unit:'en cours' },
                  { icon:'⚠️', label:'Proj. retardés',  value:dashData?.stats?.delayedProjects||0,unit:'retards', alert:dashData?.stats?.delayedProjects>0 },
                ].map(item=>(
                  <div key={item.label} style={{ display:'flex', alignItems:'center', gap:9,
                    padding:'7px 11px', borderRadius:9,
                    background:item.alert?'#fef2f2':'#f8faff',
                    border:`1px solid ${item.alert?'#fca5a5':'#e5e7eb'}` }}>
                    <span style={{ fontSize:'1rem' }}>{item.icon}</span>
                    <span style={{ flex:1, fontSize:'0.81rem', color:'#4b5563', fontWeight:500 }}>{item.label}</span>
                    <span style={{ fontWeight:700, color:item.alert?'#dc2626':'#0f2044', fontSize:'0.95rem' }}>{item.value}</span>
                    <span style={{ fontSize:'0.68rem', color:'#9ca3af' }}>{item.unit}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Guide configuration */}
            <Card>
              <CardHeader title="Configuration IA" subtitle="Comment activer ARIA"/>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { n:1, text:'Créez un compte sur', link:'https://console.anthropic.com', linkText:'console.anthropic.com' },
                  { n:2, text:'Allez dans API Keys → Create Key' },
                  { n:3, text:'Ouvrez backend/.env et ajoutez :', code:'ANTHROPIC_API_KEY=sk-ant-...' },
                  { n:4, text:'Redémarrez le backend (node server.js)' },
                ].map(step=>(
                  <div key={step.n} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:22,height:22,borderRadius:'50%',background:'#0f2044',color:'white',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,flexShrink:0,marginTop:1 }}>
                      {step.n}
                    </div>
                    <div style={{ fontSize:'0.8rem', color:'#4b5563' }}>
                      {step.text} {step.link&&<a href={step.link} target="_blank" rel="noopener noreferrer" style={{ color:'#0891b2' }}>{step.linkText}</a>}
                      {step.code&&<div style={{ fontFamily:'monospace', background:'#f3f4f6', padding:'2px 8px', borderRadius:5, marginTop:3, fontSize:'0.78rem', color:'#0f2044' }}>{step.code}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
