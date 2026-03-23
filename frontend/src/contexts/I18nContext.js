import React, { createContext, useContext, useState } from 'react';

const translations = {
  fr: {
    // Nav
    dashboard: 'Tableau de bord', personnel: 'Personnel', absences: 'Absences & Congés',
    volunteers: 'Volontaires', stock: 'Gestion du Stock', projects: 'Projets',
    bcc: 'BCC', users: 'Utilisateurs', logout: 'Déconnexion',
    // Login
    loginTitle: 'Connexion', loginSubtitle: 'Entrez vos identifiants pour accéder au système',
    emailLabel: 'Email', passwordLabel: 'Mot de passe',
    loginBtn: 'Se connecter', loggingIn: 'Connexion en cours...',
    loginError: 'Identifiants incorrects',
    systemTitle: 'Système de Gestion', systemDesc: 'Plateforme intégrée pour la gestion du personnel, des ressources, des projets et du programme BCC.',
    switchLang: 'Switch to English',
    // Common
    search: 'Rechercher...', add: 'Ajouter', edit: 'Modifier', delete: 'Supprimer',
    save: 'Enregistrer', cancel: 'Annuler', confirm: 'Confirmer', close: 'Fermer',
    loading: 'Chargement...', noData: 'Aucune donnée', actions: 'Actions',
    total: 'Total', status: 'Statut', date: 'Date', name: 'Nom',
    // Dashboard
    activePersonnel: 'Personnel actif', activeProjects: 'Projets actifs',
    pendingLeave: 'Congés en attente', criticalStock: 'Stock critique',
    recentActivity: 'Activité récente', lastActions: 'Dernières actions enregistrées',
    bccStudents: 'Étudiants BCC', evolutionMonth: 'Évolution mensuelle',
    // Personnel
    newMember: 'Nouveau membre', firstName: 'Prénom', lastName: 'Nom',
    birthDate: 'Date de naissance', birthPlace: 'Lieu de naissance',
    address: 'Adresse', phone: 'Téléphone', email: 'Email',
    maritalStatus: 'Situation matrimoniale', single: 'Célibataire',
    married: 'Marié(e)', divorced: 'Divorcé(e)', widowed: 'Veuf/Veuve',
    spouseName: "Nom du conjoint(e)", maidenName: 'Nom de jeune fille',
    emergencyContact: "Contact d'urgence", entryDate: "Date d'entrée",
    post: 'Poste', service: 'Service', contractType: 'Type de contrat',
    cinNumber: 'Numéro CIN', cinDate: "Date d'établissement CIN", cinPlace: 'Faite à',
    bankName: 'Banque', ribCode: 'Code RIB',
    diploma: 'Diplôme', cv: 'Curriculum Vitae', workContract: 'Contrat de travail',
    uploadDoc: 'Télécharger', viewDoc: 'Voir', downloadDoc: 'Télécharger',
    printFile: 'Imprimer la fiche',
    // Absences
    leaveRequest: "Demande d'absence", leaveType: "Type de congé",
    annualLeave: 'Congé annuel', sickLeave: 'Congé maladie',
    startDate: 'Date début', endDate: 'Date fin', reason: 'Motif',
    remainingDays: 'Jours restants', usedDays: 'Jours utilisés',
    quotaExceeded: 'Quota dépassé',
    approve: 'Approuver', reject: 'Refuser',
    pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé',
    // Stock
    article: 'Article', quantity: 'Quantité', unitPrice: 'Prix unitaire',
    minStock: 'Stock min', critical: 'Critique', entry: 'Entrée', exit: 'Sortie',
    // BCC
    student: 'Étudiant', inscription: 'Inscription', notes: 'Notes',
    class1: 'Classe 1', class2: 'Classe 2', average: 'Moyenne', mention: 'Mention',
    veryGood: 'Très Bien', good: 'Bien', fairlyGood: 'Assez Bien',
    pass: 'Passable', fail: 'Insuffisant',
  },
  en: {
    // Nav
    dashboard: 'Dashboard', personnel: 'Staff', absences: 'Leave & Absences',
    volunteers: 'Volunteers', stock: 'Stock Management', projects: 'Projects',
    bcc: 'BCC', users: 'Users', logout: 'Logout',
    // Login
    loginTitle: 'Sign In', loginSubtitle: 'Enter your credentials to access the system',
    emailLabel: 'Email', passwordLabel: 'Password',
    loginBtn: 'Sign In', loggingIn: 'Signing in...',
    loginError: 'Invalid credentials',
    systemTitle: 'Management System', systemDesc: 'Integrated platform for staff, resources, projects and BCC program management.',
    switchLang: 'Passer en Français',
    // Common
    search: 'Search...', add: 'Add', edit: 'Edit', delete: 'Delete',
    save: 'Save', cancel: 'Cancel', confirm: 'Confirm', close: 'Close',
    loading: 'Loading...', noData: 'No data', actions: 'Actions',
    total: 'Total', status: 'Status', date: 'Date', name: 'Name',
    // Dashboard
    activePersonnel: 'Active Staff', activeProjects: 'Active Projects',
    pendingLeave: 'Pending Leave', criticalStock: 'Critical Stock',
    recentActivity: 'Recent Activity', lastActions: 'Latest recorded actions',
    bccStudents: 'BCC Students', evolutionMonth: 'Monthly Evolution',
    // Personnel
    newMember: 'New Member', firstName: 'First Name', lastName: 'Last Name',
    birthDate: 'Date of Birth', birthPlace: 'Place of Birth',
    address: 'Address', phone: 'Phone', email: 'Email',
    maritalStatus: 'Marital Status', single: 'Single',
    married: 'Married', divorced: 'Divorced', widowed: 'Widowed',
    spouseName: "Spouse's Name", maidenName: 'Maiden Name',
    emergencyContact: 'Emergency Contact', entryDate: 'Entry Date',
    post: 'Position', service: 'Department', contractType: 'Contract Type',
    cinNumber: 'ID Card Number', cinDate: 'ID Card Issue Date', cinPlace: 'Issued at',
    bankName: 'Bank Name', ribCode: 'Bank Account Code',
    diploma: 'Diploma', cv: 'Curriculum Vitae', workContract: 'Work Contract',
    uploadDoc: 'Upload', viewDoc: 'View', downloadDoc: 'Download',
    printFile: 'Print File',
    // Absences
    leaveRequest: 'Leave Request', leaveType: 'Leave Type',
    annualLeave: 'Annual Leave', sickLeave: 'Sick Leave',
    startDate: 'Start Date', endDate: 'End Date', reason: 'Reason',
    remainingDays: 'Remaining Days', usedDays: 'Days Used',
    quotaExceeded: 'Quota Exceeded',
    approve: 'Approve', reject: 'Reject',
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    // Stock
    article: 'Item', quantity: 'Quantity', unitPrice: 'Unit Price',
    minStock: 'Min Stock', critical: 'Critical', entry: 'Entry', exit: 'Exit',
    // BCC
    student: 'Student', inscription: 'Registration', notes: 'Grades',
    class1: 'Class 1', class2: 'Class 2', average: 'Average', mention: 'Grade',
    veryGood: 'Very Good', good: 'Good', fairlyGood: 'Fairly Good',
    pass: 'Pass', fail: 'Fail',
  },
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lhm_lang') || 'fr');

  const toggleLang = () => {
    const next = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    localStorage.setItem('lhm_lang', next);
  };

  const t = (key) => translations[lang]?.[key] || translations['fr']?.[key] || key;

  return (
    <I18nContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
