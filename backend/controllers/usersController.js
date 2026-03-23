const db = require('../db');
const bcrypt = require('bcryptjs');

const safeUser = u => {
  const { passwordHash, ...s } = u;
  return { ...s, service_name: db.services.find(sv => sv.id === u.service)?.name };
};

exports.getAll = (req, res) => {
  res.json({ success: true, data: db.users.map(safeUser) });
};

exports.create = async (req, res) => {
  const { username, password, email, name, role, service, photo } = req.body;
  if (!username || !password || !email || !role)
    return res.status(400).json({ message: 'Champs requis manquants' });
  if (db.users.find(u => u.username === username || u.email === email))
    return res.status(400).json({ message: "Nom d'utilisateur ou email déjà utilisé" });
  const u = {
    id: db.nextId(), username, email,
    passwordHash: await bcrypt.hash(password, 10),
    role, name: name || username, service: service || null,
    photo: photo || '', active: true, locked: false,
    failedAttempts: 0, lastLogin: null, createdAt: new Date().toISOString(),
  };
  db.users.push(u);
  db.addAudit(req.user.id, 'CREATE', 'User', `${username} (${role})`);
  res.status(201).json({ success: true, data: safeUser(u) });
};

exports.update = async (req, res) => {
  const u = db.users.find(u => u.id === req.params.id);
  if (!u) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  if (req.body.name    !== undefined) u.name    = req.body.name;
  if (req.body.email   !== undefined) u.email   = req.body.email;
  if (req.body.role    !== undefined) u.role    = req.body.role;
  if (req.body.service !== undefined) u.service = req.body.service;
  if (req.body.active  !== undefined) u.active  = req.body.active;
  if (req.body.photo   !== undefined) u.photo   = req.body.photo;
  if (req.body.password) u.passwordHash = await bcrypt.hash(req.body.password, 10);
  db.addAudit(req.user.id, 'UPDATE', 'User', u.username);
  res.json({ success: true, data: safeUser(u) });
};

exports.toggleBlock = (req, res) => {
  const u = db.users.find(u => u.id === req.params.id);
  if (!u) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  u.locked = !u.locked; u.failedAttempts = 0;
  db.addAudit(req.user.id, u.locked ? 'LOCK' : 'UNLOCK', 'User', u.username);
  res.json({ success: true, message: u.locked ? 'Verrouillé' : 'Déverrouillé', data: safeUser(u) });
};

// PUT /api/users/me/profile — Mise à jour du profil de l'utilisateur connecté
exports.updateMyProfile = async (req, res) => {
  const u = db.users.find(u => u.id === req.user.id);
  if (!u) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  if (req.body.name  !== undefined) u.name  = req.body.name;
  if (req.body.email !== undefined) u.email = req.body.email;
  if (req.body.photo !== undefined) u.photo = req.body.photo;
  if (req.body.newPassword && req.body.oldPassword) {
    const valid = await bcrypt.compare(req.body.oldPassword, u.passwordHash);
    if (!valid) return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    u.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
  }
  db.addAudit(u.id, 'UPDATE_PROFILE', 'User', u.username);
  res.json({ success: true, data: safeUser(u) });
};
