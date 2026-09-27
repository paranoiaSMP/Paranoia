# Spécification des APIs — Paranoia Studio

Ce document référence l'ensemble des points d'accès HTTP exposés par la plateforme Next.js sous le préfixe `/api/`.

---

## 1. Télémétrie & Signalements (Bugs & Crashs)

### `POST /api/reports/bug`
Enregistre un rapport d'anomalie ou de crash envoyé par un joueur ou depuis le launcher, stocke les détails dans la table `BugReport` et expédie une notification enrichie sur le canal Discord configuré.

- **Authentification** : Aucune (publique / cliente).
- **Corps de la requête (JSON)** :
```json
{
  "title": "Crash au chargement du monde",
  "description": "Erreur NullPointerException lors du rendu des chunks",
  "category": "Crash",
  "accountName": "PlayerOne",
  "profileName": "Paranoia SMP 1.20.4",
  "minecraftVersion": "1.20.4",
  "graphicsMode": "Fancy",
  "gpu": "NVIDIA GeForce RTX 4070",
  "screenResolution": "1920x1080",
  "cpu": "Intel Core i5-14400F",
  "ramSystem": "16 GB",
  "ramAllocated": "4 GB",
  "osInfo": "Windows 11 64-bit",
  "jvmArgs": "-Xmx4G -XX:+UseG1GC",
  "javaPath": "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
  "logs": "[11:13:40] [Render thread/ERROR]: Crash report...\n..."
}
```
- **Réponse Succès (200 OK)** :
```json
{
  "success": true,
  "id": "clt9a0b1c0000..."
}
```

---

### `POST /api/telemetry/crash-report`
Point d'ingestion direct et léger pour les erreurs brutes envoyées par les instances du launcher.
- **Authentification** : Aucune.
- **Corps de la requête** : Objet JSON brut contenant la trace d'erreur.
- **Effet** : Revoie une alerte avec bloc de code JSON vers `DISCORD_WEBHOOK_URL`.
- **Réponse Succès (200 OK)** :
```json
{
  "success": true
}
```

---

## 2. Launcher, Joueurs & Modération

### `POST /api/launcher/verify`
Vérification d'intégrité au lancement du jeu par le launcher. Lie le pseudo, l'UUID Mojang et l'HWID machine, puis contrôle la présence d'un ban actif.

- **En-têtes requis** : `x-launcher-secret: <LAUNCHER_API_SECRET>`
- **Corps de la requête (JSON)** :
```json
{
  "username": "Leoo955",
  "uuid": "85a6b20a-e090-810f-b03d-000355229111",
  "hwid": "BFEBFBFF00090672_XYZ123456"
}
```
- **Réponse Joueur Autorisé (200 OK)** :
```json
{
  "banned": false,
  "playerId": "clt8abc123..."
}
```
- **Réponse Joueur Banni (200 OK)** :
```json
{
  "banned": true,
  "reason": "Utilisation de logiciel de triche non autorisé.",
  "bannedAt": "2026-09-20T14:32:00.000Z"
}
```
- **Erreurs HTTP** : `401 Unauthorized` si le header secret est incorrect.

---

### `GET /api/bans/check`
Contrôle en lecture rapide pour vérifier si un compte est actuellement banni.

- **Paramètres URL** :
  - `uuid` (optionnel ou requis selon le contexte Mojang)
  - `username` (requis)
- **Exemple** : `GET /api/bans/check?uuid=...&username=Leoo955`
- **Réponse (200 OK)** :
```json
{
  "banned": false
}
```
Si le joueur est banni :
```json
{
  "banned": true,
  "reason": "Banni par un administrateur."
}
```

---

### `POST /api/admin/moderation/ban` & `POST /api/admin/moderation/unban`
Endpoints d'administration pour appliquer ou révoquer un bannissement joueur et bloquer son HWID.
- **Authentification** : Session NextAuth avec rôle `ADMIN`.

---

## 3. Support & Synchronisation des Tickets

### `POST /api/tickets/sync-discord`
Point de ralliement entre le bot Discord Rust et la plateforme web. Permet de transférer les messages rédigés par le staff sur Discord dans le chat web du ticket, ou de marquer le ticket comme résolu.

- **En-têtes requis** : `Authorization: Bearer <DISCORD_TOKEN>`
- **Corps de la requête (JSON)** :
```json
{
  "channelId": "1516106534122426433",
  "authorName": "StaffMember",
  "authorRole": "STAFF",
  "authorImage": "https://cdn.discordapp.com/avatars/...",
  "content": "Bonjour, nous traitons votre demande.",
  "action": "message" 
}
```
Pour fermer un ticket depuis Discord (ex: commande `!close`) :
```json
{
  "channelId": "1516106534122426433",
  "authorName": "StaffMember",
  "action": "close"
}
```
- **Réponse Succès (200 OK)** :
```json
{
  "success": true,
  "ticket": { "id": "tkt_123", "status": "CLOSED" }
}
```

---

### `GET /api/tickets` & `POST /api/tickets`
- **GET** : Récupère la liste des tickets appartenant à l'utilisateur connecté (ou tous les tickets pour le staff).
- **POST** : Création d'un nouveau ticket depuis le dashboard web. Déclenche la création du salon Discord privé si le bot est connecté.

### `POST /api/tickets/[id]/messages`
Ajoute une réponse utilisateur ou staff depuis le site et envoie une copie dans le salon Discord associé.

---

## 4. Écosystème TCG (Cartes, Boosters & Variantes)

### `GET /api/cards`
Renvoie la liste des cartes du jeu.
- **Paramètres URL** : `rarity`, `edition`, `search`.
- **Réponse** : Liste d'objets `TradingCard` (avec calques graphiques, rareté, statistiques).

### `POST /api/boosters/buy`
Débite le compte du joueur en Paracoins et ajoute les cartes obtenues à son inventaire `UserCard`.
- **Authentification** : Session joueur requise.
- **Corps de la requête** : `{ "boosterId": "standard" }`.

### `POST /api/bot/give-box`
Endpoint interne permettant au bot Discord d'attribuer une box ou des boosters en récompense d'événement.
- **Authentification** : Token de service.

---

## 5. Mini-Jeux d'Économie

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/games/crash` | `POST` | Placement de mise et retrait (cashout) sur la courbe du Crash |
| `/api/games/crash/events` | `GET (SSE)` | Flux Server-Sent Events diffusant le multiplicateur en direct |
| `/api/games/roulette` | `POST` | Enregistrement des paris sur la roulette Paranoia |
| `/api/games/roulette/events` | `GET (SSE)` | Synchronisation temps réel des lancers de roulette |
| `/api/games/blackjack` | `POST` | Actions de jeu : `hit`, `stand`, `double` |
| `/api/games/mines` | `POST` | Révélation d'une case de la grille et cashout |

---

## 6. Boutique & Joueurs

### `GET /api/players`
Recherche de joueurs avec autocomplétion par pseudonyme ou UUID.
- **Paramètres URL** : `?search=pseudo`
- **Réponse (200 OK)** : Tableau de profils `{ id, minecraftName, uuid, customSkinUrl, status }`.

### `GET /api/players/[uuid]/skin`
Fournit l'URL de rendu 3D du skin du joueur via le CDN configuré (`siteConfig.skinCdn`).
