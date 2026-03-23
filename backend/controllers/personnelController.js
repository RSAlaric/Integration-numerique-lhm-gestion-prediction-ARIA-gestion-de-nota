const db = require('../db');

// Normalise les champs camelCase → snake_case pour le frontend
const normalize = p => ({
  id:                p.id,
  matricule:         p.matricule,
  first_name:        p.firstName,
  last_name:         p.lastName,
  maiden_name:       p.maidenName       || '',
  birth_date:        p.birthDate        || null,
  birth_place:       p.birthPlace       || '',
  address:           p.address          || '',
  phone:             p.phone            || '',
  email:             p.email            || '',
  family_situation:  p.familySituation  || '',
  emergency_contact: p.emergencyContact || {},
  entry_date:        p.entryDate        || null,
  poste:             p.poste            || '',
  service:           p.service          || '',
  service_name:      db.services.find(s => s.id === p.service)?.name || '',
  contract_type:     p.contractType     || '',
  salary:            p.salary           || null,
  rib:               p.rib              || '',
  banque:            p.banque           || '',
  cin_numero:        p.cinNumero        || '',
  cin_date:          p.cinDate          || null,
  cin_lieu:          p.cinLieu          || '',
  cnaps:             p.cnaps            || '',
  aro:               p.aro              || '',
  photo:             p.photo            || '',
  doc_diplome:       p.docDiplome       || null,
  doc_cv:            p.docCv            || null,
  doc_contrat:       p.docContrat       || null,
  status:            p.status           || 'active',
  created_at:        p.createdAt,
});

exports.getAll = (req, res) => {
  const { search, service, status, page = 1, limit = 50 } = req.query;
  let list = db.personnel;
  if (status)  list = list.filter(p => p.status === status);
  if (service) list = list.filter(p => p.service === service);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p =>
      p.firstName?.toLowerCase().includes(s) || p.lastName?.toLowerCase().includes(s) ||
      p.matricule?.toLowerCase().includes(s)  || p.cinNumero?.toLowerCase().includes(s)
    );
  }
  const total = list.length;
  let data = list.slice((page - 1) * limit, page * limit).map(normalize);
  // masquer infos financières selon rôle
  const canSee = ['admin','super_admin','direction','rh','assistant_admin'].includes(req.user.role);
  if (!canSee) data = data.map(({ salary, rib, banque, cin_numero, cin_date, cin_lieu, ...r }) => r);
  res.json({ success: true, data, total, page: parseInt(page) });
};

exports.getStats = (req, res) => {
  const active = db.personnel.filter(p => p.status === 'active');
  const byService = {};
  active.forEach(p => { const n = db.services.find(s => s.id === p.service)?.name || 'Autre'; byService[n] = (byService[n] || 0) + 1; });
  const byContrat = {};
  active.forEach(p => { byContrat[p.contractType] = (byContrat[p.contractType] || 0) + 1; });
  res.json({ success: true, total: active.length,
    parService: Object.entries(byService).map(([service, count]) => ({ service, count })),
    parContrat: Object.entries(byContrat).map(([contract_type, count]) => ({ contract_type, count })),
    parStatut:  ['active','inactive','suspended'].map(s => ({ status: s, count: db.personnel.filter(p => p.status === s).length })),
  });
};

exports.getById = (req, res) => {
  const p = db.personnel.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Personnel non trouvé' });
  res.json({ success: true, data: normalize(p) });
};

