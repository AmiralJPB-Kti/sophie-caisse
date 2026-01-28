# 📒 CARNET DE BORD & SUIVI PROJET

**Projet :** Gestion de Caisse & Suivi Administratif (Template TPE/Artisans)
**Date de création :** 27 Janvier 2026
**Objectif :** Créer un outil SaaS simple, éthique et sécurisé pour la gestion quotidienne des petites entreprises.

---

## 🛠️ JOURNAL DES INTERVENTIONS

### 📅 Mardi 27 Janvier 2026 (Lancement & V1.0)
**État :** ✅ Mise en production
**Résumé :** Transformation d'un script Python local en Web App sécurisée (SaaS).

#### 1. Interface & UX (Frontend)
- Initialisation projet **Next.js 15** + **Tailwind CSS**.
- Création d'une **Vue "Saisie Rapide"** (Gros boutons, UX mobile) pour l'usage quotidien.
- Création d'une **Vue "Tableur Comptable"** (Style Excel, Lignes hebdos, Totaux) pour rassurer et imprimer.
- Ajout d'un **Mode Impression (PDF)** propre sans l'interface autour.
- Système de modification/suppression de l'historique récent.

#### 2. Données & Persistance (Backend)
- Migration du stockage local (localStorage) vers **Supabase** (PostgreSQL).
- Création de la table `caisse_sophie` avec colonnes typées (Decimal, Date).
- Script d'injection SQL automatisé pour le déploiement rapide.

#### 3. Sécurité & Éthique (Auth)
- Mise en place de **Supabase Auth** (Email/Password).
- Création d'une **Whitelist (Liste d'invités)** via la table `sophie_autorisations`.
- Sécurité **RLS (Row Level Security)** : Impossible de lire les données si l'email n'est pas autorisé, même avec un mot de passe valide.
- Ajout d'une modale **"Changer mon mot de passe"** pour l'autonomie de l'utilisateur.

#### 4. Déploiement (DevOps)
- Hébergement sur **Vercel** (HTTPS/SSL automatique).
- Gestion des variables d'environnement (`SUPABASE_URL`, `ANON_KEY`).
- Nettoyage des dépendances et sécurisation du build (Next.js 15.1.12).

---

## 🚀 LABORATOIRE D'IDÉES & ÉVOLUTIONS (Roadmap)

### 🎯 Court Terme (Pour Sophie)
- [ ] **Tableau de Bord (Dashboard) :**
    - Graphique : Évolution du CA jour par jour vs Mois précédent.
    - Camembert : Répartition des encaissements (CB vs Espèces).
- [ ] **Export Comptable :**
    - Génération d'un fichier `.csv` ou `.xls` compatible avec le logiciel de son comptable (EBP, Sage, Ciel...).
- [ ] **Gestion des Dépenses :**
    - Pouvoir prendre en photo un ticket de caisse (justificatif) lors de la saisie d'une dépense en espèces (Stockage Supabase Storage).

### 🌍 Moyen Terme (Adaptation autres TPE/Artisans)
*Idées pour dupliquer ce projet vers d'autres secteurs.*

#### Pour un Boulanger / Snack :
- [ ] **Module "Commandes" :** Saisir les commandes du lendemain (ex: 50 baguettes pour M. Maire).
- [ ] **Anti-Gaspillage :** Saisie des invendus en fin de journée pour stats de pertes.

#### Pour un Coiffeur / Esthéticienne :
- [ ] **Fichier Clients Simplifié :** Noter "Mme Michu : Couleur 5.4" (Conformité RGPD à prévoir).
- [ ] **Rappel RDV :** Envoi automatique de SMS (via Twilio ou API WhatsApp).

#### Pour un Artisan BTP (Plombier/Électricien) :
- [ ] **Suivi de Chantier :** Remplacer "Caisse" par "Heures passées" sur un chantier.
- [ ] **Devis Rapide :** Générateur de devis PDF simple depuis le mobile.

### 🤖 Idées "Intelligentes" (IA & Automation)
- [ ] **Assistant Vocal :** "Dis Sophie, ajoute 50€ en espèces" (Via Web Speech API).
- [ ] **Détection d'anomalies :** Alerte si le fond de caisse théorique ne correspond pas au réel.

---

## 📝 NOTES TECHNIQUES & RAPPELS
- **Base de données :** Supabase (Projet partagé, cloisonnement par Tables + RLS).
- **Hébergement :** Vercel (Gratuit tant que usage personnel/TPE).
- **Sécurité :** Toujours vérifier la table `_autorisations` avant d'ouvrir l'accès à un nouveau client.
