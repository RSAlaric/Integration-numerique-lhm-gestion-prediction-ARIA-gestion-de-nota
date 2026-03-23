import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, Btn, Modal, FormRow, FormField, SearchBar, Spinner } from '../components/ui/Card';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// ══════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════
const LANGUES = ['Français','English','Malagasy'];
const SEXES   = ['Homme','Femme'];
const SITUATIONS_MATRI = ['Célibataire','Marié(e)','Autre'];
const SOURCES_INFO = ['Programme Radio','Internet (Site web, Facebook, Blog)','Campagne d\'évangélisation','Programme spécial pour les jeunes','Distribution de brochures','Témoignage d\'un volontaire','Autre'];
const HIERARCHIES = ['Synode','Diocèse','District','Paroisse','Autre'];

const MENTION_STYLE = {
  'Très Bien':  { bg:'#dcfce7', color:'#166534' },
  'Bien':       { bg:'#dbeafe', color:'#1e40af' },
  'Assez Bien': { bg:'#ede9fe', color:'#6d28d9' },
  'Passable':   { bg:'#fef9c3', color:'#854d0e' },
  'Insuffisant':{ bg:'#fee2e2', color:'#991b1b' },
};

const STATUT_STYLE = {
  valide:     { bg:'#dcfce7', color:'#166534', icon:'✅', label:'Validé' },
  non_valide: { bg:'#fee2e2', color:'#991b1b', icon:'❌', label:'Non validé' },
  en_cours:   { bg:'#dbeafe', color:'#1e40af', icon:'📚', label:'En cours' },
};

// Mention basée sur pourcentage (%)
const getMention = pct => {
  if (pct===null||pct===undefined) return null;
  const p = parseFloat(pct);
  if (p>=80) return 'Très Bien';
  if (p>=70) return 'Bien';
  if (p>=60) return 'Assez Bien';
  if (p>=50) return 'Passable';
  return 'Insuffisant';
};

