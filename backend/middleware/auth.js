// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'lhm-madagascar-super-secret-jwt-key-2024';

function authenticate(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token manquant' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Non authentifié' });
    // 'admin' et 'super_admin' ont accès à tout
    if (req.user.role === 'admin' || req.user.role === 'super_admin') return next();
    if (!roles.includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Accès refusé — permissions insuffisantes' });
    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };
