import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, Table, Btn, Badge, Modal, FormRow, FormField, Spinner } from '../components/ui/Card';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const TYPES = ['Congé annuel','Congé maladie','Congé maternité/paternité','Congé sans solde','Permission spéciale'];
const QUOTA = 30;

function joursOuvrables(d1, d2) {
  if (!d1||!d2) return 0;
  let count=0, cur=new Date(d1), end=new Date(d2);
  if (end<cur) return 0;
  while(cur<=end){ if(cur.getDay()!==0&&cur.getDay()!==6) count++; cur.setDate(cur.getDate()+1); }
  return count;
}

export default function AbsencesPage() {
  const { hasRole } = useAuth();
  const canApprove = hasRole('super_admin','admin','assistant_admin','rh','direction');
  const [absences,  setAbsences]  = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ personnel_id:'', type:'Congé annuel', start_date:'', end_date:'', reason:'' });
  const [saving, setSaving] = useState(false);
  const [filterStatut, setFilterStatut] = useState('');

  useEffect(()=>{
    document.getElementById('page-title')&&(document.getElementById('page-title').textContent='Absences & Congés');
    load();
  },[]);

  const load = async () => {
    setLoading(true);
    try {
      const [a,p] = await Promise.all([api.get('/absences'),api.get('/personnel')]);
      setAbsences(a.data.data||[]);
      setPersonnel(p.data.data||[]);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const congesParPersonnel = useMemo(()=>{
    const map={};
    absences.forEach(a=>{
      if(a.type==='Congé annuel'&&a.status==='approved'){
        const pid=a.personnel_id;
        if(!map[pid]) map[pid]=0;
        map[pid]+=joursOuvrables(a.start_date,a.end_date);
      }
    });
    return map;
  },[absences]);

  const joursForm = useMemo(()=>joursOuvrables(form.start_date,form.end_date),[form.start_date,form.end_date]);
  const resteSelectionne = useMemo(()=>{
    if(!form.personnel_id||form.type!=='Congé annuel') return null;
    return QUOTA-(congesParPersonnel[form.personnel_id]||0);
  },[form.personnel_id,form.type,congesParPersonnel]);
  const quotaDepasse = resteSelectionne!==null && joursForm>resteSelectionne;

  const filtered = filterStatut ? absences.filter(a=>a.status===filterStatut) : absences;

  const handleCreate = async e => {
    e.preventDefault();
    if(quotaDepasse){ toast.error(`Quota dépassé ! Il reste ${resteSelectionne} jour(s).`); return; }
    setSaving(true);
    try {
      await api.post('/absences',{ personnel_id:form.personnel_id, type:form.type, start_date:form.start_date, end_date:form.end_date, reason:form.reason });
      toast.success('Demande créée'); setModalOpen(false); load();
    } catch(err){ toast.error(err.response?.data?.message||'Erreur'); }
    finally{ setSaving(false); }
  };

  const handleValidate = async (id, status) => {
    try{ await api.put(`/absences/${id}`,{status}); toast.success(`Demande ${status}`); load(); }
    catch{ toast.error('Erreur'); }
  };

  const stats = { total:absences.length, pending:absences.filter(a=>a.status==='pending').length, approved:absences.filter(a=>a.status==='approved').length, rejected:absences.filter(a=>a.status==='rejected').length };

  const badge = s => {
    const m = {pending:'warning',approved:'success',rejected:'error'};
    return <Badge type={m[s]||'default'}>{s==='pending'?'En attente':s==='approved'?'Approuvé':'Refusé'}</Badge>;
  };

  const columns = [
    { key:'first_name', header:'Personnel', render:(_,row)=>{
      const pid=row.personnel_id;
      const pris=congesParPersonnel[pid]||0;
      const isAnnuel=row.type==='Congé annuel';
      return(
        <div>
          <p style={{fontWeight:600,color:'var(--navy)'}}>{row.first_name} {row.last_name}</p>
          {isAnnuel&&<p style={{fontSize:'0.72rem',color:pris>=QUOTA?'#dc2626':'#16a34a',marginTop:2}}>{QUOTA-pris} j. restants / {QUOTA}</p>}
        </div>
      );
    }},
    { key:'type', header:'Type', render:v=><Badge type={v==='Congé annuel'?'gold':'info'}>{v}</Badge> },
    { key:'start_date', header:'Début', render:v=>v?new Date(v).toLocaleDateString('fr-FR'):'—' },
    { key:'end_date',   header:'Fin',   render:v=>v?new Date(v).toLocaleDateString('fr-FR'):'—' },
    { key:'start_date', header:'Durée', render:(_,row)=><span style={{fontWeight:700}}>{joursOuvrables(row.start_date,row.end_date)} j.</span> },
    { key:'reason', header:'Motif', render:v=><span style={{fontSize:'0.82rem',color:'var(--gray-500)'}}>{v||'—'}</span> },
    { key:'status', header:'Statut', render:v=>badge(v) },
    { key:'actions', header:'Actions', render:(_,row)=>(
      <div style={{display:'flex',gap:5}}>
        {canApprove&&row.status==='pending'&&<>
          <Btn size="sm" variant="success" onClick={()=>handleValidate(row.id,'approved')}>✅</Btn>
          <Btn size="sm" variant="danger"  onClick={()=>handleValidate(row.id,'rejected')}>❌</Btn>
        </>}
      </div>
    )},
  ];

  return(
    <div className="animate-fade">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:18}}>
        {[
          {label:'Total',      value:stats.total,    color:'var(--navy)',    icon:'📋'},
          {label:'En attente', value:stats.pending,  color:'#f59e0b',       icon:'⏳'},
          {label:'Approuvés',  value:stats.approved, color:'var(--emerald)',icon:'✅'},
          {label:'Refusés',    value:stats.rejected, color:'var(--red)',    icon:'❌'},
        ].map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:'var(--radius)',boxShadow:'var(--shadow)',padding:'14px 18px',borderLeft:`4px solid ${s.color}`}}>
            <p style={{fontSize:'0.72rem',color:'var(--gray-400)',marginBottom:4}}>{s.icon} {s.label}</p>
            <p style={{fontSize:'1.8rem',fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quota par personne */}
      {personnel.filter(p=>p.status==='active').length>0&&(
        <Card style={{marginBottom:16}}>
          <CardHeader title="Suivi des congés annuels" subtitle={`Quota : ${QUOTA} jours/an par personne`} />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:10}}>
            {personnel.filter(p=>p.status==='active').map(p=>{
              const pris=congesParPersonnel[p.id]||0;
              const reste=Math.max(0,QUOTA-pris);
              const pct=Math.min(100,(pris/QUOTA)*100);
              const color=pct>=100?'#dc2626':pct>=80?'#f59e0b':'#16a34a';
              return(
                <div key={p.id} style={{border:'1px solid var(--gray-200)',borderRadius:10,padding:'10px 12px',background:'white'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',border:'1.5px solid var(--gray-200)',background:'var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {p.photo?<img src={p.photo} alt={p.first_name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:'0.9rem'}}>👤</span>}
                    </div>
                    <div style={{overflow:'hidden'}}>
                      <p style={{fontWeight:600,color:'var(--navy)',fontSize:'0.82rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.first_name} {p.last_name}</p>
                      <p style={{fontSize:'0.7rem',color:'var(--gray-400)'}}>{p.poste}</p>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',marginBottom:4}}>
                    <span style={{color:'var(--gray-500)'}}>{pris} j. pris</span>
                    <span style={{color,fontWeight:700}}>{reste} j. restants</span>
                  </div>
                  <div style={{height:7,background:'var(--gray-200)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:99}} />
                  </div>
                  {pct>=100&&<p style={{fontSize:'0.68rem',color:'#dc2626',fontWeight:700,marginTop:3}}>⛔ Quota épuisé</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Demandes d'absence" subtitle="Historique et gestion"
          action={
            <div style={{display:'flex',gap:8}}>
              <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)} style={{width:'auto'}}>
                <option value="">Tous statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvés</option>
                <option value="rejected">Refusés</option>
              </select>
              <Btn variant="gold" onClick={()=>setModalOpen(true)}>➕ Nouvelle demande</Btn>
            </div>
          }/>
        {loading?<Spinner/>:<Table columns={columns} data={filtered} emptyMessage="Aucune demande"/>}
      </Card>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Nouvelle demande d'absence">
        <form onSubmit={handleCreate} style={{padding:24}}>
          <FormRow cols={1}>
            <FormField label="Personnel *">
              <select value={form.personnel_id} onChange={e=>setForm({...form,personnel_id:e.target.value})} required>
                <option value="">— Sélectionner —</option>
                {personnel.map(p=>{
                  const pris=congesParPersonnel[p.id]||0;
                  const reste=QUOTA-pris;
                  const tag=form.type==='Congé annuel'?(reste<=0?' ⛔':(reste<=5?` (${reste}j)`:'')):'';
                  return<option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.poste}{tag}</option>;
                })}
              </select>
            </FormField>
          </FormRow>

          {form.personnel_id&&form.type==='Congé annuel'&&(
            <div style={{margin:'0 0 14px',background:resteSelectionne<=0?'#fef2f2':'#f0fdf4',border:`1px solid ${resteSelectionne<=0?'#fca5a5':'#86efac'}`,borderRadius:10,padding:'10px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <p style={{fontSize:'0.8rem',fontWeight:700,color:resteSelectionne<=0?'#dc2626':'#166534'}}>
                  {resteSelectionne<=0?'⛔ Quota épuisé':'📅 Quota de congés'}
                </p>
                <span style={{fontWeight:700,color:resteSelectionne<=0?'#dc2626':'#166534'}}>{Math.max(0,resteSelectionne)} / {QUOTA} j. restants</span>
              </div>
              <div style={{height:8,background:'#e5e7eb',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,((QUOTA-Math.max(0,resteSelectionne))/QUOTA)*100)}%`,background:resteSelectionne<=0?'#dc2626':resteSelectionne<=5?'#f59e0b':'#16a34a',borderRadius:99}} />
              </div>
              {joursForm>0&&<p style={{fontSize:'0.75rem',marginTop:6,color:quotaDepasse?'#dc2626':'#166534',fontWeight:600}}>
                {quotaDepasse?`❌ Cette demande (${joursForm} j.) dépasse le quota`:`✅ Cette demande utilise ${joursForm} j. — reste ${resteSelectionne-joursForm} j.`}
              </p>}
            </div>
          )}

          <FormRow cols={1}>
            <FormField label="Type">
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Début *"><input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} required /></FormField>
            <FormField label="Fin *"><input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} required /></FormField>
          </FormRow>
          {joursForm>0&&<div style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:8,padding:'8px 14px',marginBottom:14}}>
            <span style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>Durée calculée : </span>
            <span style={{fontWeight:700,color:'var(--navy)'}}>{joursForm} jour(s) ouvrable(s)</span>
          </div>}
          <FormRow cols={1}><FormField label="Motif"><textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} rows={3} style={{resize:'vertical'}}/></FormField></FormRow>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn type="button" variant="secondary" onClick={()=>setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" variant="gold" disabled={saving||quotaDepasse}>
              {saving?'Envoi...':quotaDepasse?'⛔ Quota insuffisant':'📤 Soumettre'}
            </Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