// ══════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ══════════════════════════════════════════════════════════════
function MentionBadge({ moyenne }) {
  const m = getMention(moyenne);
  if (!m) return <span style={{color:'#9ca3af',fontSize:'0.75rem'}}>—</span>;
  const s = MENTION_STYLE[m];
  return <span style={{background:s.bg,color:s.color,padding:'2px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:700}}>{m}</span>;
}

function StatutBadge({ statut }) {
  const s = STATUT_STYLE[statut] || { bg:'#f3f4f6',color:'#6b7280',icon:'•',label:statut };
  return <span style={{background:s.bg,color:s.color,padding:'2px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:700}}>{s.icon} {s.label}</span>;
}

function ProgressBar({ value, max=10, color='#0f2044' }) {
  const pct = Math.min(100, (value/max)*100);
  return (
    <div style={{height:7,background:'#e5e7eb',borderRadius:99,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:99,transition:'width .4s'}} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SAISIE DES NOTES — par année
// ══════════════════════════════════════════════════════════════
function NoteModal({ open, onClose, etudiant, onSaved }) {
  const [anneeId, setAnneeId]   = useState(1);
  const [notes,   setNotes]     = useState({});
  const [saving,  setSaving]    = useState(false);
  const [errors,  setErrors]    = useState({});

  const struct = etudiant?.course_structure;
  const annees = struct?.annees || [];
  const anneeConfig = annees.find(a => a.id === anneeId);
  const lessons     = anneeConfig?.lessons || [];
  const prog        = etudiant?.progression?.annees?.find(a => a.id === anneeId);
  const accessible  = prog?.accessible ?? true;

  useEffect(() => {
    if (!open || !etudiant) return;
    const initial = {};
    (etudiant.progression?.annees || []).forEach(a => {
      initial[a.id] = {};
      (a.notesSaisies || []).forEach(n => { initial[a.id][n.lecon] = String(n.note); });
    });
    setNotes(initial);
    setErrors({});
    const targetId = etudiant.classe_actuelle <= annees.length ? etudiant.classe_actuelle : annees.length;
    setAnneeId(targetId);
  }, [open, etudiant, annees.length]);

  const setNote = (lecon, val) => {
    setNotes(prev => ({ ...prev, [anneeId]:{ ...(prev[anneeId]||{}), [lecon]:val } }));
    // Validation temps réel
    const lesson = lessons.find(l => l.num === lecon);
    if (lesson && val !== '') {
      const v = parseFloat(val);
      if (!isNaN(v) && v > lesson.max) {
        setErrors(prev => ({ ...prev, [`${anneeId}_${lecon}`]: `Max: ${lesson.max}` }));
      } else {
        setErrors(prev => { const e={...prev}; delete e[`${anneeId}_${lecon}`]; return e; });
      }
    } else {
      setErrors(prev => { const e={...prev}; delete e[`${anneeId}_${lecon}`]; return e; });
    }
  };

  const handleSaveAll = async () => {
    if (!accessible) { toast.error('Année non accessible'); return; }
    const notesAnnee = notes[anneeId] || {};
    // Vérifier tous les maxima avant d'envoyer
    for (const lesson of lessons) {
      const val = notesAnnee[lesson.num];
      if (val === '' || val === undefined) continue;
      const v = parseFloat(val);
      if (!isNaN(v) && v > lesson.max) {
        toast.error(`${anneeConfig?.lessonLabel||'Leçon'} ${lesson.num}: note ${v} dépasse le max autorisé (${lesson.max})`);
        return;
      }
    }
    setSaving(true);
    let saved=0, errs=0;
    for (const lesson of lessons) {
      const val = notesAnnee[lesson.num];
      if (val===''||val===null||val===undefined) continue;
      const v = parseFloat(val);
      if (isNaN(v)||v<0) continue;
      try {
        await api.post('/bcc/notes', {
          etudiant_id:etudiant.id, annee_id:anneeId, lecon:lesson.num, note:v,
        });
        saved++;
      } catch(err) {
        toast.error(err.response?.data?.message || `Erreur leçon ${lesson.num}`);
        errs++;
      }
    }
    setSaving(false);
    if (saved>0) toast.success(`${saved} note(s) enregistrée(s)`);
    if (errs===0) { onSaved(); onClose(); }
  };

  // Calcul temps réel avec pondération
  const notesAnnee = notes[anneeId] || {};
  const calcRealtime = () => {
    let totalObtenu=0, totalPossible=0, count=0;
    lessons.forEach(lesson => {
      const val = notesAnnee[lesson.num];
      totalPossible += lesson.max;
      if (val!==''&&val!==undefined&&!isNaN(parseFloat(val))) {
        totalObtenu += Math.min(parseFloat(val), lesson.max);
        count++;
      }
    });
    const pct = totalPossible>0 ? Math.round((totalObtenu/totalPossible)*10000)/100 : null;
    return { totalObtenu, totalPossible, pct, count, mention:getMention(pct) };
  };
  const rt = calcRealtime();

  if (!open||!etudiant) return null;

  return (
    <Modal open={open} onClose={onClose}
      title={`📝 Notes — ${etudiant.prenom} ${etudiant.nom} (${etudiant.numero_etudiant})`}
      width={680}>
      {/* Sélecteur d'année */}
      <div style={{display:'flex',borderBottom:'2px solid #f3f4f6',overflowX:'auto',flexShrink:0}}>
        {annees.map(a => {
          const p = etudiant.progression?.annees?.find(x=>x.id===a.id);
          const isActive = anneeId===a.id;
          const locked   = !(p?.accessible??true);
          return (
            <button key={a.id} type="button" onClick={()=>{ if(!locked){setAnneeId(a.id);setErrors({});} }}
              style={{ padding:'10px 20px',border:'none',background:'transparent',
                cursor:locked?'not-allowed':'pointer',fontSize:'0.82rem',fontWeight:600,
                whiteSpace:'nowrap',
                color:locked?'#d1d5db':isActive?'#0f2044':'#9ca3af',
                borderBottom:isActive?'2px solid #c9a84c':'2px solid transparent',
                marginBottom:'-2px',opacity:locked?0.5:1 }}>
              {locked?'🔒 ':'📚 '}{a.label}
              {p?.stats?.valide&&<span style={{marginLeft:5,color:'#16a34a',fontSize:'0.7rem'}}>✅</span>}
            </button>
          );
        })}
      </div>

      {/* Info max total de l'année */}
      {anneeConfig&&accessible&&(
        <div style={{padding:'10px 24px 0',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontSize:'0.75rem',background:'#f0f4ff',color:'#1e3a8a',padding:'3px 10px',borderRadius:8,fontWeight:600}}>
            Total possible : {lessons.reduce((s,l)=>s+l.max,0)} points
          </span>
          <span style={{fontSize:'0.75rem',background:'#fef9c3',color:'#854d0e',padding:'3px 10px',borderRadius:8,fontWeight:600}}>
            Validation : ≥ 50%
          </span>
        </div>
      )}

      <div style={{padding:'14px 24px',maxHeight:'55vh',overflowY:'auto'}}>
        {!accessible ? (
          <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,padding:'16px 20px',textAlign:'center',color:'#991b1b'}}>
            <p style={{fontSize:'1.5rem',marginBottom:8}}>🔒</p>
            <p style={{fontWeight:700}}>Année verrouillée</p>
            <p style={{fontSize:'0.82rem',marginTop:4,opacity:0.8}}>Validez l'année précédente (≥ 50%) pour débloquer.</p>
          </div>
        ) : (
          <>
            {/* Grille des leçons */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px 20px',marginBottom:14}}>
              {lessons.map(lesson => {
                const val      = notesAnnee[lesson.num] ?? '';
                const num      = parseFloat(val);
                const hasErr   = errors[`${anneeId}_${lesson.num}`];
                const pctLecon = !isNaN(num)&&val!=='' ? (num/lesson.max)*100 : null;
                const barColor = pctLecon===null?'#e5e7eb':pctLecon>=50?'#16a34a':'#dc2626';
                return (
                  <div key={lesson.num} style={{
                    background:hasErr?'#fef2f2':val!==''&&!isNaN(num)?pctLecon>=50?'#f0fdf4':'#fef2f2':'#fafafa',
                    border:`1.5px solid ${hasErr?'#fca5a5':val!==''&&!isNaN(num)?pctLecon>=50?'#86efac':'#fca5a5':'#e5e7eb'}`,
                    borderRadius:10,padding:'10px 12px',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <label style={{fontSize:'0.8rem',fontWeight:700,color:'#0f2044',minWidth:70,textTransform:'none'}}>
                        {anneeConfig?.lessonLabel||'Leçon'} {lesson.num}
                      </label>
                      <span style={{fontSize:'0.7rem',color:'#9ca3af',background:'#f3f4f6',padding:'1px 7px',borderRadius:6,fontWeight:600}}>
                        /{lesson.max}
                      </span>
                      {val!==''&&!isNaN(num)&&(
                        <span style={{fontSize:'0.7rem',fontWeight:700,color:pctLecon>=50?'#16a34a':'#dc2626',marginLeft:'auto'}}>
                          {pctLecon>=50?'✅':'❌'} {pctLecon?.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <input type="number" min="0" max={lesson.max} step="0.25"
                        value={val}
                        onChange={e=>setNote(lesson.num,e.target.value)}
                        placeholder="—"
                        style={{
                          width:72,textAlign:'center',fontWeight:700,fontSize:'1rem',
                          borderColor:hasErr?'#dc2626':val!==''&&!isNaN(num)?pctLecon>=50?'#16a34a':'#dc2626':'#e5e7eb',
                          padding:'6px 8px',borderRadius:7,border:'1.5px solid',outline:'none',
                        }}
                      />
                      {/* mini progress bar */}
                      <div style={{flex:1,height:6,background:'#e5e7eb',borderRadius:99,overflow:'hidden'}}>
                        {val!==''&&!isNaN(num)&&(
                          <div style={{height:'100%',width:`${Math.min(100,(num/lesson.max)*100)}%`,background:barColor,borderRadius:99}}/>
                        )}
                      </div>
                    </div>
                    {hasErr&&<p style={{color:'#dc2626',fontSize:'0.7rem',marginTop:4,fontWeight:600}}>⚠ {hasErr}</p>}
                  </div>
                );
              })}
            </div>

            {/* Récapitulatif temps réel */}
            {rt.count>0&&(
              <div style={{background:'#f8faff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 16px'}}>
                <p style={{fontSize:'0.72rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>
                  Récapitulatif — {rt.count}/{lessons.length} leçon(s) saisie(s)
                </p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {[
                    {label:'Total obtenu',   value:`${rt.totalObtenu.toFixed(2)}`, color:'#0f2044'},
                    {label:'Total possible', value:`${rt.totalPossible}`,          color:'#6b7280'},
                    {label:'Moyenne (%)',    value:rt.pct!==null?`${rt.pct.toFixed(2)}%`:'—',
                      color:rt.pct>=50?'#16a34a':'#dc2626'},
                    {label:'Mention',        value:rt.mention||'—',
                      color:rt.pct>=80?'#16a34a':rt.pct>=70?'#2563eb':rt.pct>=60?'#7c3aed':rt.pct>=50?'#d97706':'#dc2626'},
                  ].map(item=>(
                    <div key={item.label} style={{textAlign:'center',background:'white',borderRadius:9,padding:'8px 6px',border:'1px solid #e5e7eb'}}>
                      <p style={{fontSize:'0.65rem',color:'#9ca3af',marginBottom:3}}>{item.label}</p>
                      <p style={{fontWeight:800,fontSize:'0.9rem',color:item.color}}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {/* Barre de progression globale */}
                <div style={{marginTop:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',marginBottom:4}}>
                    <span style={{color:'#9ca3af'}}>Progression vers la validation</span>
                    <span style={{fontWeight:700,color:rt.pct>=50?'#16a34a':'#dc2626'}}>
                      {rt.pct>=50?'✅ Validé':'❌ Non validé'} (seuil: 50%)
                    </span>
                  </div>
                  <div style={{height:10,background:'#e5e7eb',borderRadius:99,overflow:'hidden'}}>
                    <div style={{
                      height:'100%',
                      width:`${Math.min(100,rt.pct||0)}%`,
                      background:rt.pct>=80?'#16a34a':rt.pct>=50?'#f59e0b':'#dc2626',
                      borderRadius:99,transition:'width .4s ease'
                    }}/>
                  </div>
                  {/* Marqueur 50% */}
                  <div style={{position:'relative',marginTop:2}}>
                    <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',fontSize:'0.62rem',color:'#9ca3af'}}>50%</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{display:'flex',gap:10,justifyContent:'flex-end',padding:'12px 24px',borderTop:'1px solid #f3f4f6',background:'#fafafa'}}>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        {accessible&&<Btn variant="gold" onClick={handleSaveAll} disabled={saving||Object.keys(errors).length>0}>
          {saving?'Enregistrement...':'💾 Enregistrer les notes'}
        </Btn>}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// DETAIL ÉTUDIANT — avec toutes les années
// ══════════════════════════════════════════════════════════════
function DetailModal({ open, onClose, etudiant, onEdit, onNotes, canEdit }) {
  if (!open||!etudiant) return null;
  const prog = etudiant.progression;
  const annees = prog?.annees || [];

  const printBulletin = () => {
    const now = new Date().toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'});
    const anneeBlocks = annees.map(a => {
      const ns = a.notesSaisies||[];
      if (!ns.length) return `<div class="sec">${a.label}</div><p style="color:#9ca3af;font-style:italic">Aucune note</p>`;
      const total = ns.reduce((s,n)=>s+parseFloat(n.note||0),0);
      const moy   = total/ns.length;
      const mention = getMention(moy);
      const rows  = ns.map(n=>`<tr><td>${a.lessonLabel||'Leçon'} ${n.lecon}</td><td style="text-align:center;font-weight:700;color:${parseFloat(n.note)>=10?'#166534':'#991b1b'}">${parseFloat(n.note).toFixed(2)}/20</td></tr>`).join('');
      const statLabel = a.stats.valide?'✅ Validé':a.stats.complete?'❌ Non validé':'📚 En cours';
      return `
        <div class="sec">${a.label} — <span style="color:${a.stats.valide?'#166534':'#0f2044'}">${statLabel}</span></div>
        <table><thead><tr><th>${a.lessonLabel||'Leçon'}</th><th>Note</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td><b>Total: ${total.toFixed(2)} | Moyenne: ${moy.toFixed(2)}/20</b></td>
        <td style="background:${MENTION_STYLE[mention]?.bg};color:${MENTION_STYLE[mention]?.color};font-weight:700;padding:3px 8px;border-radius:8px">${mention}</td></tr></tfoot>
        </table>`;
    }).join('');
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Bulletin BCC</title>
<style>@page{size:A4;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10px}
.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0f2044;padding-bottom:8px;margin-bottom:14px}
.hdr h1{font-size:15px;color:#0f2044}.num{font-family:monospace;background:#c9a84c;color:#0f2044;padding:2px 8px;border-radius:4px;font-weight:700}
.id{background:#0f2044;color:white;padding:10px 14px;border-radius:8px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.id label{font-size:7px;opacity:.7;display:block}.id span{font-weight:700;font-size:9px}
.sec{font-size:8px;font-weight:700;color:#c9a84c;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding-bottom:2px;margin:10px 0 6px}
table{width:100%;border-collapse:collapse;font-size:9px}thead tr{background:#0f2044;color:white}th,td{padding:4px 8px}
tfoot tr{background:#f0f4ff}tbody tr:nth-child(even){background:#f9fafb}
.ftr{margin-top:12px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:5px}</style></head>
<body><div class="hdr"><div><h1>Bulletin BCC — ${etudiant.langue}</h1><p style="font-size:8px;color:#666">Imprimé le ${now}</p></div>
<div class="num">${etudiant.numero_etudiant}</div></div>
<div class="id">
<div><label>Nom complet</label><span>${etudiant.prenom} ${etudiant.nom}</span></div>
<div><label>Langue</label><span>${etudiant.langue}</span></div>
<div><label>Inscription</label><span>${etudiant.date_inscription?new Date(etudiant.date_inscription).toLocaleDateString('fr-FR'):'—'}</span></div>
<div><label>Statut</label><span>${etudiant.statut}</span></div>
<div><label>Moyenne globale</label><span>${etudiant.moyenne_globale?.toFixed(2)||'—'}/20</span></div>
<div><label>Années validées</label><span>${etudiant.nb_annees_validees}/${etudiant.nb_annees_total}</span></div>
</div>
${anneeBlocks}
<div class="ftr">LHM Madagascar — Feon'ny Filazantsara</div></body></html>`;
    const w=window.open('','_blank');w.document.write(html);w.document.close();w.onload=()=>w.print();
  };

  const printDiploma = (et) => {
    const now = new Date().toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'});
    const validatedYears = (et.progression?.annees||[]).filter(a=>a.stats?.valide);
    const yearBlocks = validatedYears.map(a=>`
      <div class="year-badge">
        <span class="year-label">${a.label}</span>
        <span class="year-score">${a.stats.pourcentage?.toFixed(1)||a.stats.moyenne?.toFixed(1)||'—'}%</span>
      </div>`).join('');
    const mention = getMention(et.moyenne_globale);
    const mentionStyle = MENTION_STYLE[mention] || { bg:'#f3f4f6', color:'#6b7280' };
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Diplôme BCC</title>
<style>
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Georgia',serif;background:#fff;width:297mm;height:210mm;display:flex;align-items:center;justify-content:center}
.diploma{width:270mm;height:190mm;border:8px double #c9a84c;border-radius:16px;padding:28px 36px;position:relative;
  background:linear-gradient(135deg,#fffdf5 0%,#fdf8e8 50%,#fffdf5 100%);text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.corner{position:absolute;font-size:28px;opacity:.25}
.corner.tl{top:14px;left:18px}.corner.tr{top:14px;right:18px}.corner.bl{bottom:14px;left:18px}.corner.br{bottom:14px;right:18px}
.org{font-size:11px;font-weight:700;color:#0f2044;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}
.title{font-size:38px;font-weight:700;color:#0f2044;letter-spacing:2px;margin:6px 0;font-style:italic}
.subtitle{font-size:12px;color:#c9a84c;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px}
.divider{width:180px;height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto 14px}
.cert-text{font-size:13px;color:#555;margin-bottom:6px}
.name{font-size:30px;font-weight:700;color:#0f2044;font-style:italic;margin:4px 0 6px;border-bottom:1px solid #c9a84c;padding-bottom:4px;display:inline-block;min-width:200px}
.course{font-size:13px;color:#555;margin-bottom:12px}
.years{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:8px 0}
.year-badge{background:#0f2044;color:white;padding:5px 16px;border-radius:20px;font-size:11px;font-weight:700}
.year-score{margin-left:8px;background:#c9a84c;color:#0f2044;padding:1px 7px;border-radius:10px;font-size:10px}
.mention-box{display:inline-block;background:${mentionStyle.bg};color:${mentionStyle.color};padding:5px 22px;border-radius:20px;font-size:13px;font-weight:700;margin:6px 0;border:1px solid ${mentionStyle.color}40}
.footer{display:flex;justify-content:space-between;align-items:flex-end;width:100%;margin-top:8px}
.sig{text-align:center;font-size:10px;color:#9ca3af;min-width:120px}
.sig-line{width:100px;height:1px;background:#9ca3af;margin:0 auto 3px}
.stamp{font-size:10px;color:#9ca3af;text-align:center}
.num{font-family:monospace;font-size:10px;color:#c9a84c;font-weight:700;background:#0f2044;padding:2px 8px;border-radius:4px}
</style></head>
<body><div class="diploma">
  <span class="corner tl">✦</span><span class="corner tr">✦</span>
  <span class="corner bl">✦</span><span class="corner br">✦</span>
  <div>
    <div class="org">LHM Madagascar — Feon'ny Filazantsara</div>
    <div class="title">Diplôme</div>
    <div class="subtitle">Bible Correspondence Course</div>
    <div class="divider"></div>
    <div class="cert-text">Ce diplôme est décerné à</div>
    <div class="name">${et.prenom} ${et.nom}</div>
    <div class="course">pour avoir complété avec succès le programme BCC — ${et.langue}</div>
    <div class="years">${yearBlocks}</div>
    ${mention?`<div class="mention-box">Mention : ${mention}</div>`:''}
    <div style="font-size:10px;color:#9ca3af;margin-top:4px">Délivré le ${now}</div>
  </div>
  <div class="footer">
    <div class="sig"><div class="sig-line"></div>Responsable BCC</div>
    <div class="stamp"><div class="num">${et.numero_etudiant}</div><div style="margin-top:3px">N° Étudiant</div></div>
    <div class="sig"><div class="sig-line"></div>Directeur LHM</div>
  </div>
</div></body></html>`;
    const w=window.open('','_blank');w.document.write(html);w.document.close();w.onload=()=>w.print();
  };

  return (
    <Modal open={open} onClose={onClose}
      title={`👤 Fiche — ${etudiant.prenom} ${etudiant.nom}`}
      width={700}>
      {/* Header identité */}
      <div style={{background:'linear-gradient(135deg,#0f2044,#1a3a6e)',color:'white',padding:'14px 24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
          <div>
            <p style={{fontFamily:"'Playfair Display',serif",fontSize:'1.15rem',fontWeight:700}}>{etudiant.prenom} {etudiant.nom}</p>
            <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
              <span style={{background:'rgba(255,255,255,.15)',padding:'2px 10px',borderRadius:10,fontSize:'0.75rem'}}>{etudiant.langue}</span>
              <span style={{background:'#c9a84c',color:'#0f2044',padding:'2px 10px',borderRadius:10,fontSize:'0.75rem',fontWeight:700,fontFamily:'monospace'}}>{etudiant.numero_etudiant}</span>
              <span style={{background:'rgba(255,255,255,.1)',padding:'2px 10px',borderRadius:10,fontSize:'0.75rem'}}>
                {etudiant.nb_annees_validees}/{etudiant.nb_annees_total} année(s) validée(s)
              </span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            {etudiant.moyenne_globale!==null&&etudiant.moyenne_globale!==undefined&&(
              <div style={{background:'rgba(255,255,255,.1)',borderRadius:10,padding:'8px 14px',textAlign:'center'}}>
                <p style={{fontSize:'0.68rem',opacity:.7}}>Moyenne globale</p>
                <p style={{fontSize:'1.4rem',fontWeight:700,color:etudiant.moyenne_globale>=10?'#6ee7b7':'#fca5a5'}}>{etudiant.moyenne_globale.toFixed(2)}</p>
                <MentionBadge moyenne={etudiant.moyenne_globale}/>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{padding:'16px 24px',maxHeight:'55vh',overflowY:'auto'}}>
        {/* Années */}
        {annees.map(a => (
          <div key={a.id} style={{marginBottom:16,border:'1px solid #e5e7eb',borderRadius:12,overflow:'hidden'}}>
            {/* En-tête année */}
            <div style={{
              background:a.stats.valide?'#f0fdf4':a.stats.complete?'#fef2f2':'#f8faff',
              padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',
              borderBottom:'1px solid #e5e7eb',flexWrap:'wrap',gap:6
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:'1.1rem'}}>{a.stats.valide?'✅':a.stats.complete?'❌':a.accessible?'📚':'🔒'}</span>
                <div>
                  <p style={{fontWeight:700,color:'#0f2044',fontSize:'0.9rem'}}>{a.label}</p>
                  <p style={{fontSize:'0.72rem',color:'#9ca3af'}}>{a.stats.lecons}/{a.id<=1?10:10} leçons saisies</p>
                </div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                {a.stats.moyenne!==null&&(
                  <span style={{fontWeight:700,color:a.stats.moyenne>=10?'#166534':'#dc2626',fontSize:'0.9rem'}}>
                    {a.stats.totalObtenu?.toFixed(2)||a.stats.total?.toFixed(2)||'0'}/{a.stats.totalPossible||'?'} pts ({a.stats.pourcentage?.toFixed(1)||a.stats.moyenne?.toFixed(1)||0}%)
                  </span>
                )}
                <StatutBadge statut={a.stats.statut}/>
                {a.stats.valide&&<span style={{background:'#fef9c3',color:'#854d0e',padding:'2px 10px',borderRadius:10,fontSize:'0.72rem',fontWeight:600}}>🎓 Diplôme disponible</span>}
              </div>
            </div>

            {/* Notes de l'année */}
            {a.notesSaisies?.length>0 ? (
              <div style={{padding:'10px 16px'}}>
                <ProgressBar value={a.stats.lecons} color={a.stats.valide?'#16a34a':a.stats.complete?'#dc2626':'#0f2044'}/>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginTop:10}}>
                  {a.notesSaisies.map(n=>(
                    <div key={n.lecon} style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'7px 8px',textAlign:'center',
                      background:parseFloat(n.note)>=10?'#f0fdf4':'#fef2f2'}}>
                      <p style={{fontSize:'0.62rem',color:'#9ca3af',marginBottom:2}}>{a.lessonLabel||'Leçon'} {n.lecon}</p>
                      <p style={{fontSize:'1rem',fontWeight:700,color:parseFloat(n.note)>=10?'#166534':'#991b1b'}}>{parseFloat(n.note).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                {a.stats.lecons>0&&(
                  <div style={{marginTop:8,display:'flex',gap:14,fontSize:'0.78rem',flexWrap:'wrap',paddingTop:8,borderTop:'1px solid #f3f4f6'}}>
                    <span style={{color:'#9ca3af'}}>Total: <b style={{color:'#0f2044'}}>{a.stats.total.toFixed(2)}</b></span>
                    <span style={{color:'#9ca3af'}}>Moyenne: <b style={{color:a.stats.moyenne>=10?'#16a34a':'#dc2626'}}>{a.stats.moyenne?.toFixed(2)}/20</b></span>
                    <MentionBadge moyenne={a.stats.moyenne}/>
                  </div>
                )}
              </div>
            ) : (
              <div style={{padding:'12px 16px',color:'#9ca3af',fontSize:'0.82rem',fontStyle:'italic'}}>
                {a.accessible?'Aucune note saisie':'🔒 Année non accessible — validez l\'année précédente'}
              </div>
            )}
          </div>
        ))}

        {/* Infos perso */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',marginTop:4,fontSize:'0.8rem'}}>
          {[
            ['Téléphone',etudiant.telephone],['Adresse',etudiant.adresse],
            ['Source info',etudiant.source_info],['Volontaire responsable',etudiant.volontaire_responsable],
            ['Église',etudiant.eglise?.nom],['Hiérarchie',etudiant.eglise?.hierarchie],
          ].filter(([,v])=>v).map(([label,value])=>(
            <div key={label}>
              <p style={{fontSize:'0.68rem',color:'#9ca3af',marginBottom:1,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p>
              <p style={{fontWeight:500,color:'#0f2044'}}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'flex',gap:8,justifyContent:'flex-end',padding:'12px 24px',borderTop:'1px solid #f3f4f6',background:'#fafafa',flexWrap:'wrap'}}>
        <Btn variant="secondary" onClick={printBulletin}>🖨️ Bulletin de notes</Btn>
        {annees.some(a=>a.stats?.valide)&&(
          <Btn variant="gold" onClick={()=>printDiploma(etudiant)}
            style={{background:'linear-gradient(135deg,#8B4513,#c9a84c)',color:'white',boxShadow:'0 4px 14px rgba(139,69,19,0.3)'}}>
            🎓 Imprimer le Diplôme
          </Btn>
        )}
        {canEdit&&<Btn variant="secondary" onClick={()=>{onClose();onNotes(etudiant);}}>📝 Saisir notes</Btn>}
        {canEdit&&<Btn variant="primary" onClick={()=>{onClose();onEdit(etudiant);}}>✏️ Modifier</Btn>}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// FORMULAIRE INSCRIPTION
// ══════════════════════════════════════════════════════════════
const defaultForm = {
  prenom:'',nom:'',date_naissance:'',sexe:'Homme',situation_matrimoniale:'Célibataire',
  adresse:'',bp:'',code_postal:'',telephone:'',
  situation:{type:'Étudiant',niveau:'',profession:''},
  eglise:{nom:'',adresse:'',hierarchie:'Paroisse'},
  source_info:'',langue:'Français',volontaire_responsable:'',
  date_inscription:new Date().toISOString().split('T')[0],
};

function InscriptionModal({ open, onClose, editing, onSaved }) {
  const [form,   setForm]   = useState(defaultForm);
  const [tab,    setTab]    = useState('perso');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    if (!open) return;
    if (editing) {
      setForm({
        prenom:editing.prenom||'',nom:editing.nom||'',
        date_naissance:editing.date_naissance?editing.date_naissance.split('T')[0]:'',
        sexe:editing.sexe||'Homme',
        situation_matrimoniale:editing.situation_matrimoniale||'Célibataire',
        adresse:editing.adresse||'',bp:editing.bp||'',code_postal:editing.code_postal||'',
        telephone:editing.telephone||'',
        situation:editing.situation||{type:'Étudiant',niveau:'',profession:''},
        eglise:editing.eglise||{nom:'',adresse:'',hierarchie:'Paroisse'},
        source_info:editing.source_info||'',langue:editing.langue||'Français',
        volontaire_responsable:editing.volontaire_responsable||'',
        date_inscription:editing.date_inscription?editing.date_inscription.split('T')[0]:new Date().toISOString().split('T')[0],
        statut:editing.statut||'actif',
      });
    } else {
      setForm({...defaultForm,date_inscription:new Date().toISOString().split('T')[0]});
    }
    setTab('perso');
  },[open,editing]);

  const f  = (k,v) => setForm(p=>({...p,[k]:v}));
  const fs = (k,v) => setForm(p=>({...p,situation:{...p.situation,[k]:v}}));
  const fe = (k,v) => setForm(p=>({...p,eglise:{...p.eglise,[k]:v}}));

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await api.put(`/bcc/etudiants/${editing.id}`,form); toast.success('Mis à jour'); }
      else         { await api.post('/bcc/etudiants',form); toast.success('Étudiant inscrit !'); }
      onSaved(); onClose();
    } catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
    finally { setSaving(false); }
  };

  // Afficher la structure du cours sélectionné
  const STRUCT = {
    Français: ['Première Année (10 leçons)'],
    English:  ['First Year (10 leçons)','Second Year (10 leçons)'],
    Malagasy: ['Ambaratonga Voalohany (10 lesona)','Ambaratonga Faharoa (10 lesona)'],
  };

  const FORM_TABS = [
    {id:'perso',label:'👤 Personnel'},{id:'coordo',label:'📍 Coordonnées'},
    {id:'situation',label:'🎓 Situation'},{id:'eglise',label:'⛪ Église'},
    {id:'admin',label:'📋 Administratif'},
  ];

  return (
    <Modal open={open} onClose={onClose}
      title={editing?`✏️ Modifier — ${editing.prenom} ${editing.nom}`:'📝 Nouvelle inscription BCC'}
      width={700}>
      <form onSubmit={handleSubmit}>
        <div style={{display:'flex',borderBottom:'2px solid #f3f4f6',overflowX:'auto'}}>
          {FORM_TABS.map(t=>(
            <button key={t.id} type="button" onClick={()=>setTab(t.id)}
              style={{padding:'9px 16px',border:'none',background:'transparent',cursor:'pointer',
                fontSize:'0.78rem',fontWeight:600,whiteSpace:'nowrap',
                color:tab===t.id?'#0f2044':'#9ca3af',
                borderBottom:tab===t.id?'2px solid #c9a84c':'2px solid transparent',marginBottom:'-2px'}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{padding:'18px 24px',minHeight:260}}>
          {tab==='perso'&&<>
            <FormRow>
              <FormField label="Prénom *"><input value={form.prenom} onChange={e=>f('prenom',e.target.value)} required/></FormField>
              <FormField label="Nom *"><input value={form.nom} onChange={e=>f('nom',e.target.value)} required/></FormField>
            </FormRow>
            <FormRow>
              <FormField label="Date de naissance"><input type="date" value={form.date_naissance} onChange={e=>f('date_naissance',e.target.value)}/></FormField>
              <FormField label="Sexe"><select value={form.sexe} onChange={e=>f('sexe',e.target.value)}>{SEXES.map(s=><option key={s}>{s}</option>)}</select></FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Situation matrimoniale">
                <select value={form.situation_matrimoniale} onChange={e=>f('situation_matrimoniale',e.target.value)}>
                  {SITUATIONS_MATRI.map(s=><option key={s}>{s}</option>)}
                </select>
              </FormField>
            </FormRow>
          </>}

          {tab==='coordo'&&<>
            <FormRow cols={1}><FormField label="Adresse complète"><input value={form.adresse} onChange={e=>f('adresse',e.target.value)}/></FormField></FormRow>
            <FormRow>
              <FormField label="Boîte Postale"><input value={form.bp} onChange={e=>f('bp',e.target.value)} placeholder="BP 1234"/></FormField>
              <FormField label="Code postal"><input value={form.code_postal} onChange={e=>f('code_postal',e.target.value)}/></FormField>
            </FormRow>
            <FormRow cols={1}><FormField label="Téléphone"><input value={form.telephone} onChange={e=>f('telephone',e.target.value)}/></FormField></FormRow>
          </>}

          {tab==='situation'&&<>
            <FormRow cols={1}>
              <FormField label="Situation">
                <select value={form.situation.type} onChange={e=>fs('type',e.target.value)}>
                  {['Étudiant','Employé','Autre'].map(s=><option key={s}>{s}</option>)}
                </select>
              </FormField>
            </FormRow>
            {form.situation.type==='Étudiant'&&<FormRow cols={1}><FormField label="Niveau"><select value={form.situation.niveau||''} onChange={e=>fs('niveau',e.target.value)}><option value="">—</option>{['Collège','Lycée','Université'].map(n=><option key={n}>{n}</option>)}</select></FormField></FormRow>}
            {form.situation.type==='Employé'&&<FormRow cols={1}><FormField label="Profession"><input value={form.situation.profession||''} onChange={e=>fs('profession',e.target.value)}/></FormField></FormRow>}
            <FormRow cols={1}>
              <FormField label="Comment a-t-il connu le cours ?">
                <select value={form.source_info} onChange={e=>f('source_info',e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {SOURCES_INFO.map(s=><option key={s}>{s}</option>)}
                </select>
              </FormField>
            </FormRow>
          </>}

          {tab==='eglise'&&<>
            <FormRow cols={1}><FormField label="Nom de l'église"><input value={form.eglise.nom||''} onChange={e=>fe('nom',e.target.value)}/></FormField></FormRow>
            <FormRow cols={1}><FormField label="Adresse de l'église"><input value={form.eglise.adresse||''} onChange={e=>fe('adresse',e.target.value)}/></FormField></FormRow>
            <FormRow cols={1}><FormField label="Hiérarchie"><select value={form.eglise.hierarchie||'Paroisse'} onChange={e=>fe('hierarchie',e.target.value)}>{HIERARCHIES.map(h=><option key={h}>{h}</option>)}</select></FormField></FormRow>
          </>}

          {tab==='admin'&&<>
            <FormRow>
              <FormField label="Langue du cours *">
                <select value={form.langue} onChange={e=>f('langue',e.target.value)} required>
                  {LANGUES.map(l=><option key={l}>{l}</option>)}
                </select>
              </FormField>
              <FormField label="Date d'inscription *">
                <input type="date" value={form.date_inscription} onChange={e=>f('date_inscription',e.target.value)} required/>
              </FormField>
            </FormRow>

            {/* Aperçu structure */}
            <div style={{background:'#f0f4ff',border:'1px solid #c7d2fe',borderRadius:10,padding:'12px 16px',marginBottom:14}}>
              <p style={{fontSize:'0.75rem',fontWeight:700,color:'#3730a3',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                📚 Structure du cours — {form.langue}
              </p>
              {(STRUCT[form.langue]||[]).map((a,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{background:'#c7d2fe',color:'#3730a3',borderRadius:'50%',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,flexShrink:0}}>{i+1}</span>
                  <span style={{fontSize:'0.82rem',color:'#1e1b4b'}}>{a}</span>
                </div>
              ))}
            </div>

            <FormRow cols={1}>
              <FormField label="Volontaire responsable">
                <input value={form.volontaire_responsable} onChange={e=>f('volontaire_responsable',e.target.value)}/>
              </FormField>
            </FormRow>
            {editing&&<FormRow cols={1}><FormField label="Statut"><select value={form.statut||'actif'} onChange={e=>f('statut',e.target.value)}><option value="actif">Actif</option><option value="inactif">Inactif</option></select></FormField></FormRow>}
          </>}
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',padding:'12px 24px',borderTop:'1px solid #f3f4f6',background:'#fafafa'}}>
          <Btn type="button" variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn type="submit" variant="gold" disabled={saving}>{saving?'Enregistrement...':editing?'💾 Mettre à jour':'✅ Inscrire'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function BCCPage() {
  const { hasRole }   = useAuth();
  const canEdit       = hasRole('super_admin','admin','assistant_admin','responsable_bcc','direction');

  const [tab,         setTab]       = useState('dashboard');
  const [etudiants,   setEtudiants] = useState([]);
  const [stats,       setStats]     = useState(null);
  const [loading,     setLoading]   = useState(false);
  const [search,      setSearch]    = useState('');
  const [filterLang,  setFilterLang]= useState('');
  const [filterStatut,setFilterStatut]=useState('');

  const [inscModal,   setInscModal] = useState(false);
  const [noteModal,   setNoteModal] = useState(false);
  const [detailModal, setDetailModal]=useState(false);
  const [selectedEt,  setSelectedEt]=useState(null);

  const loadStats = useCallback(async () => {
    try { const r=await api.get('/bcc/stats'); setStats(r.data.data); } catch {}
  },[]);

  const loadEtudiants = useCallback(async () => {
    setLoading(true);
    try {
      const p=new URLSearchParams();
      if(search) p.append('search',search);
      if(filterLang) p.append('langue',filterLang);
      if(filterStatut) p.append('statut',filterStatut);
      const r=await api.get(`/bcc/etudiants?${p}`);
      setEtudiants(r.data.data||[]);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  },[search,filterLang,filterStatut]);

  useEffect(()=>{
    document.getElementById('page-title')&&(document.getElementById('page-title').textContent='BCC — Bible Correspondence Course');
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{ if(tab==='etudiants') loadEtudiants(); // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab,search,filterLang,filterStatut,loadEtudiants]);

  const openDetail = async (et) => {
    try { const r=await api.get(`/bcc/etudiants/${et.id}`); setSelectedEt(r.data.data); setDetailModal(true); }
    catch { toast.error('Erreur'); }
  };

  const openNotes = (et) => { setSelectedEt(et); setNoteModal(true); };
  const openEdit  = (et) => { setSelectedEt(et); setInscModal(true); };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cet étudiant et toutes ses notes ?')) return;
    try { await api.delete(`/bcc/etudiants/${id}`); toast.success('Supprimé'); loadEtudiants(); loadStats(); }
    catch { toast.error('Erreur'); }
  };

  const onSaved = () => { loadEtudiants(); loadStats(); };

  const printDiploma = (et) => {
    const now = new Date().toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'});
    const validatedYears = (et.progression?.annees||[]).filter(a=>a.stats?.valide);
    const yearBlocks = validatedYears.map(a=>`
      <div class="year-badge">
        <span class="year-label">${a.label}</span>
        <span class="year-score">${a.stats.pourcentage?.toFixed(1)||a.stats.moyenne?.toFixed(1)||'—'}%</span>
      </div>`).join('');
    const mention = getMention(et.moyenne_globale);
    const mentionStyle = MENTION_STYLE[mention] || { bg:'#f3f4f6', color:'#6b7280' };
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Diplôme BCC</title>
<style>
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Georgia',serif;background:#fff;width:297mm;height:210mm;display:flex;align-items:center;justify-content:center}
.diploma{width:270mm;height:190mm;border:8px double #c9a84c;border-radius:16px;padding:28px 36px;position:relative;
  background:linear-gradient(135deg,#fffdf5 0%,#fdf8e8 50%,#fffdf5 100%);text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.corner{position:absolute;font-size:28px;opacity:.25}
.corner.tl{top:14px;left:18px}.corner.tr{top:14px;right:18px}.corner.bl{bottom:14px;left:18px}.corner.br{bottom:14px;right:18px}
.org{font-size:11px;font-weight:700;color:#0f2044;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}
.title{font-size:38px;font-weight:700;color:#0f2044;letter-spacing:2px;margin:6px 0;font-style:italic}
.subtitle{font-size:12px;color:#c9a84c;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px}
.divider{width:180px;height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto 14px}
.cert-text{font-size:13px;color:#555;margin-bottom:6px}
.name{font-size:30px;font-weight:700;color:#0f2044;font-style:italic;margin:4px 0 6px;border-bottom:1px solid #c9a84c;padding-bottom:4px;display:inline-block;min-width:200px}
.course{font-size:13px;color:#555;margin-bottom:12px}
.years{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:8px 0}
.year-badge{background:#0f2044;color:white;padding:5px 16px;border-radius:20px;font-size:11px;font-weight:700}
.year-score{margin-left:8px;background:#c9a84c;color:#0f2044;padding:1px 7px;border-radius:10px;font-size:10px}
.mention-box{display:inline-block;background:${mentionStyle.bg};color:${mentionStyle.color};padding:5px 22px;border-radius:20px;font-size:13px;font-weight:700;margin:6px 0;border:1px solid ${mentionStyle.color}40}
.footer{display:flex;justify-content:space-between;align-items:flex-end;width:100%;margin-top:8px}
.sig{text-align:center;font-size:10px;color:#9ca3af;min-width:120px}
.sig-line{width:100px;height:1px;background:#9ca3af;margin:0 auto 3px}
.stamp{font-size:10px;color:#9ca3af;text-align:center}
.num{font-family:monospace;font-size:10px;color:#c9a84c;font-weight:700;background:#0f2044;padding:2px 8px;border-radius:4px}
</style></head>
<body><div class="diploma">
  <span class="corner tl">✦</span><span class="corner tr">✦</span>
  <span class="corner bl">✦</span><span class="corner br">✦</span>
  <div>
    <div class="org">LHM Madagascar — Feon'ny Filazantsara</div>
    <div class="title">Diplôme</div>
    <div class="subtitle">Bible Correspondence Course</div>
    <div class="divider"></div>
    <div class="cert-text">Ce diplôme est décerné à</div>
    <div class="name">${et.prenom} ${et.nom}</div>
    <div class="course">pour avoir complété avec succès le programme BCC — ${et.langue}</div>
    <div class="years">${yearBlocks}</div>
    ${mention?`<div class="mention-box">Mention : ${mention}</div>`:''}
    <div style="font-size:10px;color:#9ca3af;margin-top:4px">Délivré le ${now}</div>
  </div>
  <div class="footer">
    <div class="sig"><div class="sig-line"></div>Responsable BCC</div>
    <div class="stamp"><div class="num">${et.numero_etudiant}</div><div style="margin-top:3px">N° Étudiant</div></div>
    <div class="sig"><div class="sig-line"></div>Directeur LHM</div>
  </div>
</div></body></html>`;
    const w=window.open('','_blank');w.document.write(html);w.document.close();w.onload=()=>w.print();
  };

  const MENTION_COLORS = { 'Très Bien':'#16a34a','Bien':'#2563eb','Assez Bien':'#7c3aed','Passable':'#d97706','Insuffisant':'#dc2626' };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12,flexWrap:'wrap'}}>
          <div style={{background:'linear-gradient(135deg,#0f2044,#1a3a6e)',padding:'10px 18px',borderRadius:12,color:'white',display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:'1.6rem'}}>📖</span>
            <div>
              <p style={{fontWeight:700,fontSize:'1.05rem',fontFamily:"'Playfair Display',serif"}}>BCC</p>
              <p style={{fontSize:'0.7rem',opacity:.8}}>Bible Correspondence Course</p>
            </div>
          </div>
          {stats&&(
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[
                {label:'Étudiants',value:stats.total,color:'#0f2044',icon:'👤'},
                {label:'Actifs',value:stats.parStatut?.actif||0,color:'#0891b2',icon:'📚'},
                {label:'Terminés',value:stats.parStatut?.termine||0,color:'#16a34a',icon:'🎓'},
              ].map(s=>(
                <div key={s.label} style={{background:'white',borderRadius:10,boxShadow:'0 1px 8px rgba(15,32,68,0.08)',
                  padding:'10px 16px',borderLeft:`3px solid ${s.color}`}}>
                  <p style={{fontSize:'0.7rem',color:'#9ca3af',marginBottom:2}}>{s.icon} {s.label}</p>
                  <p style={{fontSize:'1.6rem',fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'2px solid #f3f4f6',gap:0,overflowX:'auto'}}>
          {[{id:'dashboard',label:'📊 Tableau de bord'},{id:'etudiants',label:'👤 Étudiants'},{id:'structure',label:'📚 Structure des cours'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'10px 20px',border:'none',background:'transparent',cursor:'pointer',
                fontSize:'0.85rem',fontWeight:600,whiteSpace:'nowrap',
                color:tab===t.id?'#0f2044':'#9ca3af',
                borderBottom:tab===t.id?'2px solid #c9a84c':'2px solid transparent',marginBottom:'-2px'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ DASHBOARD ══ */}
      {tab==='dashboard'&&stats&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:20}}>
            {[['🇫🇷','Français','#0f2044'],['🇬🇧','English','#0891b2'],['🇲🇬','Malagasy','#7c3aed']].map(([f,l,c])=>(
              <div key={l} style={{background:'white',borderRadius:12,boxShadow:'0 1px 8px rgba(15,32,68,0.08)',padding:'18px 20px',borderLeft:`4px solid ${c}`}}>
                <p style={{fontSize:'0.75rem',color:'#9ca3af',marginBottom:4}}>{f} {l}</p>
                <p style={{fontSize:'2.2rem',fontWeight:700,color:c,lineHeight:1}}>{stats.parLangue[l]||0}</p>
                <p style={{fontSize:'0.7rem',color:'#9ca3af',marginTop:3}}>étudiant(s)</p>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {/* Mentions */}
            <Card>
              <CardHeader title="Répartition des mentions" subtitle="Basée sur la moyenne globale"/>
              {Object.entries(stats.mentions||{}).map(([m,count])=>{
                const total=Math.max(stats.total,1);
                const pct=Math.round((count/total)*100);
                const color=MENTION_COLORS[m]||'#9ca3af';
                return (
                  <div key={m} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',marginBottom:3}}>
                      <span style={{fontWeight:600,color}}>{m}</span>
                      <span style={{color:'#9ca3af'}}>{count} ({pct}%)</span>
                    </div>
                    <ProgressBar value={count} max={Math.max(stats.total,1)} color={color}/>
                  </div>
                );
              })}
            </Card>

            {/* Par année dynamique */}
            <Card>
              <CardHeader title="Progression par année" subtitle="Toutes langues confondues"/>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {(stats.parAnnee||[]).map((a,i)=>(
                  <div key={i} style={{border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',background:'#fafafa'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,flexWrap:'wrap',gap:4}}>
                      <div>
                        <p style={{fontWeight:600,fontSize:'0.82rem',color:'#0f2044'}}>{a.label}</p>
                        <p style={{fontSize:'0.7rem',color:'#9ca3af'}}>{a.langue}</p>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {a.valide>0&&<span style={{background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:10,fontSize:'0.72rem',fontWeight:600}}>✅ {a.valide} validé(s)</span>}
                        {a.en_cours>0&&<span style={{background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:10,fontSize:'0.72rem',fontWeight:600}}>📚 {a.en_cours} en cours</span>}
                        {a.non_valide>0&&<span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:10,fontSize:'0.72rem',fontWeight:600}}>❌ {a.non_valide} non validé(s)</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {!(stats.parAnnee?.length)&&<p style={{color:'#9ca3af',fontStyle:'italic',fontSize:'0.82rem'}}>Aucune donnée disponible</p>}
              </div>
            </Card>
          </div>

          {/* Inscriptions récentes */}
          {stats.recentInscriptions?.length>0&&(
            <Card>
              <CardHeader title="Inscriptions récentes" subtitle="5 derniers étudiants inscrits"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
                  <thead>
                    <tr style={{background:'#f9fafb',borderBottom:'2px solid #e5e7eb'}}>
                      {['N° Étudiant','Nom','Langue','Année actuelle','Date inscription'].map(h=>(
                        <th key={h} style={{padding:'9px 14px',textAlign:'left',color:'#9ca3af',fontSize:'0.72rem',textTransform:'uppercase',fontWeight:600}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentInscriptions.map((e,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #f3f4f6'}}>
                        <td style={{padding:'10px 14px',fontFamily:'monospace',fontWeight:700,color:'#0f2044'}}>{e.numero_etudiant}</td>
                        <td style={{padding:'10px 14px',fontWeight:600}}>{e.prenom} {e.nom}</td>
                        <td style={{padding:'10px 14px'}}><span style={{background:'#f3f4f6',padding:'2px 8px',borderRadius:8,fontSize:'0.75rem'}}>{e.langue}</span></td>
                        <td style={{padding:'10px 14px',color:'#6b7280',fontSize:'0.82rem'}}>{e.classe_actuelle}</td>
                        <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:'0.78rem'}}>{e.date_inscription?new Date(e.date_inscription).toLocaleDateString('fr-FR'):'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ ÉTUDIANTS ══ */}
      {tab==='etudiants'&&(
        <>
          <Card style={{marginBottom:14}}>
            <CardHeader title="Liste des Étudiants" subtitle={`${etudiants.length} étudiant(s)`}
              action={canEdit&&<Btn variant="gold" onClick={()=>{setSelectedEt(null);setInscModal(true);}}>➕ Nouvelle inscription</Btn>}/>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:180}}><SearchBar value={search} onChange={setSearch} placeholder="Nom, prénom, numéro..."/></div>
              <select value={filterLang} onChange={e=>setFilterLang(e.target.value)} style={{width:'auto',minWidth:140}}>
                <option value="">Toutes les langues</option>
                {LANGUES.map(l=><option key={l}>{l}</option>)}
              </select>
              <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)} style={{width:'auto'}}>
                <option value="">Tous statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </Card>

          <Card>
            {loading?<Spinner/>:(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
                  <thead>
                    <tr style={{background:'#f9fafb',borderBottom:'2px solid #e5e7eb'}}>
                      {['N° Étudiant','Nom & Prénom','Langue','Années','Progression','Mention','Statut','Actions'].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',color:'#9ca3af',fontSize:'0.72rem',textTransform:'uppercase',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {etudiants.length===0?(
                      <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'#9ca3af',fontStyle:'italic'}}>Aucun étudiant trouvé</td></tr>
                    ):etudiants.map(et=>{
                      const annees = et.progression?.annees||[];
                      return (
                        <tr key={et.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                          <td style={{padding:'11px 14px',fontFamily:'monospace',fontWeight:700,color:'#0f2044',fontSize:'0.78rem'}}>{et.numero_etudiant}</td>
                          <td style={{padding:'11px 14px'}}>
                            <p style={{fontWeight:600,color:'#0f2044'}}>{et.prenom} {et.nom}</p>
                            <p style={{fontSize:'0.7rem',color:'#9ca3af'}}>{et.telephone||''}</p>
                          </td>
                          <td style={{padding:'11px 14px'}}>
                            <span style={{background:'#f3f4f6',padding:'2px 8px',borderRadius:8,fontSize:'0.75rem',fontWeight:600}}>{et.langue}</span>
                          </td>
                          <td style={{padding:'11px 14px'}}>
                            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                              {annees.map(a=>(
                                <span key={a.id} title={a.label}
                                  style={{width:22,height:22,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',
                                    fontSize:'0.65rem',fontWeight:700,
                                    background:a.stats.valide?'#dcfce7':a.stats.complete?'#fee2e2':a.accessible?'#dbeafe':'#f3f4f6',
                                    color:a.stats.valide?'#166534':a.stats.complete?'#991b1b':a.accessible?'#1e40af':'#9ca3af',
                                    border:`1px solid ${a.stats.valide?'#86efac':a.stats.complete?'#fca5a5':a.accessible?'#93c5fd':'#e5e7eb'}`}}>
                                  {a.stats.valide?'✓':a.accessible?a.id:'🔒'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{padding:'11px 14px',minWidth:120}}>
                            {et.moyenne_globale!==null&&et.moyenne_globale!==undefined?(
                              <div>
                                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.7rem',marginBottom:3}}>
                                  <span style={{color:'#9ca3af'}}>Moy.</span>
                                  <span style={{fontWeight:700,color:parseFloat(et.moyenne_globale)>=10?'#16a34a':'#dc2626'}}>
                                    {parseFloat(et.moyenne_globale).toFixed(1)}%
                                  </span>
                                </div>
                                <ProgressBar value={parseFloat(et.moyenne_globale)} max={20} color={parseFloat(et.moyenne_globale)>=10?'#16a34a':'#dc2626'}/>
                              </div>
                            ):<span style={{color:'#9ca3af',fontSize:'0.75rem'}}>Aucune note</span>}
                          </td>
                          <td style={{padding:'11px 14px'}}><MentionBadge moyenne={et.moyenne_globale}/></td>
                          <td style={{padding:'11px 14px'}}>
                            <span style={{background:et.statut==='actif'?'#dcfce7':et.statut==='termine'?'#dbeafe':'#f3f4f6',
                              color:et.statut==='actif'?'#166534':et.statut==='termine'?'#1e40af':'#9ca3af',
                              padding:'2px 10px',borderRadius:10,fontSize:'0.75rem',fontWeight:600}}>
                              {et.statut==='actif'?'📚 Actif':et.statut==='termine'?'🎓 Terminé':'⏸ Inactif'}
                            </span>
                          </td>
                          <td style={{padding:'11px 14px'}}>
                            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                              <Btn size="sm" variant="secondary" onClick={()=>openDetail(et)} title="Détail">👁️</Btn>
                              {et.statut==='termine'&&(
                                <Btn size="sm" onClick={async()=>{
                                  try{const r=await api.get('/bcc/etudiants/'+et.id);printDiploma(r.data.data);}
                                  catch{toast.error('Erreur');}
                                }}
                                  title="Imprimer le diplôme"
                                  style={{background:'linear-gradient(135deg,#8B4513,#c9a84c)',color:'white',border:'none',padding:'5px 10px',borderRadius:8,cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                                  🎓
                                </Btn>
                              )}
                              {canEdit&&<Btn size="sm" variant="secondary" onClick={()=>openNotes(et)} title="Notes">📝</Btn>}
                              {canEdit&&<Btn size="sm" variant="secondary" onClick={()=>openEdit(et)} title="Modifier">✏️</Btn>}
                              {canEdit&&<Btn size="sm" variant="danger" onClick={()=>handleDelete(et.id)}>🗑️</Btn>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══ STRUCTURE DES COURS ══ */}
      {tab==='structure'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
          {Object.entries({
            Français:{flag:'🇫🇷',color:'#0f2044',bg:'#eff6ff'},
            English: {flag:'🇬🇧',color:'#0891b2',bg:'#ecfeff'},
            Malagasy:{flag:'🇲🇬',color:'#7c3aed',bg:'#f5f3ff'},
          }).map(([langue,style])=>{
            const struct = stats?.courseStructure?.[langue]||{annees:[]};
            return (
              <Card key={langue}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <span style={{fontSize:'1.8rem'}}>{style.flag}</span>
                  <div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",color:style.color,fontSize:'1.1rem',fontWeight:700}}>{langue}</h3>
                    <p style={{fontSize:'0.75rem',color:'#9ca3af'}}>{struct.annees?.length||0} année(s)</p>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {(struct.annees||[]).map((a,idx)=>(
                    <div key={a.id} style={{background:style.bg,borderRadius:10,padding:'12px 16px',border:`1px solid ${style.color}20`}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <span style={{background:style.color,color:'white',borderRadius:'50%',width:24,height:24,
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,flexShrink:0}}>
                          {idx+1}
                        </span>
                        <p style={{fontWeight:700,color:style.color,fontSize:'0.88rem'}}>{a.label}</p>
                        {idx>0&&<span style={{background:'#fef9c3',color:'#854d0e',fontSize:'0.65rem',padding:'1px 6px',borderRadius:6,fontWeight:600}}>🔒 Progression requise</span>}
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {(a.lessons||[]).map(l=>(
                          <span key={l.num} style={{background:'white',border:`1px solid ${style.color}30`,
                            color:style.color,fontSize:'0.68rem',padding:'2px 7px',borderRadius:6,fontWeight:500,
                            display:'flex',alignItems:'center',gap:3}}>
                            <span>{a.lessonLabel} {l.num}</span>
                            <span style={{background:`${style.color}20`,borderRadius:4,padding:'0 4px',fontWeight:700}}>/{l.max}</span>
                          </span>
                        ))}
                        <span style={{background:'white',border:`2px solid ${style.color}`,
                          color:style.color,fontSize:'0.7rem',padding:'2px 9px',borderRadius:6,fontWeight:800,marginLeft:4}}>
                          Total: {(a.lessons||[]).reduce((s,l)=>s+l.max,0)} pts
                        </span>
                      </div>
                      <p style={{fontSize:'0.72rem',color:'#9ca3af',marginTop:8}}>
                        🎓 Diplôme disponible après validation (moy. ≥ 10/20)
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══ MODALS ══ */}
      <InscriptionModal
        open={inscModal}
        onClose={()=>{setInscModal(false);setSelectedEt(null);}}
        editing={selectedEt}
        onSaved={onSaved}
      />
      <NoteModal
        open={noteModal}
        onClose={()=>{setNoteModal(false);setSelectedEt(null);}}
        etudiant={selectedEt}
        onSaved={onSaved}
      />
      <DetailModal
        open={detailModal}
        onClose={()=>{setDetailModal(false);setSelectedEt(null);}}
        etudiant={selectedEt}
        onEdit={openEdit}
        onNotes={openNotes}
        canEdit={canEdit}
      />
    </div>
  );
}
