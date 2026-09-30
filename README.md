<div align="center">
  <img src="public/Paranoia_logo.png" alt="Paranoia Logo" width="150" />

  # 🔮 PARANOIA STUDIO (v2.0)

  **Plateforme Web officielle, Écosystème TCG & Infrastructure Communautaire de Paranoia SMP.**

  [![Version](https://img.shields.io/badge/Version-2.0.0--clean-9333ea?style=for-the-badge)](https://paranoiastudio.fr)
  [![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
  [![Rust](https://img.shields.io/badge/Bot-Rust_Twilight-DEA584?style=for-the-badge&logo=rust)](https://rust-lang.org)

</div>

---

## ✦ À propos du projet

Ce dépôt héberge la version refondue, nettoyée et optimisée de la plateforme **Paranoia Studio**. Elle unifie :

1. **Le Système TCG (Cartes à Collectionner)** :
   - Moteur de rendu 3D multi-calques (`CardDisplay`) réactif au curseur.
   - Boosters interactifs animés avec effets holographiques exclusifs (*Holo*, *Glitch*, *Cosmic*).
   - Arbre d'évolution des cartes (variantes) et marché d'échange communautaire en direct.

2. **L'Économie & Mini-Jeux Virtuels (Paracoins)** :
   - Démineur dynamique (*Mines* 5×5 à multiplicateur paramétrable).
   - Jeu de la fusée (*Crash* en temps réel avec cashout).
   - *Roulette* personnalisée 14x et table de *Blackjack 21* classique.
   - Bonus quotidien (*Daily*) et suivi de l'XP de profil.

3. **Liaison Mojang & Sécurité Launcher** :
   - Authentification Discord OAuth2 + validation de compte Minecraft en jeu (`/verify`).
   - Rendu 3D temps réel du skin Minecraft du joueur.
   - Endpoint de vérification sécurisé du Launcher avec empreinte matérielle (**HWID**) pour bloquer définitivement les tricheurs et les doubles comptes.

4. **Support & Service Joueur Hybride** :
   - Système de tickets synchronisé en temps réel de façon bidirectionnelle entre le tableau de bord web et le serveur Discord via le bot Rust (`twilight`).
   - Remontée automatisée des rapports de crash Java/JVM.

---

## 🛠️ Prérequis Techniques

Pour exécuter et contribuer au projet en local, assurez-vous d'avoir installé :

- **Node.js** : v20.x ou v22.x LTS
- **Package Manager** : `npm` v10+ ou `pnpm` v9+
- **Docker & Docker Compose** : (pour l'environnement PostgreSQL & Caddy)
- **Rust Toolchain** *(optionnel, uniquement pour compiler le bot Discord)* : `cargo` 1.80+
- **PostgreSQL** : v15+ (si exécuté hors Docker)

---

## 🚀 Démarrage Rapide

### 1. Cloner le projet et installer les dépendances
```bash
git clone git@github.com:paranoiasmp/paranoia-new.git
cd paranoia-new
npm install
```

### 2. Configuration des variables d'environnement
Copiez le fichier `.env.example` vers `.env` et ajustez vos identifiants :
```bash
cp .env.example .env
```

### 3. Initialiser la Base de Données
```bash
npx prisma generate
npx prisma db push
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```
Rendez-vous sur [http://localhost:3000](http://localhost:3000) pour tester l'application.

---

## 📂 Documentation & Vault Projet

L'intégralité des spécifications fonctionnelles, maquettes, parcours utilisateurs, schéma conceptuel de base de données (MCD) et tickets Kanban est documentée dans le dossier [`docs/`](file:///home/leo/Code/Paranoia%20New/docs/INDEX.md) (compatible Obsidian) :

- [**00 - Index Général du Vault**](file:///home/leo/Code/Paranoia%20New/docs/INDEX.md)
- [**01 - Vision, Objectifs & User Stories**](file:///home/leo/Code/Paranoia%20New/docs/01%20-%20Vision%20&%20Objectifs/User-Stories.md)
- [**02 - Règles Métier (TCG & Jeux)**](file:///home/leo/Code/Paranoia%20New/docs/02%20-%20Regles%20Metier/TCG-Cartes-Boosters.md)
- [**03 - Modélisation Base de Données (MCD & DBML)**](file:///home/leo/Code/Paranoia%20New/docs/03%20-%20Base%20de%20Donnees/MCD-et-Relations.md)
- [**04 - UI/UX, User Flows & Wireframes**](file:///home/leo/Code/Paranoia%20New/docs/04%20-%20UI-UX%20&%20Parcours/User-Flows.md)
- [**05 - Architecture & Docker**](file:///home/leo/Code/Paranoia%20New/docs/05%20-%20Architecture%20&%20Infra/Docker-et-Deploiement.md)
- [**06 - Backlog Kanban GitHub**](file:///home/leo/Code/Paranoia%20New/docs/06%20-%20Gestion%20de%20Projet/Kanban-Backlog-GitHub.md)

---

<div align="center">
  <sub>© 2026 Paranoia Studio. Tous droits réservés. Développé pour la communauté Paranoia SMP.</sub>
</div>
