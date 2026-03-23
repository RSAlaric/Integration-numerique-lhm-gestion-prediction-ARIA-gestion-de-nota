// routes/index.js — LHM Madagascar — Routes complètes avec module BCC
const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// ── Controllers ─────────────────────────────────────────────
const authCtrl       = require('../controllers/authController');
const personnelCtrl  = require('../controllers/personnelController');
const stockCtrl      = require('../controllers/stockController');
const volunteersCtrl = require('../controllers/volunteersController');
const projectsCtrl   = require('../controllers/projectsController');
const dashboardCtrl  = require('../controllers/dashboardController');
const usersCtrl      = require('../controllers/usersController');
const chatCtrl       = require('../controllers/chatController');
const bccCtrl        = require('../controllers/bccController');

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
router.post('/auth/login',           authCtrl.login);
router.get ('/auth/me',  authenticate, authCtrl.getMe);
router.put ('/auth/change-password', authenticate, authCtrl.changePassword);

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
router.get('/dashboard',  authenticate, dashboardCtrl.getDashboard);
router.get('/audit-logs', authenticate, authorize('super_admin', 'admin', 'direction'), dashboardCtrl.getAuditLogs);

// ══════════════════════════════════════════════════════════════
// PERSONNEL
// ══════════════════════════════════════════════════════════════
router.get ('/personnel',       authenticate, personnelCtrl.getAll);
router.get ('/personnel/stats', authenticate, personnelCtrl.getStats);
router.post('/personnel',       authenticate, authorize('super_admin', 'assistant_admin', 'rh'), personnelCtrl.create);
router.get ('/personnel/:id',   authenticate, personnelCtrl.getById);
router.put ('/personnel/:id',   authenticate, authorize('super_admin', 'assistant_admin', 'rh'), personnelCtrl.update);
router.delete('/personnel/:id', authenticate, authorize('super_admin'), personnelCtrl.delete);

// Absences / Congés
router.get ('/absences',     authenticate, personnelCtrl.getAbsences);
router.post('/absences',     authenticate, personnelCtrl.createAbsence);
router.put ('/absences/:id', authenticate, authorize('super_admin', 'assistant_admin', 'rh', 'direction'), personnelCtrl.updateAbsence);

// ══════════════════════════════════════════════════════════════
// STOCK
// ══════════════════════════════════════════════════════════════
router.get   ('/stock',         authenticate, stockCtrl.getAll);
router.get   ('/stock/stats',   authenticate, stockCtrl.getStats);
router.post  ('/stock',         authenticate, authorize('super_admin', 'responsable_stock'), stockCtrl.create);
router.get   ('/stock/:id',     authenticate, stockCtrl.getById);
router.put   ('/stock/:id',     authenticate, authorize('super_admin', 'responsable_stock'), stockCtrl.update);
router.delete('/stock/:id',     authenticate, authorize('super_admin', 'responsable_stock'), stockCtrl.delete);
router.get   ('/stock-movements',  authenticate, stockCtrl.getMovements);
router.post  ('/stock-movements',  authenticate, authorize('super_admin', 'responsable_stock'), stockCtrl.createMovement);

// Catégories stock (lecture)
router.get('/stock-categories', authenticate, (req, res) => {
  const db = require('../db');
  res.json({ success: true, data: db.stockCategories });
});

// ══════════════════════════════════════════════════════════════
// VOLONTAIRES
// ══════════════════════════════════════════════════════════════
router.get('/volunteers',               authenticate, volunteersCtrl.getAll);
router.get('/volunteers/stats',         authenticate, volunteersCtrl.getStats);
router.post('/volunteers',              authenticate, authorize('super_admin', 'responsable_volontaires'), volunteersCtrl.create);
router.get('/volunteers/:id',           authenticate, volunteersCtrl.getById);
router.put('/volunteers/:id',           authenticate, authorize('super_admin', 'responsable_volontaires'), volunteersCtrl.update);
router.put('/volunteers/:id/workflow',  authenticate, authorize('super_admin', 'responsable_volontaires'), volunteersCtrl.advanceWorkflow);

