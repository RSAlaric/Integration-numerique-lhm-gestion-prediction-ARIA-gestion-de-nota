const db = require('../db');
const WORKFLOW = ['enrolled','evaluated','assigned','active','recognized'];

// Normalise camelCase → snake_case pour le frontend
const normalize = v => ({
  id:         v.id,
  first_name: v.firstName  || '',
  last_name:  v.lastName   || '',
  phone:      v.phone      || '',
  email:      v.email      || '',
  motivation: v.motivation || '',
  skills:     v.skills     || [],
  availability: v.availability || {},
  preferences:  v.preferences  || '',
  restrictions: v.restrictions || '',
  status:     v.status     || 'enrolled',
  join_date:  v.joinDate   || null,
  photo:      v.photo      || '',
  created_at: v.createdAt,
});

exports.getAll = (req, res) => {
  const { search, status, page = 1, limit = 50 } = req.query;
  let list = db.volunteers;
  if (status) list = list.filter(v => v.status === status);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(v => v.firstName?.toLowerCase().includes(s) || v.lastName?.toLowerCase().includes(s));
  }
  const total = list.length;
  res.json({ success: true, data: list.slice((page-1)*limit, page*limit).map(normalize), total, page: parseInt(page) });
};

exports.getStats = (req, res) => {
  const byStatus = {};
  WORKFLOW.forEach(s => { byStatus[s] = db.volunteers.filter(v => v.status === s).length; });
  res.json({ success: true, total: db.volunteers.length, byStatus });
};

exports.getById = (req, res) => {
  const v = db.volunteers.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ message: 'Volontaire non trouvé' });
  res.json({ success: true, data: normalize(v) });
};

exports.create = (req, res) => {
  const v = {
    id: db.nextId(),
    firstName:    req.body.first_name   || '',
    lastName:     req.body.last_name    || '',
    phone:        req.body.phone        || '',
    email:        req.body.email        || '',
    motivation:   req.body.motivation   || '',
    skills:       req.body.skills       || [],
    availability: {},
    preferences:  '',
    restrictions: '',
    status:       'enrolled',
    joinDate:     req.body.join_date    || new Date().toISOString().split('T')[0],
    photo:        req.body.photo        || '',
    createdAt:    new Date().toISOString(),
  };
  db.volunteers.push(v);
  db.addAudit(req.user.id, 'CREATE', 'Volontaire', `${v.firstName} ${v.lastName}`);
  res.status(201).json({ success: true, data: normalize(v) });
};

exports.update = (req, res) => {
  const idx = db.volunteers.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Volontaire non trouvé' });
  const map = {
    first_name:'firstName', last_name:'lastName', phone:'phone', email:'email',
    motivation:'motivation', skills:'skills', status:'status', join_date:'joinDate', photo:'photo',
  };
  Object.entries(map).forEach(([k, v]) => { if (req.body[k] !== undefined) db.volunteers[idx][v] = req.body[k]; });
  res.json({ success: true, data: normalize(db.volunteers[idx]) });
};

exports.advanceWorkflow = (req, res) => {
  const v = db.volunteers.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ message: 'Volontaire non trouvé' });
  const cur = WORKFLOW.indexOf(v.status);
  if (cur === -1 || cur === WORKFLOW.length - 1) return res.status(400).json({ message: 'Statut déjà au maximum' });
  const old = v.status;
  v.status = WORKFLOW[cur + 1];
  db.addAudit(req.user.id, 'WORKFLOW', 'Volontaire', `${old} → ${v.status}`);
  res.json({ success: true, data: normalize(v) });
};
