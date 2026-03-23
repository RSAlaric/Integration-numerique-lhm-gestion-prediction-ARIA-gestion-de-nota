const db = require('../db');

exports.getAll = (req, res) => {
  const { search, category, alert, page=1, limit=50 } = req.query;
  let list = db.stockItems;
  if (search)   { const s=search.toLowerCase(); list=list.filter(i=>i.name.toLowerCase().includes(s)||i.code.toLowerCase().includes(s)); }
  if (category) list = list.filter(i=>i.categoryId===category);
  if (alert==='critical') list = list.filter(i=>i.quantity<=i.minStock);
  if (alert==='safety')   list = list.filter(i=>i.quantity>i.minStock&&i.quantity<=i.safetyStock);
  const total = list.length;
  const data  = list.slice((page-1)*limit, page*limit).map(i=>({
    ...i, category_name: db.stockCategories.find(c=>c.id===i.categoryId)?.name
  }));
  res.json({ success:true, data, total, page:parseInt(page) });
};

exports.getStats = (req, res) => {
  const total      = db.stockItems.length;
  const critical   = db.stockItems.filter(i=>i.quantity<=i.minStock).length;
  const safety     = db.stockItems.filter(i=>i.quantity>i.minStock&&i.quantity<=i.safetyStock).length;
  const totalValue = db.stockItems.reduce((s,i)=>s+i.quantity*i.unitPrice, 0);
  res.json({ success:true, total, critical, safety, totalValue, expiringSoon:0,
    parCategorie: db.stockCategories.map(c=>({
      name:c.name,
      articles: db.stockItems.filter(i=>i.categoryId===c.id).length,
      valeur: db.stockItems.filter(i=>i.categoryId===c.id).reduce((s,i)=>s+i.quantity*i.unitPrice,0),
    }))
  });
};

exports.getById = (req, res) => {
  const item = db.stockItems.find(i=>i.id===req.params.id);
  if (!item) return res.status(404).json({ message:'Article non trouvé' });
  res.json({ success:true, data:{ ...item, category_name:db.stockCategories.find(c=>c.id===item.categoryId)?.name } });
};

exports.create = (req, res) => {
  const id   = db.nextId();
  const code = req.body.code || `LHM-ART-${String(db.stockItems.length+1).padStart(4,'0')}`;
  const item = { id, code, name:req.body.name, categoryId:req.body.category_id||null,
    subcategoryId:req.body.subcategory_id||null, unit:req.body.unit||'pièce',
    unitPrice:parseFloat(req.body.unit_price)||0, quantity:0,
    minStock:parseInt(req.body.min_stock)||0, safetyStock:parseInt(req.body.safety_stock)||0,
    supplier:req.body.supplier||'', location:req.body.location||'',
    description:req.body.description||'', photo:'', createdAt:new Date().toISOString() };
  db.stockItems.push(item);
  db.addAudit(req.user.id, 'CREATE', 'Stock', `Article: ${item.name}`);
  res.status(201).json({ success:true, data:item });
};

exports.update = (req, res) => {
  const idx = db.stockItems.findIndex(i=>i.id===req.params.id);
  if (idx===-1) return res.status(404).json({ message:'Article non trouvé' });
  const map = { name:'name', category_id:'categoryId', unit:'unit', unit_price:'unitPrice',
    quantity:'quantity', min_stock:'minStock', safety_stock:'safetyStock',
    supplier:'supplier', location:'location', description:'description' };
  Object.entries(map).forEach(([k,v])=>{ if (req.body[k]!==undefined) db.stockItems[idx][v]=req.body[k]; });
  db.addAudit(req.user.id, 'UPDATE', 'Stock', db.stockItems[idx].name);
  res.json({ success:true, data:db.stockItems[idx] });
};

exports.delete = (req, res) => {
  const idx = db.stockItems.findIndex(i=>i.id===req.params.id);
  if (idx===-1) return res.status(404).json({ message:'Article non trouvé' });
  const [item] = db.stockItems.splice(idx,1);
  db.stockMovements = db.stockMovements.filter(m=>m.itemId!==item.id);
  res.json({ success:true, message:'Supprimé' });
};

exports.getMovements = (req, res) => {
  const { type, itemId, page=1, limit=50 } = req.query;
  let list = db.stockMovements;
  if (type)   list=list.filter(m=>m.type===type);
  if (itemId) list=list.filter(m=>m.itemId===itemId);
  const total=list.length;
  const data=list.slice((page-1)*limit,page*limit).map(m=>{
    const item=db.stockItems.find(i=>i.id===m.itemId);
    return { ...m, item_name:item?.name, item_code:item?.code, unit:item?.unit };
  });
  res.json({ success:true, data, total });
};

exports.createMovement = (req, res) => {
  const { type, item_id, quantity, reference, reason } = req.body;
  const qty = parseInt(quantity);
  const idx = db.stockItems.findIndex(i=>i.id===item_id);
  if (idx===-1) return res.status(404).json({ message:'Article non trouvé' });
  if (type==='exit' && db.stockItems[idx].quantity < qty)
    return res.status(400).json({ message:`Stock insuffisant. Disponible: ${db.stockItems[idx].quantity}` });
  const delta = type==='entry' ? qty : type==='exit' ? -qty : 0;
  db.stockItems[idx].quantity += delta;
  const mvt = { id:db.nextId(), type, itemId:item_id, quantity:qty,
    date:new Date().toISOString(), reference:reference||'', reason:reason||'',
    validatedBy:req.user.id, createdAt:new Date().toISOString() };
  db.stockMovements.unshift(mvt);
  db.addAudit(req.user.id, type==='entry'?'STOCK_ENTRY':'STOCK_EXIT', 'Stock', `${qty} x ${db.stockItems[idx].name}`);
  res.status(201).json({ success:true, data:mvt });
};
