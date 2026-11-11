# Cartes, boosters et échanges

La maquette affiche un tirage simulé dans `cartes.html`. Le site Next.js expose le catalogue des boosters, l'achat et la collection via `/api/boosters/state`, `/api/boosters/buy` et `/api/user/collection`.

Pour brancher une interface, vérifier d'abord le contrat de la route d'achat et la signification du résultat. L'animation doit afficher le résultat du serveur. Après une réponse perdue, relire l'état du compte avant de proposer de relancer une mutation dont le résultat est incertain.

Pour un échange, vérifier la propriété des cartes et l'état de l'offre au moment de la validation. Un scénario de recette doit couvrir une carte déjà transférée depuis la création de l'offre.

Voir la [référence cartes et boosters](../reference/api.md#cartes-boosters-marché).

[Retour à l’index](README.md)
