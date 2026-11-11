# Concepts : authentification, rôles, données

Pour comprendre comment le backend raisonne. Pour une tâche précise, voir les [tutoriels](tutoriels.md) ; pour consulter une route, la [référence](../reference/api.md).

## Authentification

- NextAuth, fournisseur **Discord** uniquement (`src/lib/auth.ts`). La session expose `user.role`, `minecraftName`, `minecraftUuid`, `isMcVerified`, `paraCoins`, `discordId`.
- Un compte sans `minecraftName` est redirigé vers `/setup` (middleware `src/proxy.ts`).
- Les routes protégées appellent `getServerSession(authOptions)` puis un test de rôle. Réponse sans session ou sans droit : `401`.
- Le bot appelle le site avec un secret partagé : `Authorization: Bearer <DISCORD_TOKEN>` pour `/api/tickets/sync-discord`, champ `secret` (= `BOT_API_SECRET`) pour `/api/bot/give-box`. Le launcher n'a pas de session : il envoie son token Minecraft (voir [launcher-api](../reference/launcher-api.md)).

## Rôles (`src/lib/roles.ts`)

Valeurs stockées dans `User.role` (texte, défaut `MEMBER`) :

| Rôle | `isStaff` | `isAdmin` | `isOwner` |
|---|---|---|---|
| `MEMBER` | non | non | non |
| `MODERATOR` | oui | non | non |
| `ADMIN` | oui | oui | non |
| `OWNER`, `DEV` | oui | oui | oui |

- Le fondateur (UUID dans `siteConfig.founderUuid`) est promu `ADMIN` automatiquement à la connexion et ne peut pas être rétrogradé.
- Seul un owner peut attribuer `ADMIN`, `DEV`, `OWNER` ou modifier un compte Admin/DEV. Personne ne modifie son propre rôle.

## Conventions des routes

- Corps JSON en entrée. Erreurs : texte brut (`new NextResponse("…", {status})`) pour la plupart des routes admin, `{ "error": "…" }` pour `settings`, `tcg`, `boosters`, `news`. **Incohérent** : le futur client doit gérer les deux formes.
- Codes : `400` paramètres manquants/invalides, `401` pas de droit, `403` règle de hiérarchie, `404` introuvable, `413`/`415` upload, `500` erreur interne.
- Validation `zod` seulement sur `admin/tcg`, `admin/boosters` ; ailleurs, tests manuels.

## Maintenance

`SystemSetting.maintenance = on` redirige tout visiteur non staff vers `/ferme` (middleware). Le staff passe toujours.

## Modèles Prisma principaux (`prisma/schema.prisma`)

| Modèle | Rôle |
|---|---|
| `User` | compte site : rôle, ParaCoins, XP, VIP (`vipUntil`), profil staff (`staffTitle/Bio/Color`), profil public |
| `Player` | joueur Minecraft (`minecraftName`, `uuid`, `hwid`, `status` ACTIVE/BANNED) |
| `Ban` | ban d'un `Player` : motif, `bannedBy`, `isActive`, `permanent` (le launcher se désinstalle) |
| `TradingCard`, `CardTemplate`, `UserCard`, `Edition`, `VariantProfile`, `CardVariantLink` | cartes, éditions, variantes, inventaire |
| `UserBox`, `MarketListing`, `CardTrade` | boosters possédés, marché, échanges |
| `LauncherShopItem`, `UserCosmetic` | boutique cosmétiques |
| `BugReport` | signalements envoyés par le launcher (statuts `OPEN`, en cours, résolu) |
| `SystemSetting` | clé/valeur : `maintenance`, `event`, `discord_url`… |
| `BotModule`, `GuildConfig`, `Warn`, `BotSanction`, `BotAppeal`, `BotTiktokTarget`, `GuildBackup`… | état du bot Discord |
| `ModApplication`, `StaffNote`, `StaffAbsence` | recrutement et suivi du staff |
