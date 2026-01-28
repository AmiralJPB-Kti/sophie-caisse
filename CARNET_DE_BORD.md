### 📅 Mardi 27 Janvier 2026 (Lancement & V1.3)
**État :** ✅ Mise en production
**Résumé :** Finalisation de la Web App sécurisée (SaaS) avec Statistiques avancées et Exports.

#### 1. Interface & UX (Frontend)
- Initialisation projet **Next.js 15** + **Tailwind CSS**.
- Création d'une **Vue "Saisie Rapide"** (Gros boutons, UX mobile) pour l'usage quotidien.
- Création d'une **Vue "Tableur Comptable"** (Style Excel, Lignes hebdos, Totaux) pour rassurer et imprimer.
- **Tableau de Bord (Bilan)** avec graphiques animés (Recharts) : Répartition et Évolution.
- **Sélecteur de Date Natif :** Navigation rapide dans le calendrier (clic sur le mois).
- **Menu Export Avancé :** 
    - CSV (Excel) filtré par mois.
    - TXT (Texte aligné) pour archivage simple.
    - PDF (Impression optimisée) pour les stats et le tableau.

#### 2. Données & Persistance (Backend)
- Migration du stockage local (localStorage) vers **Supabase** (PostgreSQL).
- Création de la table `caisse_sophie` avec colonnes typées (Decimal, Date).
- Mise en place d'une synchronisation Cloud en temps réel.

#### 3. Sécurité & Éthique (Auth)
- Mise en place de **Supabase Auth** (Email/Password).
- Création d'une **Whitelist (Liste d'invités)** via la table `sophie_autorisations`.
- Sécurité **RLS (Row Level Security)** stricte : accès réservé aux emails autorisés.
- Ajout d'une modale **"Profil"** permettant à l'utilisateur de changer son mot de passe en autonomie.

#### 4. Déploiement (DevOps)
- Hébergement sur **Vercel** (HTTPS/SSL automatique).
- Gestion des variables d'environnement sécurisées.
- Correction des bugs de build liés à la version de Next.js (Fix 15.1.12).

---

## 🚀 LABORATOIRE D'IDÉES & ÉVOLUTIONS (Roadmap)

### 🎯 Court Terme (Pour Sophie)
- [x] **Tableau de Bord (Dashboard) :** Terminé (V1.2).
- [x] **Export Comptable :** Terminé (V1.3 - CSV/TXT).
- [ ] **Gestion des Dépenses :** Photos des tickets de caisse (Stockage Supabase Storage).
- [ ] **Mode Hors Ligne (PWA) :** Permettre la saisie même sans internet (Sync au retour).

### 🌍 Moyen Terme (Adaptation autres TPE/Artisans)
*Idées pour dupliquer ce projet vers d'autres secteurs.*

#### Pour un Boulanger / Snack :
- [ ] **Module "Commandes" :** Saisir les commandes du lendemain.
- [ ] **Anti-Gaspillage :** Saisie des invendus.

#### Pour un Coiffeur / Esthéticienne :
- [ ] **Fichier Clients Simplifié :** Historique des prestations.
- [ ] **Rappel RDV :** SMS automatiques.

#### Pour un Artisan BTP :
- [ ] **Suivi de Chantier :** Heures et matériel.
- [ ] **Devis Rapide :** Générateur PDF sur mobile.

---

## 📝 NOTES TECHNIQUES & RAPPELS
- **Base de données :** Supabase (Table `caisse_sophie` + `sophie_autorisations`).
- **Sécurité :** Ne jamais donner d'accès sans ajouter l'email dans la table `sophie_autorisations`.
- **Exports :** Le CSV utilise le séparateur point-virgule (;) et l'encodage UTF-8 BOM pour compatibilité Excel Windows.