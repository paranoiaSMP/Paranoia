# Documentation du backend Paranoia

Version documentée : code de `Paranoia_New` au 2026-11-10 (pas de version d'API numérotée). Langue : français. Terme constant : **token** (jamais « jeton » ni « clé »), **rôle**, **staff**.

Le backend est l'application Next.js (App Router) de `Paranoia_New` : routes `/api/*`, panel admin, base Postgres via Prisma, connexion Discord (NextAuth). Un bot Discord en Rust (`bot-rust/`) lui est lié.

`Code/Paranoia` contient la documentation (`docs/`), la maquette statique (`maquette/`) et, à venir, le vrai site (TypeScript + React). Les routes du site sont dans `Paranoia_New`. L'API du launcher et le service local du launcher sont dans `ParanoiaLauncher`.

## Guides par sujet

- [Domaines métier](domaines/README.md)
- [Données et schéma](donnees/README.md)
- [Procédures d'exploitation](exploitation/README.md)
- [Intégration](integration/README.md)
- [Contribution et recette](contribution/README.md)

## Références et démarrage

| Je veux… | Lire |
|---|---|
| lancer le projet en local | [Démarrage](#démarrage-local) |
| comprendre l'ensemble (briques, flux, données) | [guide/architecture.md](guide/architecture.md) |
| comprendre la sécurité et ses points faibles | [guide/securite.md](guide/securite.md) |
| comprendre l'auth, les rôles, les données du site | [guide/concepts.md](guide/concepts.md) |
| accomplir une tâche (bannir, donner une carte, activer la maintenance) | [guide/tutoriels.md](guide/tutoriels.md) |
| consulter une route de l'API du launcher (`/v1/*`) | [reference/launcher-api.md](reference/launcher-api.md) |
| consulter une route du site (`/api/*`) | [reference/api.md](reference/api.md) |
| connaître un onglet du panel admin | [reference/admin.md](reference/admin.md) |
| une erreur HTTP | [reference/erreurs.md](reference/erreurs.md) |
| déployer, configurer, réagir à un incident | [operations.md](operations.md) |
| modifier le code | [contributing.md](contributing.md) |

## Démarrage local

Prérequis : Node.js (version de `Dockerfile`), Postgres 15, une application Discord (client id et secret).

```bash
cd /home/leo/Code/Paranoia_New
npm install              # lance aussi `prisma generate`
cp .env.example .env     # puis remplir les variables : voir operations.md
npm run dev              # http://localhost:3000
```

Non vérifié par moi : la commande qui crée les tables (le dossier `prisma/` contient `schema.prisma` et des `.sql`, pas de dossier `migrations` relevé). Demander au mainteneur, ou lire `docs/05 - Architecture & Infra/Docker-et-Deploiement.md` de `Paranoia_New`.

Pour obtenir un accès admin en local, mettre ton identifiant Discord dans `ADMIN_DISCORD_ID`, ou changer `User.role` en base.

## Docs existantes dans `Paranoia_New/docs`

Vision, règles métier (jeux, TCG, tickets, sécurité HWID), dictionnaire de données, infra, CI/CD. Elles complètent celles-ci ; en cas de désaccord, le code fait foi.
