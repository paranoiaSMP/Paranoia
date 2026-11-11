# Sécurité

Modèle de menace, mesures en place, constats. Tout vient du code relu le 2026-11-10 ; aucun test d'intrusion n'a été fait.

## Modèle de menace

| Qui | Ce qu'il tente | Défense principale |
|---|---|---|
| Un joueur avec un launcher modifié | se faire passer pour un autre, afficher le badge d'autrui, échapper à un ban | l'identité vient de Mojang (`hasJoined`, `minecraft/profile`), jamais du corps de requête |
| Un visiteur anonyme | lister les joueurs, saturer l'API | aucune route de liste ; plafond de lookup ; rate limit |
| Un membre du site | s'attribuer un rôle ou des ParaCoins | contrôle de rôle à chaque route, hiérarchie des rôles |
| Un staff malveillant ou compromis | abuser du panel | rôles minimaux par onglet ; aucune journalisation d'audit (voir constats) |
| Un attaquant réseau | écouter, rejouer | HTTPS partout (Caddy), défi Mojang à usage unique |

## Authentification

- **Site** : OAuth Discord via NextAuth, session côté serveur. Le rôle est relu en base à la connexion ; le fondateur est promu `ADMIN` automatiquement.
- **Joueur du launcher** : preuve de possession du compte Minecraft par le protocole serveur de Mojang. `serverId` aléatoire de 128 bits, à usage unique, expire en 60 s. Token de session 256 bits aléatoires (`base64url`), 12 h, **stocké en mémoire** : un redémarrage déconnecte tout le monde.
- **Admin launcher-api** : une clé partagée (`x-admin-key`), 16 caractères minimum, comparée en temps constant, `503` si non configurée. Pas de compte individuel : tout porteur de la clé a tous les droits.
- **Bot → site** : secret partagé (`BOT_API_SECRET` dans le corps, ou `Bearer` + `DISCORD_TOKEN`), comparé en temps constant (`safeEqual`).

## Autorisation

