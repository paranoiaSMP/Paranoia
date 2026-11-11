# Opérations

## Déploiement

`docker-compose.yml` de `Paranoia_New` (projet `paranoianew`) lance `web` (Next.js, port `127.0.0.1:3000`), `db` (Postgres 15) et Caddy en proxy. Volumes : `paranoia_pgdata` (base), `./public/uploads` et `./data` (fichiers). Un fichier `docker-compose.maintenance.yml` et un dossier `maintenance/` servent la page de maintenance. Procédure détaillée : `Paranoia_New/docs/05 - Architecture & Infra/Docker-et-Deploiement.md`.

## Variables d'environnement (fichier `.env`)

Relevées dans `src/` ; valeurs jamais dans le dépôt.

| Groupe | Variables |
|---|---|
| Base | `DATABASE_URL` |
| Auth site | `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `ADMIN_DISCORD_ID` |
| Discord (bot, rôles, tickets) | `DISCORD_TOKEN`, `DISCORD_BOT_TOKEN`, `BOT_TOKEN`, `DISCORD_GUILD_ID`, `ROLE_STAFF_ID`, `TICKET_CATEGORY_ID`, `TICKET_LOG_CHANNEL_ID`, `PROMOTION_CHANNEL_ID`, `CRASH_CHANNEL_ID`, `BUG_REPORT_CHANNEL_ID` |
| Webhooks | `DISCORD_WEBHOOK_URL`, `BUG_REPORT_WEBHOOK_URL` |
| Liaison site / bot | `BOT_API_SECRET` (champ `secret` du corps de `/api/bot/give-box`) |
| Stockage R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` |
| Divers | `COSMETICS_JSON_PATH` |

Trois variables désignent un token de bot Discord (`DISCORD_TOKEN`, `DISCORD_BOT_TOKEN`, `BOT_TOKEN`) selon le fichier : à unifier.

## Incidents

- **Site inaccessible aux visiteurs** : vérifier `SystemSetting.maintenance`. Repasser à `off` depuis `/admin?tab=settings` (staff non concerné par la redirection).
- **Plus personne n'est admin** : mettre `User.role = 'OWNER'` en base pour ton compte, ou définir `ADMIN_DISCORD_ID`.
- **Ban posé par erreur** : `POST /api/admin/moderation/unban`.
- **Rôles Discord illisibles (`502`)** : token du bot invalide ou bot sans permission.

CI/CD : `Paranoia_New/docs/06 - Gestion de Projet/CI-CD-Workflows.md`. Sauvegarde de la base : non documentée, à définir.

## Stack VPS (`~/Code/VPS`)

Un seul Caddy devant le site, `launcher-api`, le bot, Paranoia One et Grafana. Procédure de mise en ligne complète, ordre des services, pare-feu et sauvegarde : `VPS/README.md` (marqué par son auteur « non testé sur un vrai VPS »). Mise à jour d'un service : `cd /opt/stack/<service> && git -C src pull && docker compose up -d --build` ; pour `launcher-api`, cela déconnecte les joueurs quelques secondes (tokens en mémoire). Variables et fichiers de données de `launcher-api` : [reference/launcher-api.md](reference/launcher-api.md#variables-denvironnement-appsapi).

Sonde : `curl https://api.<domaine>/health` → `{"status":"ok"}`.
