# Architecture

Vue d'ensemble de tout ce qui tourne autour de Paranoia. Chaque bloc renvoie à la doc détaillée. Relevé dans le code le 2026-11-10 ; ce qui n'a pas été vérifié sur un vrai serveur est dit.

## Les briques

| Brique | Techno | Où ça tourne | Rôle |
|---|---|---|---|
| **Site** (`Paranoia_New`) | Next.js (App Router), NextAuth (Discord), Prisma, Postgres 15 | VPS, conteneurs `paranoia_web`, `paranoia_db` | site public, comptes, cartes/boosters/jeux, boutique, tickets, **panel admin**, routes `/api/*` |
| **Bot Discord** (`Paranoia_New/bot-rust`) | Rust (twilight) | VPS, conteneur séparé (`bot/`) | modules Discord, pilotés depuis le panel `/bot` |
| **API du launcher** (`ParanoiaLauncher/apps/api`) | Node, Express, zod, pino | VPS, conteneur `launcher-api` | auth Mojang, présence, cosmétiques, événements, bans launcher |
| **Launcher** (`apps/launcher`) | Tauri + React | PC du joueur | interface : instances, mods, compte, boutique |
| **Backend local** (`apps/backend`) | Node, Express | PC du joueur, sidecar sur `127.0.0.1:47820` | fichiers, Java, connexion Microsoft, Modrinth, lancement du jeu |
| **Mod client** (`apps/client-mod`) | Fabric, Java 21 | dans le jeu | affiche badge et cosmétiques des autres joueurs |
| **Caddy** (`VPS/Caddyfile`) | Caddy 2 | VPS, ports 80/443 | seul point d'entrée, HTTPS automatique |
| **Monitoring** (`VPS/monitoring`) | Prometheus, Grafana | VPS | métriques machine et conteneurs |
| Paranoia One (`Paranoia_One`) | Rust (Axum), Tauri/React | à part | autre produit (notes, tâches, workspaces) : **hors périmètre**, non documenté ici |

Ne pas confondre **backend local** (sur le PC du joueur, ne fait confiance qu'à lui) et **API du launcher** (publique sur Internet, ne croit aucun client).

## Schéma

```
                         Internet
                            │ 80/443
                       ┌────▼─────┐
                       │  Caddy   │  HTTPS, HSTS sur api.*
                       └─┬──┬──┬──┘
 paranoiastudio.fr ──────┘  │  └── grafana.*  → Grafana
                            │
        api.* : /v1/* /health /event/* /admin/*  → launcher-api :8080  (JSON dans data/)
        api.* : tout le reste → réécrit en /api/…  → site-web :3000
        one.*                → one-api :8081

 site-web ──► Postgres (paranoia_db)        bot Rust ──► Postgres + site
 launcher-api ──► Mojang (sessionserver, minecraftservices)

 PC du joueur :  Launcher (Tauri) ─► backend local 127.0.0.1:47820 ─► API launcher / site / Modrinth / Microsoft
                 Jeu + mod client ─► API launcher (/v1/auth, /presence, /users/lookup)
```

## Flux principaux

**Connexion au site.** Discord (OAuth) → NextAuth → ligne `User` (rôle `MEMBER`). Sans pseudo Minecraft, redirection vers `/setup`.

**Lancement du jeu et ban.** Le backend local appelle une route `verify` avec le token Minecraft du joueur et l'empreinte matérielle (`hwid`). L'API interroge Mojang pour connaître le vrai UUID, enregistre le joueur et répond `banned: true/false`. Deux implémentations existent : API du launcher (`/v1/launcher/verify`, fichiers JSON) et site (`/api/launcher/verify`, Postgres). Le backend local choisit avec `BAN_API_URL` (défaut : le site). Voir [launcher-api](../reference/launcher-api.md).

**Badge et cosmétiques en jeu.** Le mod fait `begin` → `join` Mojang → `complete` pour obtenir un token (12 h), envoie un `heartbeat` toutes les 30 s, et interroge `lookup` avec les UUID des joueurs visibles. Les cosmétiques viennent de `cosmetics.json` (édité à la main) et de `state.json` (achats).

**Événement modpack.** Un admin dépose un `.mrpack` sur `/admin/event` (clé admin) ; les launchers lisent `GET /v1/event` et retéléchargent quand `version` change.

**Administration.** Un staff se connecte au site, ouvre `/admin`. Chaque onglet appelle des routes `/api/admin/*` qui revérifient le rôle côté serveur. Voir [admin](../reference/admin.md).

## Données

| Donnée | Où | Sauvegardée |
|---|---|---|
| Comptes, cartes, bans, boutique, tickets, bot | Postgres du site | `pg_dumpall` quotidien |
| Joueurs launcher, bans launcher, achats cosmétiques | JSON dans `launcher-api/data/` | archive `fichiers.tgz` |
| Uploads du site (images, textures) | `site/public/uploads`, `site/data`, bucket R2 | archive (dossiers) ; R2 : non |
| Présence, tokens joueurs, défis Mojang | mémoire de `launcher-api` | **non** : perdus au redémarrage, les joueurs se reconnectent |

## Limites connues de l'architecture

- `launcher-api` est **une seule instance** : état en mémoire et fichiers JSON, rate limit local. Pas de redondance, pas de montée en charge horizontale.
- Deux sources de vérité pour les bans (Postgres et JSON), non synchronisées.
- Le routage Caddy renvoie tout `api.*` hors `/v1/*, /health, /event/*, /admin/*` vers le site en réécrivant en `/api/...` : le site ne doit pas définir `/api/v1`, `/api/health`, `/api/event`, `/api/admin` (un chemin du site masqué par celui du launcher).
- La stack VPS (`VPS/`) est marquée « non testée sur un vrai VPS » par son propre README.

## Où lire la suite

- API publique du launcher : [reference/launcher-api.md](../reference/launcher-api.md)
- Routes du site : [reference/api.md](../reference/api.md) ; panel : [reference/admin.md](../reference/admin.md)
- Sécurité : [securite.md](securite.md) ; exploitation : [../operations.md](../operations.md)
- Backend local (routes `/v1/*` sur `127.0.0.1:47820`) : `ParanoiaLauncher/docs/backend-local/README.md` et `docs/api/endpoints.md`
