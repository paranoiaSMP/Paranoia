# Repères dans le schéma Prisma

La référence des champs, types et contraintes est `Paranoia_New/prisma/schema.prisma`.

| Domaine | Modèles à ouvrir en premier |
|---|---|
| Comptes | `User`, `Account`, `Session` |
| Cartes | `TradingCard`, `CardTemplate`, `UserCard`, `Edition`, `VariantProfile` |
| Inventaire et échanges | `UserBox`, `CardTrade`, `MarketListing` |
| Boutique launcher | `LauncherShopItem`, `UserCosmetic` |
| Modération | `Player`, `Ban`, `Warn`, `StaffNote` |
| Bot Discord | `GuildConfig`, `BotModule`, `BotRuntime` |

Pour suivre une donnée, partir de la route qui la modifie puis remonter au modèle. La [vue d'architecture](../guide/architecture.md#données) détaille les données conservées hors de Postgres.

[Retour à l’index](README.md)
