# Comptes et sessions

Le site associe la connexion Discord à un compte `User`. Les modèles `Account`, `Session` et `VerificationToken` font partie du schéma Prisma. Après la connexion, le parcours peut passer par `/setup` pour renseigner le pseudo Minecraft.

Lors d'une intégration, distinguer l'identité Discord du pseudo affiché et de l'UUID Minecraft. Une mutation qui vise le compte courant doit retrouver son propriétaire depuis la session côté serveur. Les opérations staff doivent aussi vérifier le rôle et les droits sur le compte ciblé.

Voir les [routes de compte](../reference/api.md#auth-et-compte) et le [guide de sécurité](../guide/securite.md).

[Retour à l’index](README.md)
