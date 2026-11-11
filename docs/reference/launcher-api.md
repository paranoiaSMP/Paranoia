# API du launcher (`apps/api`)

Service Express/TypeScript, code dans `ParanoiaLauncher/apps/api`. Tourne sur le VPS (conteneur `launcher-api`, port interne 8080), exposé en HTTPS par Caddy sur `https://api.<domaine>` pour les chemins `/v1/*`, `/health`, `/event/*`, `/admin/*`. Ne pas le confondre avec `apps/backend`, qui tourne sur la machine du joueur.

Données : fichiers JSON dans `data/` (pas de base). Présence et tokens : en mémoire, perdus au redémarrage.

## Conventions

- Corps JSON, 64 Ko maximum (sauf `PUT /v1/event` : 256 Mo). Erreurs : `{"error":"message"}`.
- Deux sortes d'authentification :
  - **token joueur** : `Authorization: Bearer <token>`, obtenu par `/v1/auth/complete`, valable 12 h (`TOKEN_TTL_SECONDS` = 43200). Absent : `401 Jeton absent` ; invalide ou expiré : `401 Jeton invalide ou expire`.
  - **clé admin** : en-tête `x-admin-key: <ADMIN_KEY>`. `ADMIN_KEY` absente : `503`. Fausse : `401 Cle invalide`. Comparaison à temps constant.
- Limite de débit : 120 requêtes par minute et par IP (`RATE_LIMIT_PER_MINUTE`), sur toutes les routes. Dépassement : `429 {"error":"Trop de requetes"}` + en-tête `Retry-After` (secondes). Compteur en mémoire, une seule instance.
- Les UUID sont acceptés avec ou sans tirets, en toute casse, et normalisés en minuscules avec tirets.
- Route inconnue : `404 {"error":"Route inconnue"}`. Erreur interne : `500`.

