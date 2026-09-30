# 📋 Kanban & Backlog Projet (GitHub Projects)

Ce document découpe la refonte de **Paranoia New** en tickets de travail prêts à être importés dans un **GitHub Project** (Board Kanban avec colonnes : `Backlog`, `To Do`, `In Progress`, `Review`, `Done`).

---

## 🏁 Milestones & Jalons

| Milestone | Nom | Objectif clé |
|---|---|---|
| **M1** | **Fondations & Data Layer** | Initialisation du projet, configuration Next.js 16, Prisma ORM, migrations PostgreSQL et docker-compose. |
| **M2** | **Moteur TCG & Rendu Cartes** | Moteur `CardDisplay` multi-calques, ouverture animée des packs `PackOpener`, catalogue & binder. |
| **M3** | **Mini-Jeux & Économie** | Jeux Mines, Crash, Roulette, Blackjack, gestion du solde Paracoins et daily reward. |
| **M4** | **Identité, Mojang & Launcher** | Auth Discord, liaison `/verify` in-game, viewer 3D de skin, contrôle ban HWID et télémétrie. |
| **M5** | **Support & Bot Discord (Rust)** | Système de tickets bidirectionnel, synchronisation temps réel web/Discord, modération. |
| **M6** | **Polish, Sécurité & Production** | Caddy SSL, règles Cloudflare, tests de charge, responsive 100% sans layout shift. |

---

## 🎫 Découpage des Tickets (Issues)

### Milestone 1 : Fondations & Data Layer
- **T-01 : Setup Init Repo & Clean Config**
  - *Description* : Initialiser Next.js 16 avec TypeScript, Tailwind CSS v4, ESLint et Prettier.
  - *Critères d'acceptation* : `npm run build` et `npx tsc --noEmit` sans aucune erreur.
- **T-02 : Modélisation Prisma & Migrations PostgreSQL**
  - *Description* : Rédiger le `schema.prisma` d'après le dictionnaire de données et appliquer la première migration.
  - *Critères d'acceptation* : Tables créées sur PostgreSQL local/Docker avec index et contraintes uniques.
- **T-03 : Configuration Docker & Compose Local**
  - *Description* : Créer le `Dockerfile` multi-stage et le `docker-compose.yml` orchestrant Web, DB et Caddy.
  - *Critères d'acceptation* : Lancement avec `docker compose up --build` fonctionnel.

---

### Milestone 2 : Moteur TCG & Rendu Cartes
- **T-04 : Composant `CardDisplay` Multi-Calques & Effets 3D**
  - *Description* : Implémenter le composant de rendu des cartes avec parallaxe au pointeur, support des calques (L1, L2, L3, Skin, Badges) et des shaders `Holo`, `Glitch`, `Cosmic`.
  - *Critères d'acceptation* : Rendu fluide à 60 FPS sans coupure visuelle sur Chrome et Safari mobile.
- **T-05 : Moteur d'Ouverture de Boosters (`PackOpenerClient`)**
  - *Description* : Créer l'animation de déchirure de booster, le tirage probabiliste côté serveur (`POST /api/packs`) et la révélation interactive avec confettis.
  - *Critères d'acceptation* : Respect strict de la matrice des taux de drop et mise à jour immédiate de l'inventaire `UserCard`.
- **T-06 : Interface Mon Binder & Catalogue TCG**
  - *Description* : Créer la galerie de cartes avec filtres multi-critères (raretés, éditions, joueurs) et modale de détail avec historique de variantes.
  - *Critères d'acceptation* : Pagination ou infinite scroll performant, temps de chargement sous 200ms.
- **T-07 : Marché Communautaire des Cartes (Marketplace)**
  - *Description* : Permettre la mise en vente de cartes en doublon et l'achat instantané sécurisé par transaction atomique Prisma.
  - *Critères d'acceptation* : Impossible de dupliquer ou de vendre deux fois la même carte.

---

### Milestone 3 : Mini-Jeux & Économie
- **T-08 : Mini-Jeu Mines (Grille 5x5)**
  - *Description* : Développer l'interface interactive du démineur avec sélection des mines (1 à 20), calcul du multiplicateur croissant et bouton Cashout.
  - *Critères d'acceptation* : Découverte fluide, vérification de la grille côté serveur pour interdire toute triche client.
- **T-09 : Mini-Jeu Crash (Fusée & Multiplicateur Live)**
  - *Description* : Implémenter le tracé Canvas de la fusée, la montée exponentielle et le système d'encaissement avant crash.
  - *Critères d'acceptation* : Animation 60 FPS, synchronisation du solde de Paracoins.
- **T-10 : Mini-Jeu Roulette & Blackjack**
  - *Description* : Implémenter la roulette avec rouleau physique amorti et le blackjack avec règles croupier officielles (stand on 17, blackjack 3:2).
  - *Critères d'acceptation* : Historique des tirages affiché, boutons de mise rapide fonctionnels.
- **T-11 : Système de Récompense Daily & Progression XP**
  - *Description* : Endpoint et modale de récupération quotidienne de Paracoins avec cooldown de 24h et calcul du niveau de compte.
  - *Critères d'acceptation* : Protection contre les doubles réclamations concurrentes.

---

### Milestone 4 : Identité, Mojang & Launcher
- **T-12 : Authentification Discord & NextAuth**
  - *Description* : Configurer NextAuth avec le provider Discord et persistance des sessions en base de données.
  - *Critères d'acceptation* : Connexion fluide et récupération automatique de l'avatar et du discordId.
- **T-13 : Système de Liaison Mojang (`/verify`)**
  - *Description* : Génération du code unique web et endpoint webhook de confirmation envoyé par le serveur Minecraft.
  - *Critères d'acceptation* : Mise à jour du statut `isMcVerified` et affichage du skin 3D du joueur.
- **T-14 : Endpoint de Vérification Launcher & HWID**
  - *Description* : Implémenter `POST /api/launcher/verify` pour contrôler le token secret, le statut de ban joueur et l'empreinte machine HWID.
  - *Critères d'acceptation* : Blocage net de toute machine bannie, même sous un nouveau pseudonyme.
- **T-15 : Télémétrie & Crash Reports**
  - *Description* : Endpoint de réception des rapports de crash Java/JVM et vue de consultation dans le panel admin.
  - *Critères d'acceptation* : Enregistrement des données matérielles et de la stacktrace complète.

---

### Milestone 5 : Support & Bot Discord (Rust)
- **T-16 : Interface Web des Tickets de Support**
  - *Description* : Création de tickets par catégorie et salon de discussion en direct.
  - *Critères d'acceptation* : Envoi et réception instantanés de messages.
- **T-17 : Bot Rust (Twilight) & Synchronisation Bidirectionnelle**
  - *Description* : Bot Rust qui écoute le salon Discord créé pour le ticket et répercute les messages sur le web, et inversement.
  - *Critères d'acceptation* : Zéro message perdu, commande `!close` pour archiver le ticket.

---

### Milestone 6 : Polish, Sécurité & Déploiement
- **T-18 : Overhaul Responsive & Navigation Mobile**
  - *Description* : Drawer mobile avec animations lisses, FloatingDock sans collision, vérification sur toutes les résolutions.
  - *Critères d'acceptation* : Score Lighthouse Mobile > 90, 0 layout shifts.
- **T-19 : Configuration Caddy & Tunnels Cloudflare**
  - *Description* : Mise en production sur VPS avec certificats SSL automatiques et WAF Cloudflare.
  - *Critères d'acceptation* : HTTPS strict et protection anti-DDoS active.
