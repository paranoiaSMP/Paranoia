# Panel admin

Page `/admin` (`src/app/admin/page.tsx`) + `/admin/cartes` (éditeur de cartes) + `/bot` (panel du bot). Accès : le middleware renvoie vers `/` tout compte non staff ; la page affiche « Accès réservé » sinon.

Onglet actif dans l'URL : `/admin?tab=<clé>`. Les onglets non autorisés sont masqués ; un onglet inconnu retombe sur le premier visible.

## Onglets et droits

| Onglet (`tab`) | Droit min. | Composant | Rôle de l'écran |
|---|---|---|---|
| `overview` Vue d'ensemble | admin | `Overview.tsx` | 6 compteurs : comptes, ParaCoins en circulation, signalements ouverts, joueurs, bannis, actualités publiées |
| `users` Utilisateurs | staff | `Users.tsx` | recherche, filtre par rôle, changement de rôle, compte Minecraft, économie, VIP, profil staff, promotion Discord |
| `players` Joueurs et bans | staff | `Players.tsx` | recherche de joueur, ban (motif, définitif), déban |
| `reports` Signalements | admin | `Reports.tsx` | liste filtrable (Tous / Ouvert / En cours / Résolu), changement de statut, suppression |
| `gifts` Dons | admin | `Gifts.tsx` | récompense (ParaCoins, boîtes), carte à un joueur, boosters en boutique, actions massives |
| `shop` Boutique | admin | `Shop.tsx` | cosmétiques (cape, ailes, halo, chapeau, particules, emote) : prix, devise, image, modèle |
| `tcg` TCG | admin | `Tcg.tsx` | règles d'évolution, recettes de fusion |
| `news` Actualités | admin | `News.tsx` | publier/supprimer actualités et annonces |
| `settings` Paramètres | owner (dev) | `Settings.tsx` | maintenance, événement saisonnier, lien Discord |

Hors onglets : `/admin/cartes` (éditeur de cartes, `OWNER/ADMIN/DEV`) et `/bot` (`BotDashboard.tsx` : vue d'ensemble, modules, appels et sanctions, annonce, alertes TikTok, éditeur d'embed).

## Routes par onglet

**users** : `GET/PUT/PATCH/DELETE /api/admin/users`, `POST /api/admin/users/economy`, `PUT /api/admin/users/profile`, `GET/POST /api/admin/users/promote`.

- `PUT users` `{userId, role}` : rôle valide requis ; hiérarchie ci-dessus (403 sinon, 400 si on vise soi-même ou le fondateur).
- `PATCH users` `{userId, minecraftName}` : admin requis.
- `economy` `{userId, action, amount, boxType?}` : `amount ≥ 0`. Actions : fixer les ParaCoins, donner des boîtes (`boxType` requis), VIP (`amount` = jours ajoutés, max 3650, 0 retire le VIP). Staff autorisé.
- `profile` `{userId, staffTitle, staffBio, staffColor}` : couleur `#RRGGBB`.
- `promote` : `GET` liste les rôles Discord attribuables ; `POST {userId, promote, roleId, otherRoleId?, reason?}` modifie le rôle sur le serveur Discord (token bot requis, 502 si illisible, 404 si pas de Discord lié).

**players** : `GET/POST/DELETE/PATCH /api/players` (`?search=`), `POST /api/admin/moderation/ban` `{playerId, reason, permanent}`, `POST /api/admin/moderation/unban` `{playerId}`. `PATCH players` ne pose que `ACTIVE`. Le ban met `Player.status = BANNED`.

**reports** : `GET /api/admin/reports`, `PATCH/DELETE /api/admin/reports/[id]`.

**gifts** : `POST /api/admin/cards/manage` `{action: GIVE_BOX | GIVE | REMOVE, userId|minecraftName, cardId, boxType, amount, specialEffect}` ; `POST /api/admin/bot/give` `{identifier, rewardType, amount, boxType}` ; `GET/PUT /api/admin/boosters` (stock et prix des boosters ; un pack festif exige un stock).

**shop** : `GET/POST/PUT/DELETE /api/admin/shop/items` (`DELETE ?id=`), champs `itemId, name, description, price, currency, imageUrl, modelUrl, category`. Fichiers via `POST /api/upload` (PNG, JPEG, WebP, GIF, MP4, WebM ; 25 Mo max).

**tcg** : `GET/PUT /api/admin/tcg` `{config: {evolveCount 2..20, …}, recipes: [{id, name, resultId, ingredients: [{cardId, qty 1..20}] (1..6)}]}`. Refus si une carte n'existe plus ou si deux recettes ont le même `id`.

**news** : `GET/POST/DELETE /api/admin/news` (`DELETE ?id=`).

**settings** : `GET ?key=`, `POST {key, value}` :

| Clé | Valeurs |
|---|---|
| `maintenance` | `on` / `off` |
| `event` | `auto`, `off`, ou un événement connu (Halloween, Noël, Nouvel An, Saint-Valentin, Pâques) |
| `discord_url` | `https://discord.gg/…` ou `https://discord.com/invite/…` |

**bot** (`/bot`) : `GET /api/admin/bot`, `GET/PUT /api/admin/bot/modules` (admin), `POST /api/admin/bot/announce` `{channelId, content, pingRole, embed, components, messageId}` (staff), `POST /api/admin/bot/appeals` `{appealId, status}` (staff), `POST/DELETE /api/admin/bot/tiktok` `{username, channelId, roleId}` (admin), `GET/DELETE /api/admin/bot/warns` (staff), `GET/POST/DELETE /api/admin/bot/embeds` (modèles d'embed ; suppression admin).

## À savoir avant le portage

- Le droit est vérifié à deux endroits : l'onglet masqué côté client **et** chaque route côté serveur. Garder les deux.
- Plusieurs routes admin n'affichent pas de garde `isAdmin` dans mon relevé automatique (`admin/bot`, `bot/announce`, `bot/appeals`, `bot/warns`, `moderation/*`, `settings`, `users/economy`) : elles utilisent `isStaff` ou `isOwner` directement. Vérifier chaque garde avant de réécrire.
- Réponses d'erreur en texte brut ou en JSON selon la route (voir README).
- Pas de journal d'audit des actions admin dans ce que j'ai lu (ban, ParaCoins, rôles) : à prévoir dans la refonte.
