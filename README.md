# 🏛️ LHM Madagascar — Système de Gestion v2.0

Plateforme complète de gestion pour LHM Madagascar (Feon'ny Filazantsara) incluant le module **BCC — Bible Correspondence Course**.

---

## 📁 Structure du projet

```
lhm-app/
├── backend/                    ← API Node.js / Express / PostgreSQL
│   ├── server.js               ← Point d'entrée
│   ├── database.js             ← Schema PostgreSQL + données initiales
│   ├── .env                    ← Configuration (DB, JWT...)
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js             ← Authentification JWT
│   ├── routes/
│   │   └── index.js            ← Toutes les routes API
│   └── controllers/
│       ├── authController.js
│       ├── personnelController.js
│       ├── stockController.js
│       ├── volunteersController.js
│       ├── projectsController.js
│       ├── dashboardController.js
│       ├── usersController.js
│       ├── chatController.js
│       └── bccController.js    ← MODULE BCC (nouveau)
│
└── frontend/                   ← Application React
    ├── package.json
    ├── public/
    │   ├── index.html
    │   ├── logo-lhm.png        ← Logo (fond transparent, texte blanc)
    │   └── logo-lhm-dark.png   ← Logo (fond transparent, texte navy)
    └── src/
        ├── App.js              ← Routes React (inclut /bcc)
        ├── index.js
        ├── index.css
        ├── assets/             ← Logos (même que public/)
        ├── contexts/
        │   └── AuthContext.js
        ├── utils/
        │   └── api.js          ← Client Axios
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.js   ← Sidebar (inclut lien BCC)
        │   │   └── Layout.css
        │   └── ui/
        │       └── Card.js     ← Composants UI réutilisables
        └── pages/
            ├── LoginPage.js
            ├── DashboardPage.js
            ├── PersonnelPage.js  ← CIN, RIB, docs, photo
            ├── AbsencesPage.js   ← Quota congés 30j
            ├── VolontairesPage.js
            ├── StockPage.js
            ├── ProjectsPage.js
            ├── UsersPage.js
            └── BCCPage.js        ← MODULE BCC complet
```

---

## ⚙️ Installation

### Prérequis
- Node.js v18+
- PostgreSQL 14+
- npm

### 1. Configurer la base de données

```bash
# Créer la base PostgreSQL
psql -U postgres -c "CREATE DATABASE lhmm_madagascar;"
```

### 2. Configurer le backend

```bash
cd backend

# Éditer les paramètres de connexion si nécessaire
nano .env
```

Contenu de `.env` :
```
PORT=5000
JWT_SECRET=lhm-madagascar-super-secret-jwt-key-2024
JWT_EXPIRES_IN=8h
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lhmm_madagascar
DB_USER=postgres
DB_PASSWORD=0720
```

```bash
# Installer les dépendances
npm install

# Démarrer le backend (crée automatiquement les tables)
npm start
```

### 3. Configurer le frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le frontend
npm start
```

L'application s'ouvre sur **http://localhost:3000**

---



## 📋 Modules disponibles

| Module | URL | Description |
|---|---|---|
| 📊 Tableau de bord | `/` | KPIs, alertes, activité récente |
| 👥 Personnel | `/personnel` | Gestion RH + CIN + RIB + documents |
| 📅 Absences & Congés | `/absences` | Demandes + quota 30j/an |
| 🤝 Volontaires | `/volontaires` | Workflow en 5 étapes |
| 📦 Stock | `/stock` | Articles + mouvements + alertes |
| 🎯 Projets | `/projets` | Suivi budget et avancement |
| 📖 **BCC** | `/bcc` | Bible Correspondence Course |
| 🔐 Utilisateurs | `/utilisateurs` | Gestion des accès |

---

## 📖 Module BCC — Fonctionnalités

- ✅ Inscription étudiants (formulaire complet 5 onglets)
- ✅ Numéro d'étudiant automatique (ex: FRA-2026-0042)
- ✅ 3 langues : Français, English, Malagasy
- ✅ 2 classes × 10 leçons chacune (notes /20)
- ✅ Règle de progression : Classe 2 accessible uniquement si Classe 1 complète + moy ≥ 10
- ✅ Mentions automatiques : Très Bien / Bien / Assez Bien / Passable / Insuffisant
- ✅ Tableau de bord avec statistiques par langue, classe, mention
- ✅ Impression bulletin PDF professionnel
- ✅ Gestion sécurisée par rôle `responsable_bcc`

---

## 🔄 Démarrage rapide (Windows)

```bat
REM Terminal 1 — Backend
cd lhm-app\backend
npm install
node server.js

REM Terminal 2 — Frontend
cd lhm-app\frontend
npm install
npm start
```
