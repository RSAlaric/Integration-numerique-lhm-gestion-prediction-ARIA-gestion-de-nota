import React, { useEffect, useState } from 'react';
import { Card, CardHeader, Table, Btn, Badge, Modal, FormRow, FormField, SearchBar, Spinner } from '../components/ui/Card';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const defaultForm = { name:'', category_id:'', unit:'pièce', unit_price:0, min_stock:0, safety_stock:0, supplier:'', location:'', description:'' };
const defaultMvt  = { type:'entry', item_id:'', quantity:1, reference:'', reason:'' };

export default function StockPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('super_admin','admin','responsable_stock');
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterAlert,setFilterAlert]= useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [mvtModalOpen,setMvtModalOpen]= useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(defaultForm);
  const [mvtForm,    setMvtForm]    = useState(defaultMvt);
  const [saving,     setSaving]     = useState(false);

  useEffect(()=>{
    document.getElementById('page-title')&&(document.getElementById('page-title').textContent='Gestion du Stock');
    Promise.all([loadItems(), api.get('/stock/stats').then(r=>setStats(r.data)), api.get('/stock-categories').then(r=>setCategories(r.data.data||[])).catch(()=>{})]);
  },[]);
  useEffect(()=>{ loadItems(); },[search,filterAlert]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params=new URLSearchParams();
      if(search) params.append('search',search);
      if(filterAlert) params.append('alert',filterAlert);
      const r = await api.get(`/stock?${params}`);
      setItems(r.data.data||[]);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const openModal = (item=null) => {
    setEditing(item);
    setForm(item ? { name:item.name||'', category_id:item.category_id||'', unit:item.unit||'pièce', unit_price:item.unit_price||0, min_stock:item.min_stock||0, safety_stock:item.safety_stock||0, supplier:item.supplier||'', location:item.location||'', description:item.description||'' } : defaultForm);
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) { await api.put(`/stock/${editing.id}`,form); toast.success('Mis à jour'); }
      else { await api.post('/stock',form); toast.success('Article créé'); }
      setModalOpen(false); loadItems();
    } catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
    finally{ setSaving(false); }
  };

  const handleDelete = async id => {
    if(!window.confirm('Supprimer cet article ?')) return;
    try{ await api.delete(`/stock/${id}`); toast.success('Supprimé'); loadItems(); }
    catch{ toast.error('Erreur'); }
  };

  const handleMouvement = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/stock-movements',mvtForm);
      toast.success('Mouvement enregistré');
      setMvtModalOpen(false);
      loadItems();
      api.get('/stock/stats').then(r=>setStats(r.data));
    } catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
    finally{ setSaving(false); }
  };

  const f = (k,v) => setForm(prev=>({...prev,[k]:v}));
  const fm = (k,v) => setMvtForm(prev=>({...prev,[k]:v}));

  const alertLevel = item => {
    if(item.quantity<=item.min_stock) return 'error';
    if(item.quantity<=item.safety_stock) return 'warning';
    return 'success';
  };

  const columns = [
    { key:'code', header:'Code', render:v=><span style={{fontFamily:'monospace',fontSize:'0.8rem',fontWeight:700,color:'var(--navy)'}}>{v}</span> },
    { key:'name', header:'Désignation', render:(v,r)=>(
      <div>
        <p style={{fontWeight:600}}>{v}</p>
        <p style={{fontSize:'0.72rem',color:'var(--gray-400)'}}>{r.category_name||''}</p>
      </div>
    )},
    { key:'quantity', header:'Qté', render:(v,r)=>(
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontWeight:700,fontSize:'1.1rem',color:alertLevel(r)==='error'?'#dc2626':alertLevel(r)==='warning'?'#f59e0b':'#16a34a'}}>{v}</span>
        <span style={{fontSize:'0.78rem',color:'var(--gray-400)'}}>{r.unit}</span>
      </div>
    )},
    { key:'unit_price', header:'Prix unit.', render:v=>`${parseFloat(v||0).toLocaleString('fr-FR')} Ar` },
    { key:'min_stock',  header:'Stock min', render:v=><span style={{fontFamily:'monospace'}}>{v}</span> },
    { key:'quantity',   header:'Alerte', render:(_,r)=><Badge type={alertLevel(r)}>{alertLevel(r)==='error'?'Critique':alertLevel(r)==='warning'?'Sécurité':'OK'}</Badge> },
    { key:'actions', header:'Actions', render:(_,row)=>(
      <div style={{display:'flex',gap:5}}>
        {canEdit&&<Btn size="sm" variant="success" onClick={()=>{ setMvtForm({...defaultMvt,item_id:row.id}); setMvtModalOpen(true); }} title="Mouvement">⬆⬇</Btn>}
        {canEdit&&<Btn size="sm" variant="secondary" onClick={()=>openModal(row)}>✏️</Btn>}
        {canEdit&&<Btn size="sm" variant="danger" onClick={()=>handleDelete(row.id)}>🗑️</Btn>}
      </div>
    )},
  ];

  return(
    <div className="animate-fade">
      {stats&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:18}}>
          {[
            {label:'Articles',     value:stats.total,       color:'var(--navy)',    icon:'📦'},
            {label:'Stock critique',value:stats.critical,   color:'var(--red)',     icon:'🔴'},
            {label:'Stock sécurité',value:stats.safety,     color:'#f59e0b',       icon:'🟡'},
            {label:'Valeur totale', value:`${parseFloat(stats.totalValue||0).toLocaleString('fr-FR')} Ar`, color:'var(--emerald)', icon:'💰'},
          ].map(s=>(
            <div key={s.label} style={{background:'white',borderRadius:'var(--radius)',boxShadow:'var(--shadow)',padding:'14px 18px',borderLeft:`4px solid ${s.color}`}}>
              <p style={{fontSize:'0.72rem',color:'var(--gray-400)',marginBottom:4}}>{s.icon} {s.label}</p>
              <p style={{fontSize:'1.5rem',fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <Card style={{marginBottom:16}}>
        <CardHeader title="Gestion du Stock" subtitle={`${items.length} article(s)`}
          action={
            <div style={{display:'flex',gap:8}}>
              {canEdit&&<Btn variant="secondary" onClick={()=>{ setMvtForm(defaultMvt); setMvtModalOpen(true); }}>⬆⬇ Mouvement</Btn>}
              {canEdit&&<Btn variant="gold" onClick={()=>openModal()}>➕ Nouvel article</Btn>}
            </div>
          }/>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180}}><SearchBar value={search} onChange={setSearch} placeholder="Code, désignation..."/></div>
          <select value={filterAlert} onChange={e=>setFilterAlert(e.target.value)} style={{width:'auto'}}>
            <option value="">Toutes alertes</option>
            <option value="critical">Stock critique</option>
            <option value="safety">Stock sécurité</option>
          </select>
        </div>
      </Card>
      <Card>{loading?<Spinner/>:<Table columns={columns} data={items} emptyMessage="Aucun article"/>}</Card>

      {/* Modal article */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?`✏️ Modifier — ${editing.name}`:'➕ Nouvel article'}>
        <form onSubmit={handleSave} style={{padding:24}}>
          <FormRow cols={1}><FormField label="Désignation *"><input value={form.name} onChange={e=>f('name',e.target.value)} required/></FormField></FormRow>
          <FormRow>
            <FormField label="Catégorie">
              <select value={form.category_id} onChange={e=>f('category_id',e.target.value)}>
                <option value="">— Sélectionner —</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Unité"><input value={form.unit} onChange={e=>f('unit',e.target.value)}/></FormField>
          </FormRow>
          <FormRow>
            <FormField label="Prix unitaire (Ar)"><input type="number" value={form.unit_price} onChange={e=>f('unit_price',e.target.value)}/></FormField>
            <FormField label="Stock minimum"><input type="number" value={form.min_stock} onChange={e=>f('min_stock',e.target.value)}/></FormField>
          </FormRow>
          <FormRow>
            <FormField label="Stock sécurité"><input type="number" value={form.safety_stock} onChange={e=>f('safety_stock',e.target.value)}/></FormField>
            <FormField label="Fournisseur"><input value={form.supplier} onChange={e=>f('supplier',e.target.value)}/></FormField>
          </FormRow>
          <FormRow cols={1}><FormField label="Emplacement"><input value={form.location} onChange={e=>f('location',e.target.value)}/></FormField></FormRow>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <Btn type="button" variant="secondary" onClick={()=>setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" variant="gold" disabled={saving}>{saving?'Enregistrement...':editing?'💾 Mettre à jour':'➕ Créer'}</Btn>
          </div>
        </form>
      </Modal>

      {/* Modal mouvement */}
      <Modal open={mvtModalOpen} onClose={()=>setMvtModalOpen(false)} title="⬆⬇ Mouvement de stock">
        <form onSubmit={handleMouvement} style={{padding:24}}>
          <FormRow cols={1}>
            <FormField label="Type de mouvement">
              <select value={mvtForm.type} onChange={e=>fm('type',e.target.value)}>
                <option value="entry">📥 Entrée</option>
                <option value="exit">📤 Sortie</option>
              </select>
            </FormField>
          </FormRow>
          <FormRow cols={1}>
            <FormField label="Article *">
              <select value={mvtForm.item_id} onChange={e=>fm('item_id',e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {items.map(i=><option key={i.id} value={i.id}>{i.code} — {i.name} (Qté: {i.quantity})</option>)}
              </select>
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Quantité *"><input type="number" min="1" value={mvtForm.quantity} onChange={e=>fm('quantity',e.target.value)} required/></FormField>
            <FormField label="Référence"><input value={mvtForm.reference} onChange={e=>fm('reference',e.target.value)}/></FormField>
          </FormRow>
          <FormRow cols={1}><FormField label="Motif"><input value={mvtForm.reason} onChange={e=>fm('reason',e.target.value)}/></FormField></FormRow>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn type="button" variant="secondary" onClick={()=>setMvtModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" variant="gold" disabled={saving}>{saving?'Enregistrement...':'✅ Valider'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