exports.create = (req, res) => {
  const count    = db.personnel.length + 1;
  const id       = db.nextId();
  const matricule = req.body.matricule || `LHM-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
  const p = {
    id, matricule,
    firstName:        req.body.first_name        || '',
    lastName:         req.body.last_name         || '',
    maidenName:       req.body.maiden_name        || '',
    birthDate:        req.body.birth_date         || null,
    birthPlace:       req.body.birth_place        || '',
    address:          req.body.address            || '',
    phone:            req.body.phone              || '',
    email:            req.body.email              || '',
    familySituation:  req.body.family_situation   || '',
    emergencyContact: req.body.emergency_contact  || {},
    entryDate:        req.body.entry_date         || null,
    poste:            req.body.poste              || '',
    service:          req.body.service            || '',
    contractType:     req.body.contract_type      || '',
    salary:           req.body.salary             || null,
    rib:              req.body.rib                || '',
    banque:           req.body.banque             || '',
    cinNumero:        req.body.cin_numero         || '',
    cinDate:          req.body.cin_date           || null,
    cinLieu:          req.body.cin_lieu           || '',
    cnaps:            req.body.cnaps              || '',
    aro:              req.body.aro                || '',
    photo:            req.body.photo              || '',
    docDiplome:       req.body.doc_diplome        || null,
    docCv:            req.body.doc_cv             || null,
    docContrat:       req.body.doc_contrat        || null,
    status:           req.body.status             || 'active',
    createdAt:        new Date().toISOString(),
  };
  db.personnel.push(p);
  db.addAudit(req.user.id, 'CREATE', 'Personnel', `${p.firstName} ${p.lastName} (${matricule})`);
  res.status(201).json({ success: true, data: normalize(p) });
};

exports.update = (req, res) => {
  const idx = db.personnel.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Personnel non trouvé' });
  const map = {
    first_name:'firstName', last_name:'lastName', maiden_name:'maidenName',
    birth_date:'birthDate', birth_place:'birthPlace', address:'address',
    phone:'phone', email:'email', family_situation:'familySituation',
    emergency_contact:'emergencyContact', entry_date:'entryDate',
    poste:'poste', service:'service', contract_type:'contractType',
    salary:'salary', rib:'rib', banque:'banque',
    cin_numero:'cinNumero', cin_date:'cinDate', cin_lieu:'cinLieu',
    cnaps:'cnaps', aro:'aro', photo:'photo', status:'status',
    doc_diplome:'docDiplome', doc_cv:'docCv', doc_contrat:'docContrat',
  };
  Object.entries(map).forEach(([k, v]) => { if (req.body[k] !== undefined) db.personnel[idx][v] = req.body[k]; });
  db.addAudit(req.user.id, 'UPDATE', 'Personnel', `Mis à jour: ${db.personnel[idx].firstName} ${db.personnel[idx].lastName}`);
  res.json({ success: true, data: normalize(db.personnel[idx]) });
};

exports.delete = (req, res) => {
  const idx = db.personnel.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Personnel non trouvé' });
  const [p] = db.personnel.splice(idx, 1);
  db.absences = db.absences.filter(a => a.personnelId !== p.id);
  db.addAudit(req.user.id, 'DELETE', 'Personnel', p.matricule);
  res.json({ success: true, message: 'Supprimé' });
};

// ── Absences ─────────────────────────────────────────────────
exports.getAbsences = (req, res) => {
  const { status, personnel_id } = req.query;
  let list = db.absences;
  if (status)       list = list.filter(a => a.status === status);
  if (personnel_id) list = list.filter(a => a.personnelId === personnel_id);
  const data = list.map(a => {
    const p = db.personnel.find(p => p.id === a.personnelId);
    return {
      ...a,
      start_date:   a.startDate,
      end_date:     a.endDate,
      personnel_id: a.personnelId,
      first_name:   p?.firstName  || '',
      last_name:    p?.lastName   || '',
      matricule:    p?.matricule  || '',
      photo:        p?.photo      || '',
    };
  }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  res.json({ success: true, data });
};

exports.createAbsence = (req, res) => {
  const { personnel_id, type, start_date, end_date, reason } = req.body;
  const a = {
    id: db.nextId(), personnelId: personnel_id, type,
    startDate: start_date, endDate: end_date,
    reason, status: 'pending',
    requestedAt: new Date().toISOString(),
    validatedBy: null, validatedAt: null, comments: '',
  };
  db.absences.push(a);
  db.addAudit(req.user.id, 'LEAVE_REQUEST', 'Absence', type);
  const p = db.personnel.find(p => p.id === personnel_id);
  res.status(201).json({ success: true, data: {
    ...a, start_date: a.startDate, end_date: a.endDate,
    personnel_id: a.personnelId, first_name: p?.firstName, last_name: p?.lastName,
  }});
};

exports.updateAbsence = (req, res) => {
  const a = db.absences.find(a => a.id === req.params.id);
  if (!a) return res.status(404).json({ message: 'Demande non trouvée' });
  a.status      = req.body.status;
  a.comments    = req.body.comments || '';
  a.validatedBy = req.user.id;
  a.validatedAt = new Date().toISOString();
  db.addAudit(req.user.id, 'LEAVE_VALIDATED', 'Absence', req.body.status);
  res.json({ success: true, data: { ...a, start_date: a.startDate, end_date: a.endDate, personnel_id: a.personnelId } });
};
