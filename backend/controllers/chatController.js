const db = require('../db');

exports.getRooms = (req, res) => {
  const rooms = db.chatRooms.filter(r=>r.members.includes(req.user.id)).map(r=>{
    const msgs = db.chatMessages.filter(m=>m.roomId===r.id&&!m.deleted);
    const last = msgs[msgs.length-1];
    return { ...r, last_message:last?.content, last_message_at:last?.createdAt };
  }).sort((a,b)=>new Date(b.last_message_at||0)-new Date(a.last_message_at||0));
  res.json({ success:true, data:rooms });
};

exports.getChatUsers = (req, res) => {
  const data = db.users.filter(u=>u.active&&u.id!==req.user.id)
    .map(({passwordHash,...u})=>u);
  res.json({ success:true, data });
};

exports.createPrivateRoom = (req, res) => {
  const members = [req.user.id, req.body.targetUserId].sort();
  const existing = db.chatRooms.find(r=>r.type==='private'&&JSON.stringify(r.members.sort())===JSON.stringify(members));
  if (existing) return res.json({ success:true, data:existing });
  const room = { id:db.nextId(), name:'private', type:'private', members, createdBy:req.user.id, createdAt:new Date().toISOString() };
  db.chatRooms.push(room);
  res.status(201).json({ success:true, data:room });
};

exports.createGroup = (req, res) => {
  const members = [...new Set([req.user.id,...(req.body.memberIds||[])])];
  const room = { id:db.nextId(), name:req.body.name, type:'group', members, createdBy:req.user.id, createdAt:new Date().toISOString() };
  db.chatRooms.push(room);
  res.status(201).json({ success:true, data:room });
};

exports.getMessages = (req, res) => {
  const room = db.chatRooms.find(r=>r.id===req.params.roomId);
  if (!room) return res.status(404).json({ message:'Salon non trouvé' });
  if (!room.members.includes(req.user.id)) return res.status(403).json({ message:'Accès refusé' });
  const msgs = db.chatMessages.filter(m=>m.roomId===req.params.roomId&&!m.deleted).map(m=>{
    const u = db.users.find(u=>u.id===m.senderId);
    return { ...m, sender_name:u?.name, sender_username:u?.username };
  });
  res.json({ success:true, data:msgs });
};

exports.sendMessage = (req, res) => {
  const { roomId, content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message:'Message vide' });
  const room = db.chatRooms.find(r=>r.id===roomId);
  if (!room) return res.status(404).json({ message:'Salon non trouvé' });
  if (!room.members.includes(req.user.id)) return res.status(403).json({ message:'Accès refusé' });
  const msg = { id:db.nextId(), roomId, senderId:req.user.id, content:content.trim(), deleted:false, createdAt:new Date().toISOString() };
  db.chatMessages.push(msg);
  const u = db.users.find(u=>u.id===req.user.id);
  res.status(201).json({ success:true, data:{ ...msg, sender_name:u?.name, sender_username:u?.username } });
};

exports.deleteMessage = (req, res) => {
  const msg = db.chatMessages.find(m=>m.id===req.params.msgId);
  if (!msg) return res.status(404).json({ message:'Message non trouvé' });
  if (msg.senderId!==req.user.id&&!['admin','super_admin'].includes(req.user.role))
    return res.status(403).json({ message:'Accès refusé' });
  msg.deleted = true;
  res.json({ success:true, message:'Supprimé' });
};