- Rôles du site : `MEMBER < MODERATOR < ADMIN < OWNER/DEV`. Le panneau masque les onglets, **et** chaque route revérifie. Un owner seul modifie un Admin/DEV ; on ne change pas son propre rôle ; le fondateur reste Admin. Détails : [concepts](concepts.md#rôles-srclibrolests).
- Côté launcher-api : l'UUID agissant vient toujours du token. Un admin cosmétique (liste `admins` de `cosmetics.json`, par UUID et jamais par pseudo) a des ParaCoins illimités.

## Protection des données et des entrées

- Validation : zod sur `launcher-api` (variables d'environnement, corps) et sur quelques routes du site (`tcg`, `boosters`). Ailleurs, tests manuels.
- Prix décidé côté serveur : un achat de cosmétique est débité au prix du catalogue, jamais à celui envoyé.
- Upload (`/api/upload`) : admin seulement, types autorisés PNG/JPEG/WebP/GIF/MP4/WebM, 25 Mo. Événement (`PUT /v1/event`) : clé admin, 256 Mo, doit être un zip avec `modrinth.index.json`.
- Fichiers statiques de `launcher-api` : extensions d'image uniquement, pas de listing, pas de remontée de dossier (testé).
- Journaux : `launcher-api` ne garde que méthode, chemin et code de réponse. Le contenu des `lookup` n'est jamais écrit.
- Anti-abus : rate limit 120 requêtes/min/IP (mémoire, une instance) ; `Retry-After` sur `429`.

## Bannissements

Trois niveaux : compte, matériel (`hwid` SHA-256 de 64 hexa), IP. Un ban de compte s'étend aux autres comptes ayant partagé le même `hwid`. `permanent` fait se désinstaller le launcher. Un ban peut être temporaire (`hours`). Débannir un compte retire aussi les bans matériel/IP créés avec lui.

## Durcissement du serveur

- Caddy : seul à publier 80/443 ; HTTPS et renouvellement automatiques ; sur `api.*` : HSTS (1 an, sous-domaines), `nosniff`, en-tête `Server` retiré.
- Unité systemd de `launcher-api` (déploiement hors Docker) : utilisateur dédié, `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, écriture limitée à `data/`, `PrivateTmp`, `PrivateDevices`, redémarrage automatique.
- Pare-feu prévu : `ufw` n'autorise que 22, 80, 443 (tcp) et 443 (udp).
- Secrets : fichiers `.env` jamais versionnés ; `cosmetics.json` (UUID des joueurs) dans `.gitignore`.
- Sauvegarde quotidienne à 4 h, 14 jours. Les archives contiennent les `.env` : les copier hors du VPS **chiffrées**.

## Données personnelles

| Donnée | Où | Sensibilité |
|---|---|---|
| UUID, pseudo Minecraft | Postgres, JSON | identifiant |
| `hwid` (empreinte matérielle) | Postgres `Player.hwid`, `launcher-users.json` | identifiant technique stable : à traiter comme donnée personnelle (RGPD) |
| Adresses IP (20 dernières par joueur) | `launcher-users.json` | donnée personnelle |
| Compte Discord, e-mail | Postgres `User` | donnée personnelle |
| Rapports de bug (GPU, CPU, journaux, arguments JVM) | `BugReport` | peut contenir des chemins de fichiers avec le nom d'utilisateur du PC |

Aucune durée de conservation ni procédure de suppression n'est documentée. À définir (et à dire dans la page Privacy).

## Constats

Classés par gravité estimée. Ce sont des points à vérifier ou corriger, pas des failles prouvées.

1. **Token du bot Discord utilisé comme secret d'API** (`/api/tickets/sync-discord` exige `Bearer <DISCORD_TOKEN>`). Si ce token circule entre services, une fuite donne le contrôle du bot. Utiliser un secret dédié, comme `BOT_API_SECRET`.
2. **Clé admin unique** sur `launcher-api` (`/v1/admin/*`, `/v1/event` PUT/DELETE) : pas de révocation individuelle, pas de limite de tentatives dédiée au-delà du rate limit global de 120/min. Une page HTML d'admin est servie sans authentification (inoffensive seule, mais la clé est tapée dans le navigateur et gardée en `sessionStorage`).
3. **`/api/launcher/verify` du site renvoie un token factice** : `WSS_<id joueur>_<horodatage>`, non signé et prévisible, avec `wssUrl: "ws://localhost:8080"`. S'il sert à autoriser quoi que ce soit côté serveur, il est falsifiable. Vérifier son usage, sinon le retirer.
4. **Deux systèmes de bans** (Postgres et JSON) sans synchronisation : un ban posé dans l'un n'existe pas dans l'autre.
5. **Pas de journal d'audit** des actions staff (ban, ParaCoins, rôles, suppression).
6. **Un ban par `hwid` partagé** peut toucher un innocent (même machine, plusieurs comptes) ; le débannir passe par le compte source.
7. **Limite de débit en mémoire** : contournable derrière plusieurs IP, remise à zéro au redémarrage, et dépendante de `TRUST_PROXY=1` (si Caddy n'est pas le seul proxy, l'IP lue est fausse).
8. **Tokens joueur en mémoire** : pas de révocation explicite (pas de `logout`) ; expiration seule, 12 h.
9. **Codes `401` pour un manque de droit** côté site (devrait être `403`) : sans gravité, mais brouille la supervision.
10. **Sécurité de la route `/api/stream`, `/api/profile/[name]`, `/api/admin/cards/variants/links` (GET)** : garde non confirmée dans mon relevé. À relire.

Le modèle de sécurité du launcher lui-même (intégrité des fichiers, manifeste signé, détection d'injection) est décrit dans `ParanoiaLauncher/docs/security/security-model.md` ; c'est une cible de conception, je n'ai pas vérifié qu'elle est implémentée.
