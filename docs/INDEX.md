# 🔮 Paranoia Studio — Vault & Spécifications Projet (v2.0)

Bienvenue dans le coffre documentaire centralisé (Knowledge Vault) du projet **Paranoia New**.
Ce vault documente l'intégralité du produit : règles métier, architecture, base de données, maquettes, UX et roadmap de refonte.

---

## 🧭 Plan du Vault

```
📁 docs/
├── 📄 INDEX.md                                       <- Tu es ici
├── 📁 01 - Vision & Objectifs/
│   ├── 📄 Objectif-Principal.md                      <- But précis, cibles & valeur ajoutée
│   ├── 📄 Personas-et-Cibles.md                      <- Joueurs, Collectionneurs, Staff, Administrateurs
│   └── 📄 User-Stories.md                            <- Backlog exhaustif des récits utilisateurs
├── 📁 02 - Regles Metier/
│   ├── 📄 TCG-Cartes-Boosters.md                     <- Raretés, calques, probas, holographie, variantes
│   ├── 📄 Jeux-et-Economie.md                        <- Mines, Crash, Roulette, Blackjack, Paracoins
│   ├── 📄 Securite-Mojang-HWID.md                    <- Liaison de compte, sanctions, protection anti-triche
│   └── 📄 Support-Tickets-Discord.md                 <- Synchronisation bidirectionnelle Web <-> Discord
├── 📁 03 - Base de Donnees/
│   ├── 📄 MCD-et-Relations.md                        <- Modèle Conceptuel (Mermaid & DBML pour dbdiagram.io)
│   └── 📄 Dictionnaire-Donnees.md                    <- Spécification des champs & contraintes
├── 📁 04 - UI-UX & Parcours/
│   ├── 📄 User-Flows.md                              <- Chemins critiques (Connexion, Booster, Jeux, Tickets)
│   ├── 📄 Wireframes-et-Layouts.md                   <- Grilles, wireframes textuels & zones clés
│   └── 📄 Composants-Avances-UI.md                   <- Aceternity UI, React Bits, Three.js, Shaders
├── 📁 05 - Architecture & Infra/
│   ├── 📄 Stack-Technique.md                         <- Analyse Monolithe vs Microservices & Choix
│   └── 📄 Docker-et-Deploiement.md                   <- Multi-stage Dockerfile, Caddy, Cloudflare, VPS
└── 📁 06 - Gestion de Projet/
    ├── 📄 Kanban-Backlog-GitHub.md                   <- Tickets découpés prêts pour GitHub Projects
    └── 📄 CI-CD-Workflows.md                         <- Actions GitHub (Lint, Test, Build, Push Docker)
```

---

## ⚡ Principes directeurs de la refonte ("Paranoia New")

1. **Zero Dette Technique & Typage Strict** : TypeScript strict (`noImplicitAny`), validation des entrées API avec Zod.
2. **Pérennité du TCG & des Jeux** : Reproduction fidèle et optimisée du moteur de rendu des cartes (`CardDisplay`), des ouvertures de packs animées et des 4 mini-jeux d'économie (Mines, Crash, Roulette, Blackjack).
3. **Séparation claire des responsabilités** :
   - Moteur Core & DB : PostgreSQL + Prisma / SQLx
   - Application Web & Dashboard : Next.js 16 (App Router) + Tailwind CSS + Framer Motion
   - Tâches asynchrones / Bot : Rust (Twilight) pour la réactivité Discord
4. **Design Immersif Dark/Neon** : Identité visuelle violette/cyber-fantasy soignée, animations fluides, 0 layout shifts.
