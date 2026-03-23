const db = require('../db');

exports.getAll = (req, res) => {
  const { search, status, page=1, limit=50 } = req.query;
  let list = db.projects;
  if (status) list=list.filter(p=>p.status===status);
  if (search) { const s=search.toLowerCase(); list=list.filter(p=>p.name.toLowerCase().includes(s)); }
  const total=list.length;
  res.json({ success:true, data:list.slice((page-1)*limit,page*limit), total, page:parseInt(page) });
};

exports.getStats = (req, res) => {
  const byStatus={};
  ['planning','active','completed','delayed','cancelled'].forEach(s=>{ byStatus[s]=db.projects.filter(p=>p.status===s).length; });
  res.json({ success:true, byStatus,
    budgetTotal: db.projects.reduce((s,p)=>s+parseFloat(p.budget||0),0),
    budgetUsed:  db.projects.reduce((s,p)=>s+parseFloat(p.budgetUsed||0),0),
  });
};

exports.getById = (req, res) => {
  const p=db.projects.find(p=>p.id===req.params.id);
  if (!p) return res.status(404).json({ message:'Projet non trouvé' });
  res.json({ success:true, data:p });
};

exports.create = (req, res) => {
  const p={ id:db.nextId(), name:req.body.name, description:req.body.description||'',
    status:req.body.status||'planning', startDate:req.body.start_date||null, endDate:req.body.end_date||null,
    budget:parseFloat(req.body.budget)||0, budgetUsed:0, progress:0,
    coordinator:req.body.coordinator||'', team:[], risks:[], createdAt:new Date().toISOString() };
  db.projects.push(p);
  db.addAudit(req.user.id,'CREATE','Projet',p.name);
  res.status(201).json({ success:true, data:p });
};

exports.update = (req, res) => {
  const idx=db.projects.findIndex(p=>p.id===req.params.id);
  if (idx===-1) return res.status(404).json({ message:'Projet non trouvé' });
  const map={ name:'name', description:'description', status:'status', start_date:'startDate',
    end_date:'endDate', budget:'budget', budget_used:'budgetUsed', progress:'progress', coordinator:'coordinator' };
  Object.entries(map).forEach(([k,v])=>{ if (req.body[k]!==undefined) db.projects[idx][v]=req.body[k]; });
  db.addAudit(req.user.id,'UPDATE','Projet',db.projects[idx].name);
  res.json({ success:true, data:db.projects[idx] });
};
