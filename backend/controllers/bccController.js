// bccController.js — BCC avec notes pondérées par leçon
const db = require('../db');

// ══════════════════════════════════════════════════════════════
// STRUCTURE DES COURS — notes max par leçon selon langue/année
// ══════════════════════════════════════════════════════════════
const COURSE_STRUCTURE = {
  English: {
    annees: [
      {
        id: 1, label: 'First Year', lessonLabel: 'Lesson',
        lessons: [
          { num:1, max:20 }, { num:2, max:25 }, { num:3, max:10 },
          { num:4, max:25 }, { num:5, max:30 }, { num:6, max:20 },
          { num:7, max:13 }, { num:8, max:10 }, { num:9, max:10 }, { num:10, max:10 },
        ],
      },
      {
        id: 2, label: 'Second Year', lessonLabel: 'Lesson',
        lessons: [
          { num:1, max:20 }, { num:2, max:25 }, { num:3, max:10 },
          { num:4, max:25 }, { num:5, max:30 }, { num:6, max:10 },
          { num:7, max:10 }, { num:8, max:10 }, { num:9, max:20 }, { num:10, max:20 },
        ],
      },
    ],
  },
  Français: {
    annees: [
      {
        id: 1, label: 'Première Année', lessonLabel: 'Leçon',
        lessons: [
          { num:1, max:18 }, { num:2, max:25 }, { num:3, max:10 },
          { num:4, max:25 }, { num:5, max:30 }, { num:6, max:20 },
          { num:7, max:13 }, { num:8, max:10 }, { num:9, max:10 }, { num:10, max:10 },
        ],
      },
    ],
  },
  Malagasy: {
    annees: [
      {
        id: 1, label: 'Ambaratonga Voalohany', lessonLabel: 'Lesona',
        lessons: [
          { num:1, max:30 }, { num:2, max:30 },
        ],
      },
      {
        id: 2, label: 'Ambaratonga Faharoa', lessonLabel: 'Lesona',
        lessons: [
          { num:1, max:30 }, { num:2, max:30 },
        ],
      },
    ],
  },
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

// Mention basée sur pourcentage (%)
const getMention = pct => {
  if (pct === null || pct === undefined) return null;
  pct = parseFloat(pct);
  if (pct >= 80) return 'Très Bien';
  if (pct >= 70) return 'Bien';
  if (pct >= 60) return 'Assez Bien';
  if (pct >= 50) return 'Passable';
  return 'Insuffisant';
};

const genNumero = langue => {
  const p = { Français:'FRA', English:'ENG', Malagasy:'MLG' }[langue] || 'BCC';
  return `${p}-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9999)).padStart(4,'0')}`;
};

// Calcul des stats d'une année — basé sur les maxima par leçon
const calcAnneeStats = (notes, anneeConfig) => {
  const anneeId = anneeConfig.id;
  const lessons = anneeConfig.lessons;
  const totalPossible = lessons.reduce((s, l) => s + l.max, 0);
  const count = lessons.length;

  const ns = notes.filter(n => n.anneeId === anneeId);
  if (!ns.length) return {
    lecons: 0, totalObtenu: 0, totalPossible, pourcentage: null,
    moyenne: null, mention: null, complete: false, valide: false, statut: 'en_cours',
  };

  const totalObtenu = ns.reduce((s, n) => s + parseFloat(n.note || 0), 0);
  const complete    = ns.length >= count;

  // Pourcentage = (total obtenu / total possible des leçons saisies) × 100
  // Pour le statut final on utilise le total possible de TOUTES les leçons
  const totalPossibleSaisies = ns.reduce((s, n) => {
    const lesson = lessons.find(l => l.num === n.lecon);
    return s + (lesson ? lesson.max : 0);
  }, 0);
  const pourcentage = totalPossibleSaisies > 0
    ? Math.round((totalObtenu / totalPossible) * 100 * 100) / 100
    : null;

  const mention = getMention(pourcentage);
  const valide  = complete && pourcentage !== null && pourcentage >= 50;
  const statut  = valide ? 'valide' : complete ? 'non_valide' : 'en_cours';

  return {
    lecons: ns.length, totalObtenu: Math.round(totalObtenu * 100) / 100,
    totalPossible, pourcentage, mention, complete, valide, statut,
    // Compat anciens champs
    total: Math.round(totalObtenu * 100) / 100,
    moyenne: pourcentage,
  };
};

// Calcule la progression complète d'un étudiant
const calcProgression = (etudiant) => {
  const struct = COURSE_STRUCTURE[etudiant.langue];
  if (!struct) return { annees: [], anneeActuelle: 1, statutGlobal: 'en_cours' };

  const notes = db.bccNotes.filter(n => n.etudiantId === etudiant.id);

  const annees = struct.annees.map((anneeConf, idx) => {
    const stats      = calcAnneeStats(notes, anneeConf);
    const prevValide = idx === 0 ? true
      : calcAnneeStats(notes, struct.annees[idx - 1]).valide;
    return {
      ...anneeConf,
      stats,
      accessible: prevValide,
      notesSaisies: notes
        .filter(n => n.anneeId === anneeConf.id)
        .sort((a, b) => a.lecon - b.lecon),
    };
  });

  // Année actuelle
  let anneeActuelle = 1;
  for (const a of struct.annees) {
    const s = calcAnneeStats(notes, a);
    if (s.valide) anneeActuelle = Math.min(a.id + 1, struct.annees[struct.annees.length - 1].id + 1);
    else if (!s.complete) { anneeActuelle = a.id; break; }
  }

  const toutesValidees = annees.every(a => a.stats.valide);
  return { annees, anneeActuelle, statutGlobal: toutesValidees ? 'termine' : 'en_cours' };
};

// Moyenne globale = total obtenu sur toutes années / total possible sur toutes années
const calcMoyenneGlobale = (etudiant) => {
  const struct = COURSE_STRUCTURE[etudiant.langue];
  if (!struct) return { pct: null, mention: null };
  const notes = db.bccNotes.filter(n => n.etudiantId === etudiant.id);
  if (!notes.length) return { pct: null, mention: null };

  let totalObtenu = 0, totalPossible = 0;
  struct.annees.forEach(anneeConf => {
    const ns = notes.filter(n => n.anneeId === anneeConf.id);
    ns.forEach(n => {
      const lesson = anneeConf.lessons.find(l => l.num === n.lecon);
      if (lesson) { totalObtenu += parseFloat(n.note || 0); totalPossible += lesson.max; }
    });
  });

  if (totalPossible === 0) return { pct: null, mention: null };
  const pct = Math.round((totalObtenu / totalPossible) * 100 * 100) / 100;
  return { pct, mention: getMention(pct), totalObtenu, totalPossible };
};

// Normalise un étudiant avec progression complète
const normalizeEtudiant = (e) => {
  const prog   = calcProgression(e);
  const global = calcMoyenneGlobale(e);

  if (prog.statutGlobal === 'termine' && e.statut !== 'termine') e.statut = 'termine';
  else if (prog.statutGlobal === 'en_cours' && e.statut !== 'inactif') e.statut = 'actif';
  e.classeActuelle = prog.anneeActuelle;

  return {
    id:                     e.id,
    numero_etudiant:        e.numeroEtudiant,
    prenom:                 e.prenom,
    nom:                    e.nom,
    date_naissance:         e.dateNaissance,
    sexe:                   e.sexe,
    situation_matrimoniale: e.situationMatrimoniale,
    adresse:                e.adresse,
    bp:                     e.bp,
    code_postal:            e.codePostal,
    telephone:              e.telephone,
    situation:              e.situation,
    eglise:                 e.eglise,
    source_info:            e.sourceInfo,
    langue:                 e.langue,
    volontaire_responsable: e.volontaireResponsable,
    date_inscription:       e.dateInscription,
    classe_actuelle:        e.classeActuelle,
    statut:                 e.statut,
    created_at:             e.createdAt,
    progression:            prog,
    moyenne_globale:        global.pct,
    mention_globale:        global.mention,
    total_obtenu:           global.totalObtenu,
    total_possible:         global.totalPossible,
    nb_annees_validees:     prog.annees.filter(a => a.stats.valide).length,
    nb_annees_total:        prog.annees.length,
    course_structure:       COURSE_STRUCTURE[e.langue],
  };
};

// ══════════════════════════════════════════════════════════════
// ÉTUDIANTS — CRUD
// ══════════════════════════════════════════════════════════════
exports.getAllEtudiants = (req, res) => {
  const { search, langue, annee, statut, page=1, limit=50 } = req.query;
  let list = db.bccEtudiants;
  if (langue) list = list.filter(e => e.langue === langue);
  if (statut) list = list.filter(e => e.statut === statut);
  if (annee)  list = list.filter(e => e.classeActuelle === parseInt(annee));
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(e =>
      e.prenom?.toLowerCase().includes(s) || e.nom?.toLowerCase().includes(s) ||
      e.numeroEtudiant?.toLowerCase().includes(s)
    );
  }
  const total = list.length;
  const data  = list
    .sort((a,b) => new Date(b.dateInscription) - new Date(a.dateInscription))
    .slice((page-1)*limit, page*limit)
    .map(normalizeEtudiant);
  res.json({ success: true, data, total, page: parseInt(page) });
};

