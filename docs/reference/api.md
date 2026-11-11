# Routes API

Droit : **public** = aucune session ; **session** = connecté ; **staff / admin / owner** = voir README. « ? » = garde non confirmée dans le relevé automatique, à relire.

## Auth et compte

| Route | Méthodes | Droit |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | public (NextAuth) |
| `/api/user/setup` | POST, DELETE | session |
| `/api/user/profile` | PUT | session |
| `/api/user/profile/banner` | POST, DELETE | session |
| `/api/user/showcase` | PUT | session |
| `/api/user/collection` | GET | session |
| `/api/profile/[name]` | GET | session ? |
| `/api/candidature/moderateur` | POST | session |

## Cartes, boosters, marché

| Route | Méthodes | Droit |
|---|---|---|
| `/api/cards` | GET, POST, PUT, DELETE | admin (écriture) |
| `/api/cards/evolve`, `/api/cards/recipe`, `/api/cards/sell` | POST | session |
| `/api/editions`, `/api/variants`, `/api/templates` | GET, POST, PUT, DELETE | admin |
| `/api/packs` | GET, POST | session |
| `/api/boosters/state` | GET | public |
| `/api/boosters/buy` | POST | session |
| `/api/boosters/add-coins` | POST | admin |
| `/api/tcg/config` | GET | public |
| `/api/tcg/recipes` | GET | session |
| `/api/trades`, `/api/trades/[id]`, `/api/trades/cards` | GET, POST, PUT, PATCH | session |

## Jeux

| Route | Méthodes | Droit |
|---|---|---|
| `/api/games/crash`, `/mines`, `/roulette`, `/blackjack` | POST | session |
| `/api/games/crash/events`, `/api/games/roulette/events` | GET | public (flux d'événements) |

## Boutique

| Route | Méthodes | Droit |
|---|---|---|
| `/api/shop/catalog` | GET | public |
| `/api/shop/buy` | POST | session |

## Joueurs, bans, launcher

| Route | Méthodes | Droit |
|---|---|---|
| `/api/joueurs` | GET | public |
| `/api/players` | GET | public (staff voit plus) ; POST, DELETE, PATCH admin |
| `/api/players/[uuid]/skin`, `/sync-username` | POST, DELETE | admin |
| `/api/players/[uuid]/uuid` | POST | session |
| `/api/bans/check` | GET | public (le launcher vérifie un ban) |
| `/api/launcher/verify` | POST | public : corps `{accessToken, hwid}`, l'identité est prouvée par Mojang (voir [launcher-api](launcher-api.md#le-site-a-aussi-un-verify)) |
| `/api/reports/bug` | POST | public (envoi depuis le launcher) |
| `/api/telemetry/crash-report` | POST | public |
| `/api/status`, `/api/team`, `/api/news` | GET | public |
| `/api/stream` | GET | session ? |

## Support

| Route | Méthodes | Droit |
|---|---|---|
| `/api/tickets` | GET, POST | session |
| `/api/tickets/[id]` | GET, PATCH | session |
| `/api/tickets/[id]/messages` | POST | session |
| `/api/tickets/sync-discord` | POST | `Authorization: Bearer <DISCORD_TOKEN>` (comparaison à temps constant) |

## Bot

| Route | Méthodes | Droit |
|---|---|---|
| `/api/bot/give-box` | POST | champ `secret` du corps = `BOT_API_SECRET` (temps constant). Corps `{discordId, boxType, amount 1..1000, secret}` |

## Admin

Voir [admin.md](admin.md) pour le détail des corps.

| Route | Méthodes | Droit |
|---|---|---|
| `/api/admin/users` | GET, PUT, PATCH, DELETE | staff lecture, admin écriture, owner pour les rôles élevés |
| `/api/admin/users/economy` | POST | staff |
| `/api/admin/users/profile` | PUT | admin |
| `/api/admin/users/promote` | GET, POST | admin |
| `/api/admin/moderation/ban`, `/unban` | POST | staff |
| `/api/admin/reports`, `/reports/[id]` | GET, PATCH, DELETE | admin |
| `/api/admin/news` | GET, POST, DELETE | admin |
| `/api/admin/shop/items` | GET, POST, PUT, DELETE | admin |
| `/api/admin/boosters` | GET, PUT | admin |
| `/api/admin/tcg` | GET, PUT | admin |
| `/api/admin/cards/manage` | POST | admin |
| `/api/admin/cards/variants/links` | GET, POST, DELETE | GET public ?, écriture admin |
| `/api/admin/settings` | GET, POST | owner |
| `/api/admin/bot`, `/bot/modules` | GET, PUT | staff / admin |
| `/api/admin/bot/announce`, `/appeals`, `/warns` | POST / POST / GET, DELETE | staff |
| `/api/admin/bot/tiktok`, `/embeds` (suppression) | POST, DELETE | admin |
| `/api/upload` | POST | admin (25 Mo, images/vidéos) |
