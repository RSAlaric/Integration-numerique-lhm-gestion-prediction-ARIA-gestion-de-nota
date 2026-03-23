import React, { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, Table, Btn, Badge, Modal, FormRow, FormField, SearchBar, Spinner } from '../components/ui/Card';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import logoDark from '../assets/logo-lhm-dark.png';

const SERVICES = ['Direction','Administration','Logistique','Communication','Mobilisation','Technique'];
const CONTRATS = ['CDI','CDD','Bénévole','Stage','Autre'];
const STATUTS_FAMILLE = ['Célibataire','Marié(e)','Divorcé(e)','Veuf/Veuve'];

const defaultForm = {
  first_name:'', last_name:'', maiden_name:'', birth_date:'', birth_place:'',
  address:'', phone:'', email:'', family_situation:'Célibataire',
  emergency_contact:{ nom:'', tel:'' },
  cin_numero:'', cin_date:'', cin_lieu:'',
  rib:'', banque:'',
  poste:'', service:'Administration', contract_type:'CDI', entry_date:'',
  cnaps:'', aro:'', status:'active',
  photo:'',
  doc_diplome:null, doc_cv:null, doc_contrat:null,
};

// ── Photo Upload ─────────────────────────────────────────────
function PhotoUpload({ value, onChange }) {
  const ref = useRef();
  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 3*1024*1024) { toast.error('Photo max 3 Mo'); return; }
    const r = new FileReader();
    r.onload = ev => onChange(ev.target.result);
    r.readAsDataURL(f);
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div onClick={() => ref.current.click()}
        style={{ width:108, height:126, borderRadius:10, border:'2px dashed var(--gold)',
          background:value?'transparent':'#fafafa', cursor:'pointer', overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
        {value ? <img src={value} alt="photo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ textAlign:'center', color:'var(--gray-400)', fontSize:'0.72rem' }}><div style={{ fontSize:'1.8rem', marginBottom:4 }}>📷</div>Photo</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
      <div style={{ display:'flex', gap:5 }}>
        <button type="button" onClick={() => ref.current.click()}
          style={{ fontSize:'0.7rem', padding:'3px 9px', border:'1px solid var(--gold)', borderRadius:5, background:'transparent', color:'var(--gold-dark)', cursor:'pointer', fontWeight:600 }}>
          {value ? '🔄' : '📷'}
        </button>
        {value && <button type="button" onClick={() => onChange('')}
          style={{ fontSize:'0.7rem', padding:'3px 9px', border:'1px solid #ddd', borderRadius:5, background:'transparent', color:'#999', cursor:'pointer' }}>✕</button>}
      </div>
    </div>
  );
}

// ── Document Upload ──────────────────────────────────────────
function DocUpload({ label, icon, value, onChange }) {
  const ref = useRef();
  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 10*1024*1024) { toast.error(`${label} max 10 Mo`); return; }
    const r = new FileReader();
    r.onload = ev => onChange({ name:f.name, data:ev.target.result, type:f.type });
    r.readAsDataURL(f);
  };
  const view = () => {
    if (!value?.data) return;
    const w = window.open('','_blank');
    if (value.type === 'application/pdf') w.document.write(`<iframe src="${value.data}" style="width:100%;height:100vh;border:none"></iframe>`);
    else w.document.write(`<img src="${value.data}" style="max-width:100%;display:block;margin:auto" />`);
    w.document.close();
  };
  const download = () => {
    if (!value?.data) return;
    const a = document.createElement('a'); a.href=value.data; a.download=value.name||label; a.click();
  };
  return (
    <div style={{ border:'1px solid var(--gray-200)', borderRadius:10, padding:'10px 14px',
      background:value?'#f0fdf4':'#fafafa', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
      <div style={{ fontSize:'1.4rem' }}>{icon}</div>
      <div style={{ flex:1, minWidth:100 }}>
        <p style={{ fontWeight:600, fontSize:'0.8rem', color:'var(--navy)', marginBottom:2 }}>{label}</p>
        {value ? <p style={{ fontSize:'0.72rem', color:'#16a34a', wordBreak:'break-all' }}>✅ {value.name}</p>
          : <p style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>Aucun fichier</p>}
      </div>
      <input ref={ref} type="file" accept=".pdf,image/*" onChange={handleFile} style={{ display:'none' }} />
      <div style={{ display:'flex', gap:5 }}>
        {value && <>
          <button type="button" onClick={view} style={{ fontSize:'0.72rem', padding:'3px 8px', border:'1px solid var(--navy)', borderRadius:6, background:'var(--navy)', color:'white', cursor:'pointer' }}>👁️</button>
          <button type="button" onClick={download} style={{ fontSize:'0.72rem', padding:'3px 8px', border:'1px solid #16a34a', borderRadius:6, background:'white', color:'#16a34a', cursor:'pointer' }}>⬇️</button>
          <button type="button" onClick={() => onChange(null)} style={{ fontSize:'0.72rem', padding:'3px 8px', border:'1px solid #ddd', borderRadius:6, background:'white', color:'#999', cursor:'pointer' }}>✕</button>
        </>}
        <button type="button" onClick={() => ref.current.click()}
          style={{ fontSize:'0.72rem', padding:'3px 8px', border:'1px solid var(--gold)', borderRadius:6, background:'transparent', color:'var(--gold-dark)', cursor:'pointer', fontWeight:600 }}>
          {value ? '🔄' : '📎'}
        </button>
      </div>
    </div>
  );
}

// ── Print Fiche ──────────────────────────────────────────────
function printFiche(p) {
  const now = new Date().toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'});
  const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  const logoSrc = window.location.origin + '/logo-lhm-dark.png';
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Fiche — ${p.first_name} ${p.last_name}</title>
<style>
  @page{size:A4;margin:14mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:10px;color:#222}
  .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:10px;border-bottom:3px solid #0f2044}
  .hdr img{height:42px;object-fit:contain}
  .identity{background:linear-gradient(135deg,#0f2044,#1a3a6e);color:white;padding:14px 16px;border-radius:8px;margin-bottom:14px;display:flex;align-items:center;gap:14px}
  .ph{width:70px;height:84px;border:2px solid #c9a84c;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#1a3a6e;flex-shrink:0}
  .ph img{width:100%;height:100%;object-fit:cover}
  .id-text h2{font-size:16px;font-weight:700}
  .id-text p{font-size:9px;opacity:.8;margin-top:2px}
  .mat{font-family:monospace;background:rgba(201,168,76,.3);padding:2px 8px;border-radius:4px;font-size:10px;color:#c9a84c;font-weight:700;display:inline-block;margin-top:4px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:12px}
  .sec{font-size:8.5px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:.07em;margin:10px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:3px}
  .field label{font-size:7.5px;color:#9ca3af;text-transform:uppercase;display:block;margin-bottom:1px}
  .field span{font-size:9.5px;color:#0f2044;font-weight:500}
  .rib{font-family:monospace;font-size:9px;background:#f0f4ff;padding:2px 6px;border-radius:4px;color:#1e3a8a}
  .ftr{margin-top:14px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:6px}
</style></head><body>
<div class="hdr">
  <img src="${logoSrc}" onerror="this.style.display='none'" />
  <div style="text-align:right">
    <p style="font-size:13px;font-weight:700;color:#0f2044">Fiche du Personnel</p>
    <p style="font-size:8px;color:#666">Imprimé le ${now}</p>
  </div>
</div>
<div class="identity">
  <div class="ph">${p.photo?`<img src="${p.photo}"/>`:'<div style="font-size:1.8rem;color:#ccc">👤</div>'}</div>
  <div class="id-text">
    <h2>${p.first_name} ${p.last_name}${p.maiden_name?` (née ${p.maiden_name})`:''}</h2>
    <p>${p.poste||''} — ${p.service||''}</p>
    <p>${p.email||''} | ${p.phone||''}</p>
    <div class="mat">${p.matricule||'—'}</div>
  </div>
</div>
<div class="grid">
  <div>
    <div class="sec">A — Informations personnelles</div>
    <div class="grid">
      <div class="field"><label>Naissance</label><span>${fmt(p.birth_date)}</span></div>
      <div class="field"><label>Lieu</label><span>${p.birth_place||'—'}</span></div>
      <div class="field"><label>Situation familiale</label><span>${p.family_situation||'—'}</span></div>
      ${p.family_situation==='Marié(e)'&&p.maiden_name?`<div class="field"><label>Conjoint(e)</label><span>${p.maiden_name}</span></div>`:''}
      <div class="field"><label>Adresse</label><span>${p.address||'—'}</span></div>
      <div class="field"><label>Contact urgence</label><span>${p.emergency_contact?.nom||'—'}</span></div>
      <div class="field"><label>Tél. urgence</label><span>${p.emergency_contact?.tel||'—'}</span></div>
    </div>
    <div class="sec">B — Professionnel</div>
    <div class="grid">
      <div class="field"><label>Contrat</label><span>${p.contract_type||'—'}</span></div>
      <div class="field"><label>Entrée</label><span>${fmt(p.entry_date)}</span></div>
      <div class="field"><label>Statut</label><span>${p.status||'—'}</span></div>
    </div>
  </div>
  <div>
    <div class="sec">C — CIN & Banque</div>
    <div class="grid">
      <div class="field"><label>N° CIN</label><span>${p.cin_numero||'—'}</span></div>
      <div class="field"><label>Date CIN</label><span>${fmt(p.cin_date)}</span></div>
      <div class="field"><label>Faite à</label><span>${p.cin_lieu||'—'}</span></div>
      <div class="field"><label>Banque</label><span>${p.banque||'—'}</span></div>
    </div>
    <div class="field" style="margin-top:4px"><label>Code RIB</label><span class="rib">${p.rib||'—'}</span></div>
    <div class="sec" style="margin-top:10px">D — Administratif</div>
    <div class="grid">
      <div class="field"><label>N° CNAPS</label><span>${p.cnaps||'—'}</span></div>
      <div class="field"><label>N° ARO</label><span>${p.aro||'—'}</span></div>
    </div>
    <div class="sec" style="margin-top:10px">E — Documents</div>
    <div style="font-size:9px">
      ${p.doc_diplome?'✅':'⬜'} Diplôme &nbsp;
      ${p.doc_cv?'✅':'⬜'} CV &nbsp;
      ${p.doc_contrat?'✅':'⬜'} Contrat de travail
    </div>
  </div>
</div>
<div class="ftr">LHM Madagascar — Feon'ny Filazantsara — Document confidentiel</div>
</body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.onload = () => w.print();
}

// ── PAGE ─────────────────────────────────────────────────────
export default function PersonnelPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('super_admin','admin','assistant_admin','rh');
  const [personnel,setPersonnel]=useState([]);
  const [loading,  setLoading]  =useState(true);
  const [search,   setSearch]   =useState('');
  const [filterSvc,setFilterSvc]=useState('');
  const [modalOpen,setModalOpen]=useState(false);
  const [editing,  setEditing]  =useState(null);
  const [form,     setForm]     =useState(defaultForm);
  const [saving,   setSaving]   =useState(false);
  const [activeTab,setActiveTab]=useState('perso');

  useEffect(()=>{
    document.getElementById('page-title')&&(document.getElementById('page-title').textContent='Gestion du Personnel');
    load();
  },[]);

  useEffect(()=>{ load(); },[search,filterSvc]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status','');
      if (search)    params.append('search',search);
      if (filterSvc) params.append('service',filterSvc);
      const r = await api.get(`/personnel?${params}`);
      setPersonnel(r.data.data||[]);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const openModal = (p=null) => {
    setEditing(p);
    setForm(p ? {
      first_name:p.first_name||'', last_name:p.last_name||'',
      maiden_name:p.maiden_name||'', birth_date:p.birth_date?p.birth_date.split('T')[0]:'',
      birth_place:p.birth_place||'', address:p.address||'', phone:p.phone||'', email:p.email||'',
      family_situation:p.family_situation||'Célibataire',
      emergency_contact:p.emergency_contact||{nom:'',tel:''},
      cin_numero:p.cin_numero||'', cin_date:p.cin_date?p.cin_date.split('T')[0]:'', cin_lieu:p.cin_lieu||'',
      rib:p.rib||'', banque:p.banque||'',
      poste:p.poste||'', service:p.service||'Administration', contract_type:p.contract_type||'CDI',
      entry_date:p.entry_date?p.entry_date.split('T')[0]:'',
      cnaps:p.cnaps||'', aro:p.aro||'', status:p.status||'active',
      photo:p.photo||'',
      doc_diplome:p.doc_diplome||null, doc_cv:p.doc_cv||null, doc_contrat:p.doc_contrat||null,
    } : defaultForm);
    setActiveTab('perso');
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await api.put(`/personnel/${editing.id}`,form); toast.success('Mis à jour'); }
      else { await api.post('/personnel',form); toast.success('Personnel créé'); }
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message||'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Désactiver ce membre ?')) return;
    try { await api.delete(`/personnel/${id}`); toast.success('Désactivé'); load(); }
    catch { toast.error('Erreur'); }
  };

  const f = (k,v) => setForm(prev=>({...prev,[k]:v}));
  const fEC = (k,v) => setForm(prev=>({...prev,emergency_contact:{...prev.emergency_contact,[k]:v}}));

  const columns = [
    { key:'photo', header:'', render:(v,row)=>(
      <div style={{width:36,height:42,borderRadius:7,overflow:'hidden',border:'1.5px solid var(--gray-200)',background:'var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {v?<img src={v} alt={row.first_name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:'1.1rem'}}>👤</span>}
      </div>
    )},
    { key:'last_name', header:'Nom & Prénom', render:(_,r)=>(
      <div>
        <p style={{fontWeight:600,color:'var(--navy)'}}>{r.first_name} {r.last_name}</p>
        <p style={{fontSize:'0.72rem',color:'var(--gray-400)'}}>{r.matricule}</p>
      </div>
    )},
    { key:'poste',   header:'Poste' },
    { key:'service', header:'Service', render:v=><Badge type="info">{v}</Badge> },
    { key:'contract_type', header:'Contrat', render:v=><Badge type="gold">{v}</Badge> },
    { key:'cin_numero', header:'N° CIN', render:v=><span style={{fontFamily:'monospace',fontSize:'0.8rem'}}>{v||'—'}</span> },
    { key:'status', header:'Statut', render:v=><Badge type={v==='active'?'success':'error'}>{v}</Badge> },
    { key:'actions', header:'Actions', render:(_,row)=>(
      <div style={{display:'flex',gap:5}}>
        <Btn size="sm" variant="secondary" onClick={()=>printFiche(row)} title="Imprimer fiche">🖨️</Btn>
        <Btn size="sm" variant="secondary" onClick={()=>openModal(row)}>✏️</Btn>
        {canEdit&&<Btn size="sm" variant="danger" onClick={()=>handleDelete(row.id)}>🗑️</Btn>}
      </div>
    )},
  ];

  const TABS = [
    {id:'perso',    label:'👤 Personnel'},
    {id:'coordo',   label:'📍 Coordonnées'},
    {id:'admin_fin',label:'🏦 Administratif'},
    {id:'docs',     label:'📎 Documents'},
  ];

  return (
    <div className="animate-fade">
      <Card style={{marginBottom:16}}>
        <CardHeader title="Gestion du Personnel" subtitle={`${personnel.length} membre(s)`}
          action={canEdit&&<Btn variant="gold" onClick={()=>openModal()}>➕ Nouveau membre</Btn>} />
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180}}><SearchBar value={search} onChange={setSearch} placeholder="Rechercher nom, matricule..." /></div>
          <select value={filterSvc} onChange={e=>setFilterSvc(e.target.value)} style={{width:'auto',minWidth:150}}>
            <option value="">Tous les services</option>
            {SERVICES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </Card>
      <Card>{loading?<Spinner/>:<Table columns={columns} data={personnel} emptyMessage="Aucun personnel enregistré"/>}</Card>

      {/* Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editing?`✏️ Modifier — ${editing.first_name} ${editing.last_name}`:'➕ Nouveau membre'}
        width={740}>
        <form onSubmit={handleSave}>
          {/* Photo + ID rapide */}
          <div style={{display:'flex',gap:20,padding:'16px 24px',background:'linear-gradient(135deg,#f8faff,#eff6ff)',borderBottom:'1px solid var(--gray-200)',flexWrap:'wrap'}}>
            <PhotoUpload value={form.photo} onChange={v=>f('photo',v)} />
            <div style={{flex:1,minWidth:200}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
                <FormField label="Prénom *"><input value={form.first_name} onChange={e=>f('first_name',e.target.value)} required /></FormField>
                <FormField label="Nom *"><input value={form.last_name} onChange={e=>f('last_name',e.target.value)} required /></FormField>
                <FormField label="Poste *"><input value={form.poste} onChange={e=>f('poste',e.target.value)} required /></FormField>
                <FormField label="Service">
                  <select value={form.service} onChange={e=>f('service',e.target.value)}>
                    {SERVICES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',borderBottom:'2px solid var(--gray-100)',overflowX:'auto'}}>
            {TABS.map(t=>(
              <button key={t.id} type="button" onClick={()=>setActiveTab(t.id)}
                style={{padding:'9px 16px',border:'none',background:'transparent',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,whiteSpace:'nowrap',
                  color:activeTab===t.id?'var(--navy)':'var(--gray-400)',
                  borderBottom:activeTab===t.id?'2px solid var(--gold)':'2px solid transparent',marginBottom:'-2px'}}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{padding:'18px 24px',minHeight:240}}>
            {activeTab==='perso'&&<>
              <FormRow>
                <FormField label="Date de naissance"><input type="date" value={form.birth_date} onChange={e=>f('birth_date',e.target.value)}/></FormField>
                <FormField label="Lieu de naissance"><input value={form.birth_place} onChange={e=>f('birth_place',e.target.value)}/></FormField>
              </FormRow>
              <FormRow>
                <FormField label="Situation familiale">
                  <select value={form.family_situation} onChange={e=>f('family_situation',e.target.value)}>
                    {STATUTS_FAMILLE.map(s=><option key={s}>{s}</option>)}
                  </select>
                </FormField>
                {form.family_situation==='Marié(e)'
                  ? <FormField label="Nom du conjoint(e)"><input value={form.maiden_name} onChange={e=>f('maiden_name',e.target.value)} placeholder="Nom du mari / de l'épouse"/></FormField>
                  : <div/>}
              </FormRow>
              {form.family_situation==='Marié(e)'&&form.maiden_name&&(
                <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:'0.82rem',color:'#166534'}}>
                  💍 Conjoint(e) : <strong>{form.maiden_name}</strong>
                </div>
              )}
              {form.family_situation==='Célibataire'&&(
                <div style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:'0.78rem',color:'var(--gray-400)'}}>
                  👤 Célibataire — aucune information de conjoint
                </div>
              )}
              <FormRow>
                <FormField label="Contact urgence — Nom"><input value={form.emergency_contact.nom} onChange={e=>fEC('nom',e.target.value)}/></FormField>
                <FormField label="Contact urgence — Tél."><input value={form.emergency_contact.tel} onChange={e=>fEC('tel',e.target.value)}/></FormField>
              </FormRow>
            </>}

            {activeTab==='coordo'&&<>
              <FormRow cols={1}><FormField label="Adresse"><input value={form.address} onChange={e=>f('address',e.target.value)}/></FormField></FormRow>
              <FormRow>
                <FormField label="Téléphone"><input value={form.phone} onChange={e=>f('phone',e.target.value)}/></FormField>
                <FormField label="Email"><input type="email" value={form.email} onChange={e=>f('email',e.target.value)}/></FormField>
              </FormRow>
              <FormRow>
                <FormField label="Type de contrat">
                  <select value={form.contract_type} onChange={e=>f('contract_type',e.target.value)}>
                    {CONTRATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Date d'entrée"><input type="date" value={form.entry_date} onChange={e=>f('entry_date',e.target.value)}/></FormField>
              </FormRow>
              <FormRow>
                <FormField label="Statut">
                  <select value={form.status} onChange={e=>f('status',e.target.value)}>
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </FormField>
                <div/>
              </FormRow>
            </>}

            {activeTab==='admin_fin'&&<>
              <p style={{fontSize:'0.78rem',fontWeight:700,color:'var(--gold-dark)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:12}}>Carte d'Identité Nationale</p>
              <FormRow>
                <FormField label="Numéro CIN"><input value={form.cin_numero} onChange={e=>f('cin_numero',e.target.value)} placeholder="101 123 456 789"/></FormField>
                <FormField label="Date d'établissement"><input type="date" value={form.cin_date} onChange={e=>f('cin_date',e.target.value)}/></FormField>
              </FormRow>
              <FormRow cols={1}><FormField label="Faite à (lieu)"><input value={form.cin_lieu} onChange={e=>f('cin_lieu',e.target.value)} placeholder="Antananarivo"/></FormField></FormRow>
              <p style={{fontSize:'0.78rem',fontWeight:700,color:'var(--gold-dark)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:12,marginTop:16}}>Compte Bancaire</p>
              <FormRow>
                <FormField label="Banque"><input value={form.banque} onChange={e=>f('banque',e.target.value)} placeholder="BNI, BOA, SG..."/></FormField>
                <FormField label="Code RIB"><input value={form.rib} onChange={e=>f('rib',e.target.value)} style={{fontFamily:'monospace',letterSpacing:'0.05em'}}/></FormField>
              </FormRow>
              <p style={{fontSize:'0.78rem',fontWeight:700,color:'var(--gold-dark)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:12,marginTop:16}}>Organismes sociaux</p>
              <FormRow>
                <FormField label="N° CNAPS"><input value={form.cnaps} onChange={e=>f('cnaps',e.target.value)}/></FormField>
                <FormField label="N° ARO"><input value={form.aro} onChange={e=>f('aro',e.target.value)}/></FormField>
              </FormRow>
            </>}

            {activeTab==='docs'&&<>
              <p style={{fontSize:'0.8rem',color:'var(--gray-400)',marginBottom:14}}>PDF, JPEG, PNG — Max 10 Mo par document</p>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <DocUpload label="Diplôme" icon="🎓" value={form.doc_diplome} onChange={v=>f('doc_diplome',v)}/>
                <DocUpload label="Curriculum Vitae (CV)" icon="📄" value={form.doc_cv} onChange={v=>f('doc_cv',v)}/>
                <DocUpload label="Contrat de travail" icon="📝" value={form.doc_contrat} onChange={v=>f('doc_contrat',v)}/>
              </div>
            </>}
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'space-between',padding:'12px 24px',borderTop:'1px solid var(--gray-100)',background:'var(--gray-50)'}}>
            <div>{editing&&<Btn type="button" variant="secondary" onClick={()=>printFiche({...form,matricule:editing.matricule})}>🖨️ Imprimer fiche</Btn>}</div>
            <div style={{display:'flex',gap:8}}>
              <Btn type="button" variant="secondary" onClick={()=>setModalOpen(false)}>Annuler</Btn>
              <Btn type="submit" variant="gold" disabled={saving}>{saving?'Enregistrement...':editing?'💾 Mettre à jour':'➕ Créer'}</Btn>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
