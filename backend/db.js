// db.js — Base de données en mémoire pour LHM Madagascar
// Aucune installation requise — tout tourne avec Node.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ══════════════════════════════════════════════════════════════
// DONNÉES INITIALES
// ══════════════════════════════════════════════════════════════

const db = {

  // ── Services ────────────────────────────────────────────────
  services: [
    { id: 's1', name: 'Direction Générale' },
    { id: 's2', name: 'Administration & RH' },
    { id: 's3', name: 'Diffusion Radio' },
    { id: 's4', name: 'Projets Communautaires' },
    { id: 's5', name: 'Logistique & Stock' },
    { id: 's6', name: 'Informatique' },
    { id: 's7', name: 'Communication' },
  ],

  // ── Utilisateurs ────────────────────────────────────────────
  users: [
    { id:'u1', username:'admin',        email:'admin@lhm-madagascar.org',       passwordHash: bcrypt.hashSync('Admin@1234',10),     role:'admin',                   name:'Administrateur Système',  service:'s6', active:true, locked:false, failedAttempts:0, lastLogin:null, photo:'', createdAt:new Date().toISOString() },
    { id:'u2', username:'direction',    email:'direction@lhm-madagascar.org',   passwordHash: bcrypt.hashSync('Direction@1234',10), role:'direction',               name:'Jean-Baptiste Rakoto',    service:'s1', active:true, locked:false, failedAttempts:0, lastLogin:null, photo:'', createdAt:new Date().toISOString() },
    { id:'u3', username:'rh',           email:'rh@lhm-madagascar.org',          passwordHash: bcrypt.hashSync('RH@1234',10),        role:'rh',                      name:'Marie Razafimahaleo',     service:'s2', active:true, locked:false, failedAttempts:0, lastLogin:null, photo:'', createdAt:new Date().toISOString() },
    { id:'u4', username:'stock',        email:'stock@lhm-madagascar.org',       passwordHash: bcrypt.hashSync('Stock@1234',10),     role:'responsable_stock',       name:'Pierre Andriantsoa',      service:'s5', active:true, locked:false, failedAttempts:0, lastLogin:null, photo:'', createdAt:new Date().toISOString() },
    { id:'u5', username:'coordinateur', email:'coord@lhm-madagascar.org',       passwordHash: bcrypt.hashSync('Coord@1234',10),     role:'coordinateur',            name:'Sarah Randrianasolo',     service:'s4', active:true, locked:false, failedAttempts:0, lastLogin:null, photo:'', createdAt:new Date().toISOString() },
    { id:'u6', username:'volontaires',  email:'volontaires@lhm-madagascar.org', passwordHash: bcrypt.hashSync('Vol@1234',10),       role:'responsable_volontaires', name:'Paul Rabemananjara',      service:'s4', active:true, locked:false, failedAttempts:0, lastLogin:null, photo:'', createdAt:new Date().toISOString() },
  ],

  // ── Personnel ────────────────────────────────────────────────
  personnel: [
    {
      id:'p1', matricule:'LHM-2023-0001', firstName:'Jean', lastName:'Rakoto',
      birthDate:'1985-03-15', birthPlace:'Antananarivo', address:'Lot II J 42 Antananarivo',
      phone:'034 12 345 67', email:'jean.rakoto@lhm-madagascar.org',
      familySituation:'Marié(e)', emergencyContact:{ nom:'Marie Rakoto', tel:'033 11 222 33' },
      entryDate:'2023-01-10', poste:'Responsable Communication', service:'s7',
      contractType:'CDI', salary:1200000,
      cinNumero:'101 234 567 890', cinDate:'2020-05-10', cinLieu:'Antananarivo',
      rib:'00003 00001 12345678901 97', banque:'BNI Madagascar',
      cnaps:'CNP-001234', aro:'ARO-5678',
      photo:'', docDiplome:null, docCv:null, docContrat:null,
      status:'active', createdAt:new Date().toISOString(),
    },
    {
      id:'p2', matricule:'LHM-2023-0002', firstName:'Hanta', lastName:'Razafy',
      birthDate:'1990-07-22', birthPlace:'Fianarantsoa', address:'Cité Ampefiloha',
      phone:'033 22 456 78', email:'hanta.razafy@lhm-madagascar.org',
      familySituation:'Célibataire', emergencyContact:{ nom:'Lala Razafy', tel:'034 55 666 77' },
      entryDate:'2023-03-01', poste:'Assistante Administrative', service:'s2',
      contractType:'CDD', salary:900000,
      cinNumero:'201 345 678 901', cinDate:'2019-11-20', cinLieu:'Fianarantsoa',
      rib:'', banque:'BOA Madagascar',
      cnaps:'', aro:'',
      photo:'', docDiplome:null, docCv:null, docContrat:null,
      status:'active', createdAt:new Date().toISOString(),
    },
  ],

  // ── Absences ─────────────────────────────────────────────────
  absences: [
    {
      id:'a1', personnelId:'p1', type:'Congé annuel',
      startDate:'2024-07-01', endDate:'2024-07-10', reason:'Vacances familiales',
      status:'approved', requestedAt:new Date().toISOString(),
      validatedBy:'u1', validatedAt:new Date().toISOString(), comments:'Accordé',
    },
  ],

  // ── Stock ────────────────────────────────────────────────────
  stockCategories: [
    { id:'cat1', name:'Fournitures de Bureau',  subcategories:[{id:'sub1',name:'Papeterie'},{id:'sub2',name:'Mobilier'}] },
    { id:'cat2', name:'Équipements',            subcategories:[{id:'sub3',name:'Équipements Radio'},{id:'sub4',name:'Accessoires'}] },
    { id:'cat3', name:'Alimentaire',            subcategories:[{id:'sub5',name:'Vivres'},{id:'sub6',name:'Boissons'}] },
    { id:'cat4', name:'Médical',                subcategories:[{id:'sub7',name:'Médicaments'},{id:'sub8',name:'Matériel de Soin'}] },
    { id:'cat5', name:'Informatique',           subcategories:[{id:'sub9',name:'Matériel'},{id:'sub10',name:'Consommables'}] },
  ],

  stockItems: [
    { id:'si1', code:'LHM-ART-0001', name:'Rames de papier A4', categoryId:'cat1', subcategoryId:'sub1', unit:'rame', unitPrice:12000, quantity:50, minStock:10, safetyStock:20, supplier:'Bureau Plus', location:'Magasin A', description:'', photo:'', createdAt:new Date().toISOString() },
    { id:'si2', code:'LHM-ART-0002', name:'Stylos bille bleus', categoryId:'cat1', subcategoryId:'sub1', unit:'boîte', unitPrice:8500, quantity:8, minStock:10, safetyStock:15, supplier:'Bureau Plus', location:'Magasin A', description:'', photo:'', createdAt:new Date().toISOString() },
    { id:'si3', code:'LHM-ART-0003', name:'Micro HF Sennheiser', categoryId:'cat2', subcategoryId:'sub3', unit:'pièce', unitPrice:450000, quantity:3, minStock:2, safetyStock:3, supplier:'Radio Équipement', location:'Studio', description:'', photo:'', createdAt:new Date().toISOString() },
    { id:'si4', code:'LHM-ART-0004', name:'Cartouche encre HP', categoryId:'cat5', subcategoryId:'sub10', unit:'pièce', unitPrice:35000, quantity:2, minStock:3, safetyStock:5, supplier:'HP Madagascar', location:'Magasin A', description:'', photo:'', createdAt:new Date().toISOString() },
  ],

  stockMovements: [],

  // ── Volontaires ──────────────────────────────────────────────
  volunteers: [
    { id:'v1', firstName:'Fidy', lastName:'Andriamanantena', phone:'034 77 888 99', email:'fidy@email.mg', motivation:'Servir le Seigneur', skills:['Correcteur BCC','Volontaire BCC'], availability:{}, status:'active', joinDate:'2023-06-01', photo:'', createdAt:new Date().toISOString() },
    { id:'v2', firstName:'Voahangy', lastName:'Ratsimbazafy', phone:'033 44 555 66', email:'voahangy@email.mg', motivation:'Évangélisation', skills:['Opérateur de saisie'], availability:{}, status:'enrolled', joinDate:'2024-01-15', photo:'', createdAt:new Date().toISOString() },
  ],

  // ── Projets ──────────────────────────────────────────────────
  projects: [
    { id:'pr1', name:'Émission Radio Jeunesse', description:'Programme hebdomadaire pour les jeunes', status:'active', startDate:'2024-01-01', endDate:'2024-12-31', budget:5000000, budgetUsed:1800000, progress:35, coordinator:'Jean Rakoto', team:[], risks:[], createdAt:new Date().toISOString() },
    { id:'pr2', name:'Distribution BCC Région Sud', description:'Distribution de cours BCC dans le sud', status:'planning', startDate:'2024-06-01', endDate:'2024-11-30', budget:2000000, budgetUsed:0, progress:0, coordinator:'', team:[], risks:[], createdAt:new Date().toISOString() },
  ],

  // ── Chat ─────────────────────────────────────────────────────
  chatRooms: [],
  chatMessages: [],

  // ── Audit Logs ───────────────────────────────────────────────
  auditLogs: [
    { id:'log_init', timestamp:new Date().toISOString(), userId:'u1', action:'INIT', object:'Système', oldValue:null, newValue:'Application démarrée' },
  ],

  // ── BCC Étudiants ─────────────────────────────────────────────
  bccEtudiants: [
    {
      id:'bcc1', numeroEtudiant:'FRA-2024-0001', prenom:'Andry', nom:'Rakotondrabe',
      dateNaissance:'2000-05-12', sexe:'Homme', situationMatrimoniale:'Célibataire',
      adresse:'Antananarivo, Analakely', bp:'', codePostal:'101', telephone:'034 11 222 33',
      situation:{ type:'Étudiant', niveau:'Université' },
      eglise:{ nom:'FPMA Analakely', adresse:'Analakely', hierarchie:'Paroisse' },
      sourceInfo:'Programme Radio',
      langue:'Français', volontaireResponsable:'Fidy Andriamanantena',
      dateInscription:'2024-03-01', classeActuelle:1, statut:'actif',
      createdAt:new Date().toISOString(),
    },
    {
      id:'bcc2', numeroEtudiant:'ENG-2024-0002', prenom:'Lalaina', nom:'Randriamahefa',
      dateNaissance:'1998-09-20', sexe:'Femme', situationMatrimoniale:'Célibataire',
      adresse:'Fianarantsoa', bp:'', codePostal:'301', telephone:'033 55 666 77',
      situation:{ type:'Employé', profession:'Enseignante' },
      eglise:{ nom:'FLM Fianarantsoa', adresse:'Fianarantsoa', hierarchie:'Diocèse' },
      sourceInfo:'Témoignage d\'un volontaire',
      langue:'English', volontaireResponsable:'Voahangy Ratsimbazafy',
      dateInscription:'2024-04-15', classeActuelle:1, statut:'actif',
      createdAt:new Date().toISOString(),
    },
  ],

  // ── BCC Notes ─────────────────────────────────────────────────
  bccNotes: [
    { id:'n1', etudiantId:'bcc1', anneeId:1, lecon:1, note:16, commentaire:'Excellent', dateNote:new Date().toISOString(), createdAt:new Date().toISOString() },
    { id:'n2', etudiantId:'bcc1', anneeId:1, lecon:2, note:14, commentaire:'Bien', dateNote:new Date().toISOString(), createdAt:new Date().toISOString() },
    { id:'n3', etudiantId:'bcc1', anneeId:1, lecon:3, note:18, commentaire:'Très bien', dateNote:new Date().toISOString(), createdAt:new Date().toISOString() },
    { id:'n4', etudiantId:'bcc2', anneeId:1, lecon:1, note:12, commentaire:'', dateNote:new Date().toISOString(), createdAt:new Date().toISOString() },
  ],
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

db.nextId = () => uuidv4();

db.addAudit = (userId, action, object, newValue = '', oldValue = '') => {
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId, action, object, oldValue, newValue,
  });
  if (db.auditLogs.length > 500) db.auditLogs.pop();
};

module.exports = db;