## Routes publiques (hors `/v1`)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | `200 {"status":"ok"}`. Sonde de vie. |
| GET | `/cosmetics/<fichier>` | Texture statique, uniquement `.png`, `.jpg`, `.jpeg`, `.webp`, depuis `COSMETICS_ASSETS_DIR`. Autre extension ou fichier absent : `404 {"error":"Texture inconnue"}`. Cache 1 h, CORS `*`, pas de listing de dossier, fichiers cachés ignorés. |
| GET | `/event/pack.mrpack` | Télécharge le modpack de l'événement. `404 Aucun evenement` si aucun. |
| GET | `/event/banner` | Image de l'événement. `404 Aucune image` si absente. |
| GET | `/admin/event` | Page HTML (formulaire de mise en ligne d'un événement). Publique ; les actions exigent la clé admin saisie dans la page. |
| GET | `/admin/launcher` | Page HTML (liste des joueurs, bans). Idem. |

## `/v1/auth` : preuve de possession du compte

Même protocole que la connexion à un serveur Minecraft en ligne. Le client prouve à Mojang qu'il possède le compte, puis l'API vérifie auprès de Mojang.

```
client                      API                        Mojang
  | POST /v1/auth/begin      |                           |
  |------------------------->|                           |
  |<---- { serverId } -------|                           |
  | join(accessToken, serverId) ---------------------->  |
  | POST /v1/auth/complete   |                           |
  |------------------------->| hasJoined(user, serverId) |
  |                          |-------------------------->|
  |<---- { token, ... } -----|<------ { id, name } ------|
```

### `POST /v1/auth/begin`
Auth : aucune. Corps : aucun.
`200` : `{"serverId":"<32 caractères hexa>"}`. Le `serverId` est aléatoire (16 octets), **à usage unique**, valable **60 s**.

### `POST /v1/auth/complete`
Auth : aucune. Corps :

| Champ | Type | Contraintes |
|---|---|---|
| `username` | string | 1 à 16 caractères |
| `serverId` | string | 32 caractères hexa minuscules, obtenu par `begin` |

Réponses :

| Code | Corps | Cause |
|---|---|---|
| 200 | `{"token":"…","expiresIn":43200,"uuid":"…","username":"…"}` | Mojang a confirmé |
| 400 | `Requete invalide` | corps mal formé |
| 400 | `Defi inconnu ou expire` | `serverId` inventé, déjà utilisé ou plus vieux que 60 s. Reprendre à `begin`. |
| 401 | `Session Mojang non confirmee` | le client n'a pas fait `join` côté Mojang, mauvais pseudo, ou Mojang injoignable (timeout 10 s) |

```bash
curl -X POST https://api.example.fr/v1/auth/complete -H 'Content-Type: application/json' \
  -d '{"username":"Pseudo","serverId":"0123456789abcdef0123456789abcdef"}'
```

Le `serverId` est consommé même si Mojang refuse : un échec oblige à refaire `begin`.

## `/v1/presence`

### `POST /v1/presence/heartbeat`
Auth : token joueur. Corps : aucun. Marque le joueur « en ligne » pour `PRESENCE_TTL_SECONDS` (90 s). L'UUID vient toujours du token, jamais du corps.
`200` : `{"intervalSeconds":30}` : délai conseillé entre deux battements.

### `GET /v1/presence/count`
Auth : aucune. `200` : `{"online":<nombre>}`. Aucun identifiant n'est exposé.

## `/v1/users`

### `POST /v1/users/lookup`
Auth : token joueur. Pour une liste d'UUID, dit lesquels utilisent Paranoia en ce moment et ce qu'ils portent.

| Champ | Type | Contraintes |
|---|---|---|
| `uuids` | string[] | 500 maximum (`LOOKUP_MAX_UUIDS`, plafond absolu 2000). Les valeurs qui ne sont pas des UUID sont ignorées sans erreur. |

`200` :
```json
{ "users": ["<uuid en ligne>"], "cosmetics": { "<uuid>": ["cape_fondateur"] } }
```
`users` ne contient que les UUID demandés **et** actuellement en ligne. `cosmetics` n'a une entrée que pour ceux qui portent quelque chose. `400 Requete invalide` si `uuids` manque, n'est pas un tableau ou dépasse le plafond.
Il n'existe volontairement aucune route qui liste tous les utilisateurs. Le contenu des requêtes n'est jamais journalisé.

## `/v1/cosmetics`

Types : `cape`, `wings`, `halo`, `hat`, `particle`, `emote`. Raretés : `common`, `rare`, `epic`, `legendary`.

### `GET /v1/cosmetics/catalog`
Auth : aucune. Cache public 60 s. `200` : tableau d'objets :
```json
{ "id":"cape_fondateur", "type":"cape", "name":"Cape Fondateur",
  "previewUrl":"https://…/cosmetics/cape_fondateur.png", "textureUrl":"https://… (optionnel)",
  "rarity":"legendary", "price":1500 }
```

### `GET /v1/cosmetics/me`
Auth : token joueur. `200` :
```json
{ "uuid":"…", "username":"…", "balance":120, "admin":false, "owned":["cape_debut"], "equipped":["cape_debut"] }
```
`balance` vaut `null` pour un admin (ParaCoins illimités). Solde = solde accordé dans `cosmetics.json` moins ce qui a été dépensé (`state.json`).

### `POST /v1/cosmetics/purchase`
Auth : token joueur. Corps `{"id":"<id du cosmétique>"}`.

| Code | Corps | Cause |
|---|---|---|
| 200 | `{"balance":n,"owned":[…]}` | acheté et débité du prix **du catalogue** (jamais d'un prix envoyé par le client) |
| 200 | `{"balance":n,"owned":[…],"deja":true}` | déjà possédé : pas de second débit |
| 400 | `Requete invalide` | `id` absent |
| 402 | `{"error":"Paracoins insuffisants","balance":n,"price":p}` | solde trop bas |
| 404 | `Cosmetique inconnu` | `id` hors catalogue |

Un admin achète sans être débité.

### `PUT /v1/cosmetics/equipped`
Auth : token joueur. Corps `{"ids":["…"]}`, 16 maximum. Remplace la liste portée ; un seul objet par type (le dernier de la liste l'emporte).
`200 {"equipped":[…]}` ; `400` corps invalide ; `404 Cosmetique inconnu: <id>` ; `403 Cosmetique non possede: <id>`.

### `DELETE /v1/cosmetics/equipped`
Auth : token joueur. Query optionnelle `?type=cape` : ne retire que ce type ; sans `type`, retire tout. `200 {"equipped":[…]}`.

## `/v1/event` : événement en cours

### `GET /v1/event`
Auth : aucune. `200 {"event":null}` ou
```json
{ "event": { "name":"Halloween", "version":"1731200000000", "description":"…", "mods":["sodium","…"], "banner":"banner.png" } }
```
`version` est l'horodatage de mise en ligne : le launcher retélécharge le pack quand elle change.

### `PUT /v1/event?name=<nom>`
Auth : clé admin. Corps : **le fichier `.mrpack` brut** (pas de JSON, pas de multipart), 256 Mo maximum. `name` : obligatoire, tronqué à 64 caractères.

| Code | Cause |
|---|---|
| 200 | `{"event":{…}}` publié (écriture atomique) |
| 400 | `Nom manquant` |
| 401 / 503 | clé fausse / non configurée |
| 422 | le fichier ne commence pas par `PK` (pas un zip) ou `modrinth.index.json` manquant ou illisible |

L'API lit `modrinth.index.json` (résumé, liste des mods `mods/` et `overrides/mods/*.jar`) et extrait `banner.png|jpg|jpeg|webp` de la racine s'il existe.

```bash
curl -X PUT "https://api.example.fr/v1/event?name=Halloween" -H "x-admin-key: $ADMIN_KEY" \
  --data-binary @pack.mrpack
```

### `DELETE /v1/event`
Auth : clé admin. Supprime le pack. `200 {"event":null}`.

## `/v1/launcher`

### `POST /v1/launcher/verify`
Auth : aucune, mais l'identité est prouvée par Mojang. Appelée par le launcher avant de lancer le jeu.

| Champ | Type | Contraintes |
|---|---|---|
| `accessToken` | string | token d'accès Minecraft du joueur |
| `hwid` | string | 64 caractères hexa minuscules (empreinte matérielle, SHA-256) |

L'API appelle `https://api.minecraftservices.com/minecraft/profile` avec le token : l'UUID et le pseudo viennent de Mojang, jamais du client. Elle enregistre ensuite le joueur (pseudo, `hwid` ajouté à sa liste, IP ajoutée, 20 maximum, dates de première et dernière vue), puis cherche un ban.

| Code | Corps | Cause |
|---|---|---|
| 200 | `{"banned":false}` | autorisé |
| 403 | `{"banned":true,"reason":"…","permanent":bool,"expiresAt":ms?}` | banni |
| 400 | `Requete invalide` | `accessToken` vide ou `hwid` au mauvais format |
| 401 | `Jeton Minecraft refuse` / `Profil introuvable` | Mojang refuse le token |
| 502 | `Mojang injoignable` | timeout 5 s |

**Ordre de recherche du ban** : (1) ban du compte ; (2) ban d'un **autre compte** qui a utilisé le même `hwid` ; (3) ban manuel sur ce `hwid` ou sur l'IP (voir `/bans`). Un ban avec `expiresAt` dépassé est ignoré. `permanent: true` signifie que le launcher doit se désinstaller chez le joueur.

### Le site a aussi un `verify`
`POST /api/launcher/verify` (site Next.js) fait la même vérification Mojang mais contre la **base Postgres** du site (modèles `Player` et `Ban`), avec le corps `{hwid, accessToken}`. Réponses : `200 {banned:false, token, wssUrl}`, `403 {banned:true, permanent, reason, bannedAt, bannedBy}`, `409 UUID mismatch`, `401 Invalid Minecraft session`. Deux sources de vérité existent donc : le README du VPS dit de choisir avec `BAN_API_URL`. **À trancher avant la production.** Voir [securite](../guide/securite.md#constats).

## `/v1/admin/launcher-users` : modération (clé admin)

Toutes les routes exigent `x-admin-key`. Une page HTML d'exploitation existe sur `/admin/launcher`.

### `GET /v1/admin/launcher-users`
`200 {"users":[{"uuid","username","hwids":<nombre>,"ips":[…],"firstSeen","lastSeen","ban":{…}?}]}`. Dates en millisecondes. Les `hwid` ne sont pas renvoyés, seulement leur nombre.

### `POST /v1/admin/launcher-users/:uuid/ban`
`:uuid` : UUID d'un joueur **déjà vu par `verify`**, tel que stocké (minuscules, avec tirets). `404 Joueur inconnu` sinon.

| Champ | Type | Effet |
|---|---|---|
| `reason` | string | 200 caractères max, défaut « Non spécifiée » |
| `permanent` | boolean | `true` : le launcher se désinstalle |
| `hours` | number > 0 | ban temporaire ; absent = illimité |
| `hwid` | boolean | `true` : bannit aussi tous les `hwid` connus du joueur |
| `ip` | boolean | `true` : bannit aussi toutes ses IP connues |

`200 {"ok":true}`. Les bans matériel/IP créés ici portent `source = uuid` du joueur.

### `DELETE /v1/admin/launcher-users/:uuid/ban`
Retire le ban du compte **et** tous les bans matériel/IP dont il est la source. `200 {"ok":true}`, `404 Joueur inconnu`.

### `GET /v1/admin/launcher-users/bans`
`200 {"bans":[{ "id","type":"hwid|ip","value","reason","permanent","expiresAt?","source?","createdAt" }]}` : bans matériel/IP encore actifs.

### `POST /v1/admin/launcher-users/bans`
Ban manuel sans compte connu.

| Champ | Type | Contraintes |
|---|---|---|
| `type` | `"hwid"` \| `"ip"` | obligatoire |
| `value` | string | `hwid` : 64 hexa ; `ip` : adresse IPv4/IPv6 valide |
| `reason`, `permanent`, `hours` | | comme ci-dessus |

`200 {"ban":{…}}` ; `400 type (hwid|ip) ou valeur invalide`.

### `DELETE /v1/admin/launcher-users/bans/:id`
`200 {"ok":true}` ; `404 Ban inconnu`.

## Variables d'environnement (`apps/api`)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT`, `HOST` | `8080`, `127.0.0.1` | écoute (le conteneur doit écouter sur `0.0.0.0` derrière Caddy) |
| `NODE_ENV` | `development` | niveau de journal : `info` en production |
| `TRUST_PROXY` | `1` | nombre de proxys de confiance pour lire l'IP réelle (rate limit, bans IP) |
| `CORS_ALLOWED_ORIGINS` | vide | origines autorisées, séparées par des virgules ; vide = CORS désactivé |
| `ADMIN_KEY` | aucune | 16 caractères minimum (`openssl rand -hex 32`). Sans elle, toutes les routes admin répondent 503. |
| `TOKEN_TTL_SECONDS` | 43200 | durée d'un token joueur |
| `PRESENCE_TTL_SECONDS`, `HEARTBEAT_INTERVAL_SECONDS` | 90, 30 | présence |
| `LOOKUP_MAX_UUIDS` | 500 | plafond du lookup (max 2000) |
| `RATE_LIMIT_PER_MINUTE` | 120 | par IP |
| `COSMETICS_FILE`, `COSMETICS_ASSETS_DIR`, `COSMETICS_STATE_FILE` | `./data/cosmetics.json`, `./data/assets`, `./data/state.json` | cosmétiques |
| `EVENT_DIR` | `./data/event` | pack d'événement |
| `LAUNCHER_USERS_FILE`, `LAUNCHER_BANS_FILE` | `./data/launcher-users.json`, `./data/bans.json` | joueurs et bans |
| `MOJANG_SESSION_BASE_URL` | `https://sessionserver.mojang.com` | remplaçable dans les tests |

Le processus refuse de démarrer si une valeur est invalide (validation zod).

## Fichiers de données

| Fichier | Écrit par | Contenu |
|---|---|---|
| `cosmetics.json` | **à la main** (jamais par l'API) | `admins` (UUID), `items`, `players` (solde accordé, possédés, portés). Relu automatiquement à chaque enregistrement ; une erreur de syntaxe est journalisée et l'ancien contenu reste servi. |
| `state.json` | l'API | par joueur : `spent`, `owned`, `equipped`. Écriture atomique. |
| `launcher-users.json`, `bans.json` | l'API | joueurs vus et bans |
| `event/` | l'API | `pack.mrpack`, `meta.json`, bannière |

Ces fichiers contiennent des UUID, IP et empreintes matérielles : voir [securite](../guide/securite.md#données-personnelles).