exports.getEtudiantById = (req, res) => {
  const e = db.bccEtudiants.find(e => e.id === req.params.id);
  if (!e) return res.status(404).json({ message: 'Étudiant non trouvé' });
  res.json({ success: true, data: normalizeEtudiant(e) });
};

exports.getNotes = (req, res) => {
  const notes = db.bccNotes
    .filter(n => n.etudiantId === req.params.id)
    .sort((a,b) => a.anneeId - b.anneeId || a.lecon - b.lecon)
    .map(n => ({ ...n, date_note: n.dateNote }));
  res.json({ success: true, data: notes });
};

exports.getCourseStructure = (req, res) => {
  res.json({ success: true, data: COURSE_STRUCTURE });
};

exports.createEtudiant = (req, res) => {
  const { prenom, nom, langue } = req.body;
  if (!prenom || !nom || !langue) return res.status(400).json({ message: 'Prénom, nom et langue requis' });
  if (!COURSE_STRUCTURE[langue]) return res.status(400).json({ message: `Langue invalide: ${Object.keys(COURSE_STRUCTURE).join(', ')}` });
  const e = {
    id: db.nextId(), numeroEtudiant: genNumero(langue),
    prenom, nom,
    dateNaissance: req.body.date_naissance || null, sexe: req.body.sexe || null,
    situationMatrimoniale: req.body.situation_matrimoniale || null,
    adresse: req.body.adresse || '', bp: req.body.bp || '',
    codePostal: req.body.code_postal || '', telephone: req.body.telephone || '',
    situation: req.body.situation || {}, eglise: req.body.eglise || {},
    sourceInfo: req.body.source_info || '', langue,
    volontaireResponsable: req.body.volontaire_responsable || '',
    dateInscription: req.body.date_inscription || new Date().toISOString().split('T')[0],
    classeActuelle: 1, statut: 'actif', createdAt: new Date().toISOString(),
  };
  db.bccEtudiants.push(e);
  db.addAudit(req.user?.id||'system', 'CREATE', 'BCC_Etudiant', `${prenom} ${nom} (${e.numeroEtudiant})`);
  res.status(201).json({ success: true, data: normalizeEtudiant(e) });
};

