# 📚 Dictionnaire des Données — Paranoia New

Ce dictionnaire inventorie l'ensemble des tables, types de données, contraintes d'intégrité et index prévus pour la base PostgreSQL.

---

## 1. Table `users` (Comptes Utilisateurs)

| Champ | Type SQL | Nullable | Par Défaut | Description / Contrainte |
|---|---|---|---|---|
| `id` | `VARCHAR(30)` | Non | `cuid()` | Clé primaire unique. |
| `name` | `VARCHAR(255)` | Oui | `NULL` | Nom d'affichage web. |
| `email` | `VARCHAR(255)` | Oui | `NULL` | Email unique de contact. |
| `emailVerified` | `TIMESTAMP` | Oui | `NULL` | Date de validation email. |
| `image` | `VARCHAR(500)` | Oui | `NULL` | Avatar Discord / Web. |
| `discordId` | `VARCHAR(32)` | Oui | `NULL` | ID unique Discord (Snowflake). Unique. |
| `minecraftName` | `VARCHAR(32)` | Oui | `NULL` | Pseudo Minecraft officiel. |
| `minecraftUuid` | `VARCHAR(36)` | Oui | `NULL` | UUID Mojang (tiretés). Unique. |
| `customSkinUrl` | `VARCHAR(500)` | Oui | `NULL` | URL vers la texture du skin personnalisé. |
| `mcVerificationCode`| `VARCHAR(16)` | Oui | `NULL` | Code à taper in-game (`/verify <code>`). Unique. |
| `isMcVerified` | `BOOLEAN` | Non | `FALSE` | Statut de validation de la liaison Minecraft. |
| `role` | `VARCHAR(20)` | Non | `'MEMBER'` | Rôle (`MEMBER`, `MODERATOR`, `ADMIN`). |
| `paraCoins` | `INTEGER` | Non | `0` | Solde de monnaie virtuelle (Paracoins). |
| `xp` | `INTEGER` | Non | `0` | Points d'expérience accumulés. |
| `level` | `INTEGER` | Non | `1` | Niveau actuel du compte. |
| `lastDaily` | `TIMESTAMP` | Oui | `NULL` | Horodatage de la dernière réclamation Daily. |
| `createdAt` | `TIMESTAMP` | Non | `NOW()` | Date d'inscription. |

---

## 2. Table `players` (Joueurs Minecraft & Sécurité)

| Champ | Type SQL | Nullable | Par Défaut | Description / Contrainte |
|---|---|---|---|---|
| `id` | `VARCHAR(30)` | Non | `cuid()` | Clé primaire. |
| `minecraftName` | `VARCHAR(32)` | Non | - | Pseudo en jeu. Contrainte d'unicité. |
| `uuid` | `VARCHAR(36)` | Oui | `NULL` | UUID Mojang. Unique + Indexé. |
| `hwid` | `VARCHAR(128)` | Oui | `NULL` | Empreinte matérielle de la machine. |
| `customSkinUrl` | `VARCHAR(500)` | Oui | `NULL` | Rendu skin 2D/3D. |
| `status` | `VARCHAR(20)` | Non | `'ACTIVE'` | Statut (`ACTIVE`, `BANNED`, `LEFT`). |

---

## 3. Table `trading_cards` (Modèles de Cartes TCG)

| Champ | Type SQL | Nullable | Par Défaut | Description / Contrainte |
|---|---|---|---|---|
| `id` | `VARCHAR(30)` | Non | `cuid()` | Clé primaire. |
| `title` | `VARCHAR(100)` | Non | - | Nom de la carte. |
| `playerId` | `VARCHAR(30)` | Oui | `NULL` | FK vers `players.id` (si carte d'un joueur). |
| `description` | `TEXT` | Oui | `NULL` | Texte de saveur (lore) ou compétences. |
| `layer1Url` | `VARCHAR(500)` | Oui | `NULL` | Calque d'arrière-plan du personnage. |
| `layer2Url` | `VARCHAR(500)` | Oui | `NULL` | Calque de premier plan. |
| `layer3Url` | `VARCHAR(500)` | Oui | `NULL` | Calque d'effets spéciaux (particules/foudre). |
| `customBackground`| `VARCHAR(500)` | Oui | `NULL` | Fond de carte personnalisé. |
| `customBadges` | `TEXT / JSONB` | Non | `'[]'` | Badges épinglés sur la carte. |
| `characterPosition`| `TEXT / JSONB`| Non | `{"x":50,"y":50,"scale":100}` | Positionnement X, Y et échelle du skin. |
| `rarity` | `VARCHAR(20)` | Non | `'COMMON'` | Rareté (`COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `LEGENDARY`, `MYTHIC`). |
| `level` | `VARCHAR(30)` | Non | `'Normal'` | Rang ou niveau de la carte. |
| `edition` | `VARCHAR(50)` | Non | `'Standard'`| Nom de la série/saison de boosters. |
| `proba` | `FLOAT` | Non | `100` | Poids relatif dans sa tranche de rareté. |
| `isPublished` | `BOOLEAN` | Non | `FALSE` | Visible dans les boosters ou masquée. |
| `isVariant` | `BOOLEAN` | Non | `FALSE` | Indique si c'est une forme alternative. |

---

## 4. Table `user_cards` (Inventaire Individuel)

| Champ | Type SQL | Nullable | Par Défaut | Description / Contrainte |
|---|---|---|---|---|
| `id` | `VARCHAR(30)` | Non | `cuid()` | Clé primaire de l'exemplaire. |
| `userId` | `VARCHAR(30)` | Non | - | FK vers `users.id` (propriétaire). |
| `tradingCardId` | `VARCHAR(30)` | Non | - | FK vers `trading_cards.id`. |
| `obtainedAt` | `TIMESTAMP` | Non | `NOW()` | Date et heure de l'obtention. |
| `specialEffect` | `VARCHAR(30)` | Oui | `NULL` | Effet holo (`Holo`, `Glitch`, `Cosmic`). |

---

## 5. Table `user_boxes` (Boosters Stockés)

| Champ | Type SQL | Nullable | Par Défaut | Description / Contrainte |
|---|---|---|---|---|
| `id` | `VARCHAR(30)` | Non | `cuid()` | Clé primaire. |
| `userId` | `VARCHAR(30)` | Non | - | FK vers `users.id`. |
| `boxType` | `VARCHAR(20)` | Non | - | Type de booster (`standard`, `premium`, `legendary`, `mythic`). |
| `amount` | `INTEGER` | Non | `0` | Nombre de packs en réserve (≥ 0). |

*Contrainte d'unicité composite sur `(userId, boxType)`.*

---

## 6. Table `market_listings` (Marché Communautaire)

| Champ | Type SQL | Nullable | Par Défaut | Description / Contrainte |
|---|---|---|---|---|
| `id` | `VARCHAR(30)` | Non | `cuid()` | Clé primaire. |
| `sellerId` | `VARCHAR(30)` | Non | - | FK vers `users.id` (vendeur). |
| `userCardId` | `VARCHAR(30)` | Non | - | FK vers `user_cards.id` (carte vendue, unique). |
| `price` | `INTEGER` | Non | - | Prix demandé en Paracoins (≥ 1). |
| `createdAt` | `TIMESTAMP` | Non | `NOW()` | Date de mise en vente. |
