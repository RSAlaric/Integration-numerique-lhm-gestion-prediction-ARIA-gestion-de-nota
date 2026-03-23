-- ============================================================
-- LHM Madagascar — Script de création de la base de données
-- À exécuter dans psql ou pgAdmin AVANT de démarrer le backend
-- ============================================================

-- Créer la base de données (si elle n'existe pas)
-- Exécuter cette commande séparément en tant que superuser:
-- CREATE DATABASE lhmm_madagascar;

-- Une fois connecté à lhmm_madagascar :

-- Extension UUID (utile pour générer des IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vérification
SELECT version();
SELECT current_database();

-- Note: Les tables sont créées AUTOMATIQUEMENT au démarrage du backend
-- via la fonction initDatabase() dans backend/database.js
-- Vous n'avez PAS besoin de créer les tables manuellement.

-- ============================================================
-- Commandes utiles psql
-- ============================================================
-- Se connecter: psql -U postgres -d lhmm_madagascar
-- Lister les tables: \dt
-- Voir une table: SELECT * FROM users;
-- Supprimer et recréer (ATTENTION - efface toutes les données):
--   DROP DATABASE lhmm_madagascar;
--   CREATE DATABASE lhmm_madagascar;
