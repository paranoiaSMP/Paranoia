# Codes d'erreur

Format de réponse : voir [concepts](../guide/concepts.md#conventions-des-routes). Cause et correction pour les cas rencontrés dans le code.

| Code | Cause | Correction |
|---|---|---|
| `400` | corps incomplet ou invalide (`Missing data`, `Paramètres invalides`, `Valeurs invalides.`, couleur hors `#RRGGBB`, `value` inconnue pour `settings`) | relire les champs de la route dans [admin.md](admin.md) |
| `401` | pas de session, ou rôle insuffisant (le code utilise `401` aussi pour un manque de droit, pas seulement l'absence de connexion) | se connecter ; demander le rôle requis |
| `403` | règle de hiérarchie : seul un owner modifie un Admin/DEV ou attribue `ADMIN`/`DEV`/`OWNER` | passer par un owner |
| `404` | joueur, utilisateur, module ou carte introuvable ; compte sans Discord lié (`promote`) | vérifier l'identifiant |
| `413` | upload au-delà de 25 Mo | réduire le fichier |
| `415` | type d'upload refusé (autorisés : PNG, JPEG, WebP, GIF, MP4, WebM) | convertir |
| `500` | erreur interne ou variable d'environnement absente (`DISCORD_TOKEN`/`DISCORD_GUILD_ID` pour `promote`) | lire les logs du conteneur `paranoia_web` |
| `502` | lecture des rôles Discord impossible | vérifier le token du bot et ses permissions |

Pas de limite de débit (rate limit) relevée dans le code, ni de code `429`. À confirmer avant d'exposer des routes publiques.
