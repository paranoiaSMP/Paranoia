# Documentation Paranoia Studio

Bienvenue sur la documentation technique officielle de **Paranoia Studio**. Ce référentiel regroupe l'architecture complète, les contrats d'API, le fonctionnement du bot Discord en Rust et les procédures d'infrastructure et de déploiement.

---

## Sommaire de la documentation

| Document | Description |
|---|---|
| [Architecture Globale](file:///c:/Users/leoo9/Documents/Projet/Paranoia/docs/ARCHITECTURE.md) | Structure de la stack, flux de données, modèle de données Prisma, intégration Web / Bot / Launcher |
| [Référence des APIs](file:///c:/Users/leoo9/Documents/Projet/Paranoia/docs/API.md) | Spécification complète des routes `/api/*` (télémétrie, launcher, bans, tickets, TCG, mini-jeux, admin) |
| [Bot Discord Rust](file:///c:/Users/leoo9/Documents/Projet/Paranoia/docs/BOT_RUST.md) | Architecture de `bot-rust` (Twilight, Tokio, SQLx), commandes slash, modération, rôles vocaux temporaires, tickets |
| [Déploiement & Infrastructure](file:///c:/Users/leoo9/Documents/Projet/Paranoia/docs/DEPLOYMENT.md) | Déploiement Docker Compose, reverse proxy Caddy HTTPS, PostgreSQL, migrations Prisma et variables `.env` |

---

## Liens rapides vers les modules clés

- Schéma de base de données : [prisma/schema.prisma](file:///c:/Users/leoo9/Documents/Projet/Paranoia/prisma/schema.prisma)
- Configuration du site web : [src/config/site.ts](file:///c:/Users/leoo9/Documents/Projet/Paranoia/src/config/site.ts)
- Point d'entrée du Bot Rust : [bot-rust/src/main.rs](file:///c:/Users/leoo9/Documents/Projet/Paranoia/bot-rust/src/main.rs)
- Orchestration Docker : [docker-compose.yml](file:///c:/Users/leoo9/Documents/Projet/Paranoia/docker-compose.yml)
- Proxy HTTPS : [Caddyfile](file:///c:/Users/leoo9/Documents/Projet/Paranoia/Caddyfile)
