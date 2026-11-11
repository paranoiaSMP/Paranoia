# Contribuer et architecture

## Organisation de `Paranoia_New/src`

| Dossier | Contenu |
|---|---|
| `app/api/**/route.ts` | routes HTTP (une par dossier) |
| `app/admin`, `app/bot`, … | pages |
| `features/admin/*.tsx` | un composant par onglet du panel |
| `lib/` | `auth.ts`, `roles.ts`, `maintenance.ts`, `boosters.ts`, `tickets.ts`… |
| `proxy.ts` | middleware : maintenance, `/setup`, accès `/admin` et `/bot` |
| `prisma/schema.prisma` | modèle de données |

## Règles

- Toute route protégée : `getServerSession` puis test de rôle via `lib/roles.ts` (`isStaff`, `isAdmin`, `isOwner`). Ne pas comparer des chaînes de rôle à la main.
- Une PR qui change une route met à jour [reference/api.md](reference/api.md) ou [reference/admin.md](reference/admin.md).
- Valider les corps entrants (zod est déjà utilisé pour `tcg` et `boosters`).
- `npm run lint` avant de pousser. Pas de script de test dans `package.json`.

## Dette connue

Réponses d'erreur hétérogènes, pas de journal d'audit, pas de contrat de routes partagé. Le dépôt `Paranoia_One` contient un `backend` Rust, un dossier `packages` et des docs `03-API` : si la refonte repart de là, les schémas partagés pourront générer un OpenAPI. Ici, aucun OpenAPI n'existe.

## Maintenance des docs

Responsable : à désigner. Vérifier à la main que chaque route de `src/app/api` figure dans `reference/api.md` (74 au 2026-11-10). Pas de CI documentaire en place.
