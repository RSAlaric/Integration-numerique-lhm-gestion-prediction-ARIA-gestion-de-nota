import React, { useEffect, useState, useRef } from 'react';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Card, CardHeader, Table, Btn, Badge, Modal, FormRow, FormField, Spinner } from '../components/ui/Card';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ROLES = ['admin','direction','assistant_admin','rh','responsable_stock','responsable_volontaires','responsable_bcc','coordinateur','utilisateur'];
const ROLES_FR = { admin:'Administrateur', direction:'Direction', assistant_admin:'Assistant Admin', rh:'RH', responsable_stock:'Resp. Stock', responsable_volontaires:'Resp. Volontaires', responsable_bcc:'Resp. BCC', coordinateur:'Coordinateur', utilisateur:'Utilisateur' };
const defaultForm = { username:'', email:'', name:'', role:'utilisateur', password:'', service:'', photo:'' };

export default function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(defaultForm);
  const [saving,  setSaving]  = useState(false);

  useEffect(()=>{
    document.getElementById('page-title')&&(document.getElementById('page-title').textContent='Gestion des Utilisateurs');
    load();
  },[]);

  const load = async () => {
    setLoading(true);
    try{ const r=await api.get('/users'); setUsers(r.data.data||[]); }
    catch{ toast.error('Erreur'); }
    finally{ setLoading(false); }
  };

  const openModal = (u=null) => {
    setEditing(u);
    setForm(u ? { username:u.username||'', email:u.email||'', name:u.name||'', role:u.role||'utilisateur', password:'', service:u.service||'', photo:u.photo||'' } : defaultForm);
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) { await api.put(`/users/${editing.id}`,form); toast.success('Mis à jour'); }
      else { await api.post('/users',form); toast.success('Utilisateur créé'); }
      setModalOpen(false); load();
    } catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
    finally{ setSaving(false); }
  };

  const handleToggleBlock = async u => {
    try{ await api.put(`/users/${u.id}/toggle-block`); toast.success(u.locked?'Déverrouillé':'Verrouillé'); load(); }
    catch{ toast.error('Erreur'); }
  };

  const f = (k,v) => setForm(prev=>({...prev,[k]:v}));

  const columns = [
    { key:'name', header:'Nom', render:(v,r)=>(
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <UserAvatar user={r} size={36}/>
        <div>
          <p style={{fontWeight:600,color:'var(--navy)'}}>{v||r.username}</p>
          <p style={{fontSize:'0.72rem',color:'var(--gray-400)'}}>{r.email}</p>
        </div>
      </div>
    )},
    { key:'username', header:'Identifiant', render:v=><span style={{fontFamily:'monospace',fontSize:'0.82rem'}}>{v}</span> },
    { key:'role', header:'Rôle', render:v=><Badge type={v==='admin'?'error':v==='direction'?'info':'default'}>{ROLES_FR[v]||v}</Badge> },
    { key:'active', header:'Actif', render:v=><Badge type={v?'success':'error'}>{v?'Oui':'Non'}</Badge> },
    { key:'locked', header:'Verrou', render:v=><Badge type={v?'error':'success'}>{v?'🔒 Verrouillé':'🔓 OK'}</Badge> },
    { key:'last_login', header:'Dernière connexion', render:v=>v?new Date(v).toLocaleString('fr-FR'):'Jamais' },
    { key:'actions', header:'Actions', render:(_,row)=>(
      <div style={{display:'flex',gap:5}}>
        <Btn size="sm" variant="secondary" onClick={()=>openModal(row)}>✏️</Btn>
        <Btn size="sm" variant={row.locked?'success':'danger'} onClick={()=>handleToggleBlock(row)}>{row.locked?'🔓':'🔒'}</Btn>
      </div>
    )},
  ];

  return(
    <div className="animate-fade">
      <Card>
        <CardHeader title="Gestion des Utilisateurs" subtitle={`${users.length} utilisateur(s)`}
          action={<Btn variant="gold" onClick={()=>openModal()}>➕ Nouvel utilisateur</Btn>} />
        {loading?<Spinner/>:<Table columns={columns} data={users} emptyMessage="Aucun utilisateur"/>}
      </Card>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?`✏️ Modifier — ${editing.username}`:'➕ Nouvel utilisateur'}>
        <form onSubmit={handleSave} style={{padding:24}}>
          <FormRow>
            <FormField label="Nom complet"><input value={form.name} onChange={e=>f('name',e.target.value)}/></FormField>
            <FormField label="Identifiant *"><input value={form.username} onChange={e=>f('username',e.target.value)} required disabled={!!editing}/></FormField>
          </FormRow>
          <FormRow cols={1}><FormField label="Email *"><input type="email" value={form.email} onChange={e=>f('email',e.target.value)} required/></FormField></FormRow>
          <FormRow>
            <FormField label="Rôle">
              <select value={form.role} onChange={e=>f('role',e.target.value)}>
                {ROLES.map(r=><option key={r} value={r}>{ROLES_FR[r]||r}</option>)}
              </select>
            </FormField>
            <FormField label={editing?'Nouveau mot de passe':'Mot de passe *'}>
              <input type="password" value={form.password} onChange={e=>f('password',e.target.value)} required={!editing} placeholder={editing?'Laisser vide pour ne pas changer':''}/>
            </FormField>
          </FormRow>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <Btn type="button" variant="secondary" onClick={()=>setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" variant="gold" disabled={saving}>{saving?'Enregistrement...':editing?'💾 Mettre à jour':'➕ Créer'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
