import React, { useEffect, useState } from 'react';
import { Card, CardHeader, Table, Btn, Badge, Modal, FormRow, FormField, SearchBar, Spinner } from '../components/ui/Card';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const STATUTS = ['planning','active','completed','delayed','cancelled'];
const STATUTS_FR = { planning:'Planification', active:'En cours', completed:'Terminé', delayed:'En retard', cancelled:'Annulé' };
const STATUTS_COLORS = { planning:'info', active:'success', completed:'gold', delayed:'error', warning:'warning', cancelled:'default' };
const defaultForm = { name:'', description:'', status:'planning', start_date:'', end_date:'', budget:0, coordinator:'' };

export default function ProjectsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('super_admin','admin','direction','coordinateur');
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]  = useState(null);
  const [form,      setForm]     = useState(defaultForm);
  const [saving,    setSaving]   = useState(false);

  useEffect(()=>{
    document.getElementById('page-title')&&(document.getElementById('page-title').textContent='Gestion des Projets');
    load();
  },[]);
  useEffect(()=>{ load(); },[search,filterStatus]);

  const load = async () => {
    setLoading(true);
    try {
      const params=new URLSearchParams();
      if(search) params.append('search',search);
      if(filterStatus) params.append('status',filterStatus);
      const r = await api.get(`/projects?${params}`);
      setProjects(r.data.data||[]);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const openModal = (p=null) => {
    setEditing(p);
    setForm(p ? { name:p.name||'', description:p.description||'', status:p.status||'planning', start_date:p.start_date?p.start_date.split('T')[0]:'', end_date:p.end_date?p.end_date.split('T')[0]:'', budget:p.budget||0, coordinator:p.coordinator||'' } : defaultForm);
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) { await api.put(`/projects/${editing.id}`,form); toast.success('Mis à jour'); }
      else { await api.post('/projects',form); toast.success('Projet créé'); }
      setModalOpen(false); load();
    } catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
    finally{ setSaving(false); }
  };

  const f = (k,v) => setForm(prev=>({...prev,[k]:v}));

  const columns = [
    { key:'name', header:'Projet', render:(v,r)=>(
      <div>
        <p style={{fontWeight:600,color:'var(--navy)'}}>{v}</p>
        <p style={{fontSize:'0.72rem',color:'var(--gray-400)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description||''}</p>
      </div>
    )},
    { key:'status', header:'Statut', render:v=><Badge type={STATUTS_COLORS[v]||'default'}>{STATUTS_FR[v]||v}</Badge> },
    { key:'progress', header:'Avancement', render:(v,r)=>(
      <div style={{minWidth:100}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',marginBottom:3}}>
          <span>{v||0}%</span>
        </div>
        <div style={{height:6,background:'var(--gray-200)',borderRadius:99,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${v||0}%`,background:r.status==='delayed'?'#dc2626':'#10b981',borderRadius:99}} />
        </div>
      </div>
    )},
    { key:'budget', header:'Budget', render:(v,r)=>(
      <div style={{fontSize:'0.82rem'}}>
        <p style={{fontWeight:600}}>{parseFloat(v||0).toLocaleString('fr-FR')} Ar</p>
        <p style={{color:'var(--gray-400)'}}>{parseFloat(r.budget_used||0).toLocaleString('fr-FR')} Ar utilisés</p>
      </div>
    )},
    { key:'start_date', header:'Période', render:(v,r)=>(
      <div style={{fontSize:'0.8rem'}}>
        <p>{v?new Date(v).toLocaleDateString('fr-FR'):'—'}</p>
        <p style={{color:'var(--gray-400)'}}>{r.end_date?new Date(r.end_date).toLocaleDateString('fr-FR'):'—'}</p>
      </div>
    )},
    { key:'actions', header:'Actions', render:(_,row)=>(
      <div style={{display:'flex',gap:5}}>
        {canEdit&&<Btn size="sm" variant="secondary" onClick={()=>openModal(row)}>✏️</Btn>}
      </div>
    )},
  ];

  return(
    <div className="animate-fade">
      <Card style={{marginBottom:16}}>
        <CardHeader title="Gestion des Projets" subtitle={`${projects.length} projet(s)`}
          action={canEdit&&<Btn variant="gold" onClick={()=>openModal()}>➕ Nouveau projet</Btn>} />
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180}}><SearchBar value={search} onChange={setSearch} placeholder="Rechercher un projet..."/></div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{width:'auto',minWidth:150}}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s=><option key={s} value={s}>{STATUTS_FR[s]}</option>)}
          </select>
        </div>
      </Card>
      <Card>{loading?<Spinner/>:<Table columns={columns} data={projects} emptyMessage="Aucun projet"/>}</Card>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?`✏️ Modifier — ${editing.name}`:'➕ Nouveau projet'} width={640}>
        <form onSubmit={handleSave} style={{padding:24}}>
          <FormRow cols={1}><FormField label="Nom du projet *"><input value={form.name} onChange={e=>f('name',e.target.value)} required/></FormField></FormRow>
          <FormRow cols={1}><FormField label="Description"><textarea value={form.description} onChange={e=>f('description',e.target.value)} rows={3} style={{resize:'vertical'}}/></FormField></FormRow>
          <FormRow>
            <FormField label="Statut">
              <select value={form.status} onChange={e=>f('status',e.target.value)}>
                {STATUTS.map(s=><option key={s} value={s}>{STATUTS_FR[s]}</option>)}
              </select>
            </FormField>
            <FormField label="Coordinateur"><input value={form.coordinator} onChange={e=>f('coordinator',e.target.value)}/></FormField>
          </FormRow>
          <FormRow>
            <FormField label="Date de début"><input type="date" value={form.start_date} onChange={e=>f('start_date',e.target.value)}/></FormField>
            <FormField label="Date de fin"><input type="date" value={form.end_date} onChange={e=>f('end_date',e.target.value)}/></FormField>
          </FormRow>
          <FormRow cols={1}><FormField label="Budget (Ar)"><input type="number" value={form.budget} onChange={e=>f('budget',e.target.value)}/></FormField></FormRow>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <Btn type="button" variant="secondary" onClick={()=>setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" variant="gold" disabled={saving}>{saving?'Enregistrement...':editing?'💾 Mettre à jour':'➕ Créer'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