exports.updateEtudiant = (req, res) => {
  const e = db.bccEtudiants.find(e => e.id === req.params.id);
  if (!e) return res.status(404).json({ message: 'Étudiant non trouvé' });
  const map = {
    prenom:'prenom', nom:'nom', date_naissance:'dateNaissance', sexe:'sexe',
    situation_matrimoniale:'situationMatrimoniale', adresse:'adresse', bp:'bp',
    code_postal:'codePostal', telephone:'telephone', situation:'situation',
    eglise:'eglise', source_info:'sourceInfo', langue:'langue',
    volontaire_responsable:'volontaireResponsable', statut:'statut',
  };
  Object.entries(map).forEach(([k,v]) => { if (req.body[k] !== undefined) e[v] = req.body[k]; });
  db.addAudit(req.user?.id||'system', 'UPDATE', 'BCC_Etudiant', `${e.prenom} ${e.nom}`);
  res.json({ success: true, data: normalizeEtudiant(e) });
};

exports.deleteEtudiant = (req, res) => {
  const idx = db.bccEtudiants.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Étudiant non trouvé' });
  const [e] = db.bccEtudiants.splice(idx, 1);
  db.bccNotes = db.bccNotes.filter(n => n.etudiantId !== e.id);
  db.addAudit(req.user?.id||'system', 'DELETE', 'BCC_Etudiant', `${e.prenom} ${e.nom}`);
  res.json({ success: true, message: 'Étudiant supprimé' });
};

