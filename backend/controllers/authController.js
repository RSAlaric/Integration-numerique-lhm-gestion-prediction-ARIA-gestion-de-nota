const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'lhm-madagascar-secret-2024';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis' });

    const user = db.users.find(u => u.email === email);
    if (!user)        return res.status(401).json({ message: 'Identifiants incorrects' });
    if (!user.active) return res.status(401).json({ message: 'Compte désactivé' });
    if (user.locked)  return res.status(401).json({ message: 'Compte verrouillé. Contactez l\'administrateur.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      if (user.failedAttempts >= 5) user.locked = true;
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    user.failedAttempts = 0;
    user.lastLogin = new Date().toISOString();
    db.addAudit(user.id, 'LOGIN', 'Système', 'Session ouverte');

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getMe = (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const svc = db.services.find(s => s.id === user.service);
  const { passwordHash, ...safeUser } = user;
  res.json({ success: true, user: { ...safeUser, serviceName: svc?.name } });
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  db.addAudit(user.id, 'CHANGE_PASSWORD', 'User');
  res.json({ success: true, message: 'Mot de passe mis à jour' });
};