// ══════════════════════════════════════════════════════════════
// PROJETS
// ══════════════════════════════════════════════════════════════
router.get   ('/projects',      authenticate, projectsCtrl.getAll);
router.get   ('/projects/stats',authenticate, projectsCtrl.getStats);
router.post  ('/projects',      authenticate, authorize('super_admin', 'direction', 'coordinateur'), projectsCtrl.create);
router.get   ('/projects/:id',  authenticate, projectsCtrl.getById);
router.put   ('/projects/:id',  authenticate, authorize('super_admin', 'direction', 'coordinateur'), projectsCtrl.update);

// ══════════════════════════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════════════════════════
router.get   ('/users',                  authenticate, authorize('super_admin', 'admin'), usersCtrl.getAll);
router.put   ('/users/me/profile',         authenticate, usersCtrl.updateMyProfile);
router.post  ('/users',                  authenticate, authorize('super_admin', 'admin'), usersCtrl.create);
router.put   ('/users/:id',              authenticate, authorize('super_admin', 'admin'), usersCtrl.update);
router.put   ('/users/:id/toggle-block', authenticate, authorize('super_admin', 'admin'), usersCtrl.toggleBlock);

// Services (lecture)
router.get('/services', authenticate, (req, res) => {
  const db = require('../db');
  res.json({ success: true, data: db.services });
});

// ══════════════════════════════════════════════════════════════
// MESSAGERIE (Chat)
// ══════════════════════════════════════════════════════════════
router.get   ('/chat/rooms',              authenticate, chatCtrl.getRooms);
router.get   ('/chat/users',              authenticate, chatCtrl.getChatUsers);
router.post  ('/chat/rooms/private',      authenticate, chatCtrl.createPrivateRoom);
router.post  ('/chat/rooms/group',        authenticate, chatCtrl.createGroup);
router.get   ('/chat/messages/:roomId',   authenticate, chatCtrl.getMessages);
router.post  ('/chat/messages',           authenticate, chatCtrl.sendMessage);
router.delete('/chat/messages/:msgId',    authenticate, chatCtrl.deleteMessage);

// ══════════════════════════════════════════════════════════════
// BCC — Bible Correspondence Course
// ══════════════════════════════════════════════════════════════

// Lecture (tous les utilisateurs authentifiés)
router.get('/bcc/stats',                   authenticate, bccCtrl.getStats);
router.get('/bcc/structure',               authenticate, bccCtrl.getCourseStructure);
router.get('/bcc/etudiants',               authenticate, bccCtrl.getAllEtudiants);
router.get('/bcc/etudiants/:id',           authenticate, bccCtrl.getEtudiantById);
router.get('/bcc/etudiants/:id/notes',     authenticate, bccCtrl.getNotes);
router.get('/bcc/rapport/etudiant/:id',    authenticate, bccCtrl.getRapportEtudiant);

// Écriture (super_admin, admin, assistant_admin, responsable_bcc)
router.post  ('/bcc/etudiants',   authenticate, authorize('super_admin', 'admin', 'assistant_admin', 'responsable_bcc'), bccCtrl.createEtudiant);
router.put   ('/bcc/etudiants/:id', authenticate, authorize('super_admin', 'admin', 'assistant_admin', 'responsable_bcc'), bccCtrl.updateEtudiant);
router.delete('/bcc/etudiants/:id', authenticate, authorize('super_admin', 'admin', 'assistant_admin'), bccCtrl.deleteEtudiant);

// Notes
router.post  ('/bcc/notes',     authenticate, authorize('super_admin', 'admin', 'assistant_admin', 'responsable_bcc'), bccCtrl.saveNote);
router.delete('/bcc/notes/:id', authenticate, authorize('super_admin', 'admin', 'assistant_admin'), bccCtrl.deleteNote);

module.exports = router;

// ══════════════════════════════════════════════════════════════
// IA — ARIA (proxy vers Anthropic)
// ══════════════════════════════════════════════════════════════
const aiCtrl = require('../controllers/aiController');
router.post('/ai/chat',    authenticate, aiCtrl.chat);
router.post('/ai/predict', authenticate, aiCtrl.predict);