// ══════════════════════════════════════════════════════════════
// NOTES — avec validation du maximum par leçon
// ══════════════════════════════════════════════════════════════
exports.saveNote = (req, res) => {
  const { etudiant_id, annee_id, lecon, note, commentaire } = req.body;
  if (!etudiant_id || !annee_id || !lecon || note === undefined || note === null)
    return res.status(400).json({ message: 'etudiant_id, annee_id, lecon, note sont requis' });

  const e = db.bccEtudiants.find(e => e.id === etudiant_id);
  if (!e) return res.status(404).json({ message: 'Étudiant non trouvé' });

  const struct = COURSE_STRUCTURE[e.langue];
  if (!struct) return res.status(400).json({ message: 'Structure de cours introuvable' });

  const anneeConf = struct.annees.find(a => a.id === parseInt(annee_id));
  if (!anneeConf) return res.status(400).json({ message: `Année ${annee_id} introuvable pour ${e.langue}` });

  // Valider le max de la leçon
  const lessonConf = anneeConf.lessons.find(l => l.num === parseInt(lecon));
  if (!lessonConf) return res.status(400).json({ message: `Leçon ${lecon} introuvable` });

  const noteVal = parseFloat(note);
  if (isNaN(noteVal) || noteVal < 0)
    return res.status(400).json({ message: 'Note invalide' });
  if (noteVal > lessonConf.max)
    return res.status(400).json({ message: `Note (${noteVal}) dépasse le maximum autorisé pour cette leçon (${lessonConf.max})` });

  // Vérifier progression (années suivantes verrouillées)
  const anneeIdx = struct.annees.findIndex(a => a.id === parseInt(annee_id));
  if (anneeIdx > 0) {
    const prevAnnee  = struct.annees[anneeIdx - 1];
    const prevNotes  = db.bccNotes.filter(n => n.etudiantId === etudiant_id && n.anneeId === prevAnnee.id);
    if (prevNotes.length < prevAnnee.lessons.length)
      return res.status(400).json({ message: `Complétez d'abord les ${prevAnnee.lessons.length} leçons de "${prevAnnee.label}"` });
    const prevStats  = calcAnneeStats(prevNotes, prevAnnee);
    if (!prevStats.valide)
      return res.status(400).json({ message: `"${prevAnnee.label}" non validée (${prevStats.pourcentage?.toFixed(1)}%). Minimum requis: 50%` });
  }

  // Upsert
  const existing = db.bccNotes.find(n =>
    n.etudiantId === etudiant_id && n.anneeId === parseInt(annee_id) && n.lecon === parseInt(lecon)
  );
  let saved;
  if (existing) {
    existing.note = noteVal; existing.commentaire = commentaire || '';
    existing.dateNote = new Date().toISOString(); saved = existing;
  } else {
    saved = {
      id: db.nextId(), etudiantId: etudiant_id, anneeId: parseInt(annee_id),
      lecon: parseInt(lecon), note: noteVal, commentaire: commentaire || '',
      dateNote: new Date().toISOString(), createdAt: new Date().toISOString(),
    };
    db.bccNotes.push(saved);
  }

  const updated = normalizeEtudiant(e);
  res.json({ success: true, data: { note: { ...saved, date_note: saved.dateNote }, etudiant: updated } });
};

exports.deleteNote = (req, res) => {
  const idx = db.bccNotes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Note non trouvée' });
  db.bccNotes.splice(idx, 1);
  res.json({ success: true, message: 'Note supprimée' });
};

// ══════════════════════════════════════════════════════════════
// STATS / DASHBOARD
// ══════════════════════════════════════════════════════════════
exports.getStats = (req, res) => {
  const parLangue = { Français:0, English:0, Malagasy:0 };
  db.bccEtudiants.forEach(e => { if (e.langue in parLangue) parLangue[e.langue]++; });

  const parStatut = { actif:0, inactif:0, termine:0 };
  db.bccEtudiants.forEach(e => {
    const prog = calcProgression(e);
    const s = prog.statutGlobal === 'termine' ? 'termine' : e.statut === 'inactif' ? 'inactif' : 'actif';
    parStatut[s] = (parStatut[s] || 0) + 1;
  });

  const mentions = { 'Très Bien':0, 'Bien':0, 'Assez Bien':0, 'Passable':0, 'Insuffisant':0 };
  db.bccEtudiants.forEach(e => {
    const g = calcMoyenneGlobale(e);
    if (g.mention && g.mention in mentions) mentions[g.mention]++;
  });

  const parAnnee = {};
  db.bccEtudiants.forEach(e => {
    const prog = calcProgression(e);
    prog.annees.forEach(a => {
      const key = `${e.langue}|${a.label}`;
      if (!parAnnee[key]) parAnnee[key] = { label:a.label, langue:e.langue, en_cours:0, valide:0, non_valide:0 };
      parAnnee[key][a.stats.statut] = (parAnnee[key][a.stats.statut] || 0) + 1;
    });
  });

  res.json({ success: true, data: {
    total: db.bccEtudiants.length,
    parLangue, parStatut, mentions,
    parAnnee: Object.values(parAnnee),
    courseStructure: COURSE_STRUCTURE,
    recentInscriptions: db.bccEtudiants
      .sort((a,b) => new Date(b.dateInscription) - new Date(a.dateInscription))
      .slice(0, 5)
      .map(e => ({
        numero_etudiant: e.numeroEtudiant, prenom: e.prenom, nom: e.nom,
        langue: e.langue, classe_actuelle: e.classeActuelle, date_inscription: e.dateInscription,
      })),
  }});
};

exports.getRapportEtudiant = (req, res) => {
  const e = db.bccEtudiants.find(e => e.id === req.params.id);
  if (!e) return res.status(404).json({ message: 'Étudiant non trouvé' });
  res.json({ success: true, data: normalizeEtudiant(e) });
};
