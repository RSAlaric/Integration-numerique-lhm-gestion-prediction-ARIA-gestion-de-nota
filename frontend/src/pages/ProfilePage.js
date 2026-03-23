import React, { useState, useEffect } from 'react';
import { Card, CardHeader, Btn, FormRow, FormField } from '../components/ui/Card';
import { UserAvatar } from '../components/ui/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  admin:'Administrateur', super_admin:'Administrateur Système', direction:'Direction',
  assistant_admin:'Assistant Administration', rh:'Ressources Humaines',
  responsable_stock:'Responsable Stock', responsable_volontaires:'Responsable Volontaires',
  responsable_bcc:'Responsable BCC', coordinateur:'Coordinateur', utilisateur:'Utilisateur',
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm]     = useState({ name:'', email:'', photo:'' });
  const [pwdForm, setPwd]   = useState({ oldPassword:'', newPassword:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [showPwd, setShowPwd]     = useState(false);

  useEffect(() => {
    document.getElementById('page-title') && (document.getElementById('page-title').textContent = 'Mon Profil');
    if (user) setForm({ name: user.name || '', email: user.email || '', photo: user.photo || '' });
  }, [user]);

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await api.put('/users/me/profile', { name: form.name, email: form.email, photo: form.photo });
      updateUser(r.data.data);
      toast.success('Profil mis à jour !');
    } catch(err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handlePwd = async e => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (pwdForm.newPassword.length < 6) { toast.error('Mot de passe trop court (min 6 caractères)'); return; }
    setSavingPwd(true);
    try {
      await api.put('/users/me/profile', { oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword });
      setPwd({ oldPassword:'', newPassword:'', confirm:'' });
      toast.success('Mot de passe mis à jour !');
    } catch(err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSavingPwd(false); }
  };

  if (!user) return null;

  return (
    <div className="animate-fade" style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header profil */}
      <div style={{
        background: 'linear-gradient(135deg,#0f2044,#1a3a6e)', borderRadius: 16,
        padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 8px 32px rgba(15,32,68,0.2)', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative' }}>
          <UserAvatar user={{ ...user, photo: form.photo }} size={90} editable
            onPhotoChange={photo => setForm(p => ({ ...p, photo }))} />
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            background: '#c9a84c', borderRadius: '50%', width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid white', fontSize: '0.7rem', pointerEvents: 'none',
          }}>📷</div>
        </div>
        <div style={{ flex: 1, color: 'white' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
            {user.name || user.username}
          </h2>
          <p style={{ opacity: .8, fontSize: '0.88rem', marginBottom: 6 }}>{user.email}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(201,168,76,0.3)', border: '1px solid rgba(201,168,76,0.5)', color: '#e0c06e', padding: '3px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', padding: '3px 12px', borderRadius: 20, fontSize: '0.78rem' }}>
              @{user.username}
            </span>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', opacity: .6, marginBottom: 3 }}>Dernière connexion</p>
          <p style={{ fontWeight: 600, fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)' }}>
            {user.lastLogin || user.last_login
              ? new Date(user.lastLogin || user.last_login).toLocaleString('fr-FR')
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Formulaire informations */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Informations personnelles" subtitle="Modifier votre nom, email et photo de profil" />
        <form onSubmit={handleSave}>
          {/* Photo preview + upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20,
            padding: '16px', background: '#f8faff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <UserAvatar user={{ ...user, photo: form.photo }} size={72} editable
              onPhotoChange={photo => setForm(p => ({ ...p, photo }))} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f2044', marginBottom: 4 }}>Photo de profil</p>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 8 }}>Cliquez sur la photo pour changer. JPEG, PNG — max 2 Mo.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {form.photo && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, photo: '' }))}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', border: '1px solid #fca5a5', borderRadius: 6,
                      background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>
                    🗑️ Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>

          <FormRow>
            <FormField label="Nom complet"><input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))}/></FormField>
            <FormField label="Email"><input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))}/></FormField>
          </FormRow>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn type="submit" variant="gold" disabled={saving}>{saving ? '💾 Sauvegarde...' : '💾 Mettre à jour'}</Btn>
          </div>
        </form>
      </Card>

      {/* Changer mot de passe */}
      <Card>
        <CardHeader title="Changer le mot de passe" subtitle="Saisissez votre mot de passe actuel pour en définir un nouveau" />
        <form onSubmit={handlePwd}>
          <FormRow cols={1}>
            <FormField label="Mot de passe actuel">
              <div style={{ position: 'relative' }}>
                <input type={showPwd?'text':'password'} value={pwdForm.oldPassword}
                  onChange={e=>setPwd(p=>({...p,oldPassword:e.target.value}))} required
                  style={{ paddingRight: 40 }} />
                <button type="button" onClick={()=>setShowPwd(!showPwd)}
                  style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'1rem',color:'#9ca3af' }}>
                  {showPwd?'🙈':'👁️'}
                </button>
              </div>
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Nouveau mot de passe"><input type="password" value={pwdForm.newPassword} onChange={e=>setPwd(p=>({...p,newPassword:e.target.value}))} required placeholder="Min 6 caractères"/></FormField>
            <FormField label="Confirmer">
              <input type="password" value={pwdForm.confirm} onChange={e=>setPwd(p=>({...p,confirm:e.target.value}))} required
                style={{ borderColor: pwdForm.confirm && pwdForm.confirm !== pwdForm.newPassword ? '#dc2626' : undefined }}/>
              {pwdForm.confirm && pwdForm.confirm !== pwdForm.newPassword &&
                <p style={{color:'#dc2626',fontSize:'0.72rem',marginTop:4}}>Les mots de passe ne correspondent pas</p>}
            </FormField>
          </FormRow>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn type="submit" variant="primary" disabled={savingPwd || (pwdForm.confirm && pwdForm.confirm !== pwdForm.newPassword)}>
              {savingPwd ? '🔒 Mise à jour...' : '🔒 Changer le mot de passe'}
            </Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
