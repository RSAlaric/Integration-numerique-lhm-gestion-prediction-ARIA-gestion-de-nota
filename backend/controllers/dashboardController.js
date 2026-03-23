const db = require('../db');

exports.getDashboard = (req, res) => {
  const activePersonnel = db.personnel.filter(p => p.status === 'active').length;
  const pendingLeave    = db.absences.filter(a => a.status === 'pending').length;
  const criticalStock   = db.stockItems.filter(i => i.quantity <= i.minStock).length;
  const activeProjects  = db.projects.filter(p => p.status === 'active').length;
  const delayedProjects = db.projects.filter(p => p.status === 'delayed').length;
  const totalStockValue = db.stockItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const alerts = [];
  db.stockItems.filter(i => i.quantity <= i.minStock).slice(0, 5).forEach(i =>
    alerts.push({ type:'stock', severity:'high', message:`Stock critique: ${i.name} (${i.quantity} ${i.unit})`, id:i.id })
  );
  if (pendingLeave > 0)
    alerts.push({ type:'leave', severity:'medium', message:`${pendingLeave} demande(s) de congé en attente`, id:'leaves' });

  res.json({
    success: true,
    stats: {
      totalPersonnel: activePersonnel,
      totalVolunteers: db.volunteers.length,
      activeProjects,
      pendingLeave,
      criticalStock,
      delayedProjects,
      totalStockValue,
    },
    alerts,
    recentActivity: db.auditLogs.slice(0, 10).map(l => ({
      ...l,
      user_name: db.users.find(u => u.id === l.userId)?.name || l.userId,
      username:  db.users.find(u => u.id === l.userId)?.username || l.userId,
    })),
  });
};

exports.getAuditLogs = (req, res) => {
  const logs = db.auditLogs.slice(0, 100).map(l => ({
    ...l,
    user_name: db.users.find(u => u.id === l.userId)?.name || l.userId,
    username:  db.users.find(u => u.id === l.userId)?.username || l.userId,
  }));
  res.json({ success: true, data: logs });
};
