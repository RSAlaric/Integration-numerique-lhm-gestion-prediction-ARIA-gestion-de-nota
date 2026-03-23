import React, { useEffect, useState } from 'react';
import { Card, CardHeader, Table, Btn, Badge, Modal, FormRow, FormField, SearchBar, Spinner } from '../components/ui/Card';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const WORKFLOW = ['enrolled','evaluated','assigned','active','recognized'];
const WORKFLOW_FR = { enrolled:'Inscrit', evaluated:'Évalué', assigned:'Affecté', active:'Actif', recognized:'Reconnu' };
const WORKFLOW_COLORS = { enrolled:'default', evaluated:'info', assigned:'warning', active:'success', recognized:'gold' };
const SKILLS = ['Opérateur de saisie','Correcteur BCC','Gestionnaire de stock','Volontaire BCC','Volontaire technicien Radio','Autre'];

const defaultForm = { first_name:'', last_name:'', phone:'', email:'', motivation:'', skills:[], join_date: new Date().toISOString().split('T')[0] };

export default function VolontairesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('super_admin','admin','responsable_volontaires');
  const [volontaires, setVolontaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    document.getElementById('page-title')&&(document.getElementById('page-title').textContent='Gestion des Volontaires');
    load();
  },[]);
  useEffect(()=>{ load(); },[search,filterStatus]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if(search) params.append('search',search);
      if(filterStatus) params.append('status',filterStatus);
      const r = await api.get(`/volunteers?${params}`);
      setVolontaires(r.data.data||[]);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const openModal = (v=null) => {
    setEditing(v);
    setForm(v ? { first_name:v.first_name||'', last_name:v.last_name||'', phone:v.phone||'', email:v.email||'', motivation:v.motivation||'', skills:v.skills||[], join_date:v.join_date?v.join_date.split('T')[0]:new Date().toISOString().split('T')[0] } : defaultForm);
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) { await api.put(`/volunteers/${editing.id}`,form); toast.success('Mis à jour'); }
      else { await api.post('/volunteers',form); toast.success('Volontaire ajouté'); }
      setModalOpen(false); load();
    } catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
    finally{ setSaving(false); }
  };

  const handleAdvance = async id => {
    try{ await api.put(`/volunteers/${id}/workflow`); toast.success('Statut avancé'); load(); }
    catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
  };

  const toggleSkill = s => {
    setForm(prev=>({ ...prev, skills: prev.skills.includes(s) ? prev.skills.filter(x=>x!==s) : [...prev.skills,s] }));
  };

  const f = (k,v) => setForm(prev=>({...prev,[k]:v}));

  const columns = [
    { key:'last_name', header:'Nom & Prénom', render:(_,r)=>(
      <div>
        <p style={{fontWeight:600,color:'var(--navy)'}}>{r.first_name} {r.last_name}</p>
        <p style={{fontSize:'0.72rem',color:'var(--gray-400)'}}>{r.phone||r.email||''}</p>
      </div>
    )},
    { key:'skills', header:'Compétences', render:v=>(
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {(v||[]).slice(0,2).map(s=><Badge key={s} type="info">{s}</Badge>)}
        {(v||[]).length>2&&<Badge type="default">+{v.length-2}</Badge>}
      </div>
    )},
    { key:'status', header:'Statut', render:v=><Badge type={WORKFLOW_COLORS[v]||'default'}>{WORKFLOW_FR[v]||v}</Badge> },
    { key:'join_date', header:'Date d\'adhésion', render:v=>v?new Date(v).toLocaleDateString('fr-FR'):'—' },
    { key:'actions', header:'Actions', render:(_,row)=>(
      <div style={{display:'flex',gap:5}}>
        {canEdit&&WORKFLOW.indexOf(row.status)<WORKFLOW.length-1&&<Btn size="sm" variant="success" onClick={()=>handleAdvance(row.id)} title="Avancer le workflow">▶</Btn>}
        {canEdit&&<Btn size="sm" variant="secondary" onClick={()=>openModal(row)}>✏️</Btn>}
      </div>
    )},
  ];

  return(
    <div className="animate-fade">
      <Card style={{marginBottom:16}}>
        <CardHeader title="Gestion des Volontaires" subtitle={`${volontaires.length} volontaire(s)`}
          action={canEdit&&<Btn variant="gold" onClick={()=>openModal()}>➕ Nouveau volontaire</Btn>} />
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180}}><SearchBar value={search} onChange={setSearch} placeholder="Rechercher..."/></div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{width:'auto',minWidth:140}}>
            <option value="">Tous les statuts</option>
            {WORKFLOW.map(s=><option key={s} value={s}>{WORKFLOW_FR[s]}</option>)}
          </select>
        </div>
      </Card>
      <Card>{loading?<Spinner/>:<Table columns={columns} data={volontaires} emptyMessage="Aucun volontaire enregistré"/>}</Card>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?`✏️ Modifier — ${editing.first_name} ${editing.last_name}`:'➕ Nouveau volontaire'} width={600}>
        <form onSubmit={handleSave} style={{padding:24}}>
          <FormRow>
            <FormField label="Prénom *"><input value={form.first_name} onChange={e=>f('first_name',e.target.value)} required/></FormField>
            <FormField label="Nom *"><input value={form.last_name} onChange={e=>f('last_name',e.target.value)} required/></FormField>
          </FormRow>
          <FormRow>
            <FormField label="Téléphone"><input value={form.phone} onChange={e=>f('phone',e.target.value)}/></FormField>
            <FormField label="Email"><input type="email" value={form.email} onChange={e=>f('email',e.target.value)}/></FormField>
          </FormRow>
          <FormRow cols={1}><FormField label="Date d'adhésion"><input type="date" value={form.join_date} onChange={e=>f('join_date',e.target.value)}/></FormField></FormRow>
          <FormRow cols={1}><FormField label="Motivation"><textarea value={form.motivation} onChange={e=>f('motivation',e.target.value)} rows={3} style={{resize:'vertical'}}/></FormField></FormRow>
          <div style={{marginBottom:16}}>
            <label>Compétences</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:6}}>
              {SKILLS.map(s=>(
                <button key={s} type="button" onClick={()=>toggleSkill(s)}
                  style={{padding:'5px 12px',border:`1.5px solid ${form.skills.includes(s)?'var(--gold)':'var(--gray-200)'}`,borderRadius:20,fontSize:'0.78rem',fontWeight:600,cursor:'pointer',background:form.skills.includes(s)?'rgba(201,168,76,0.1)':'white',color:form.skills.includes(s)?'var(--gold-dark)':'var(--gray-600)'}}>
                  {form.skills.includes(s)?'✓ ':''}{s}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn type="button" variant="secondary" onClick={()=>setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" variant="gold" disabled={saving}>{saving?'Enregistrement...':editing?'💾 Mettre à jour':'➕ Créer'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
