# Jeux et flux en direct

Crash, Roulette, Mines et Blackjack ont chacun une route sous `/api/games`. Crash et Roulette exposent également des flux d'événements. Les animations de `jeux.html` illustrent les jeux et tournent dans le navigateur.

Pour intégrer un jeu, relever dans sa route les actions reconnues, les états de partie et les erreurs. Traiter séparément une action refusée et une connexion au flux interrompue. Après une coupure, reprendre depuis un état serveur fiable avant de réactiver les commandes de jeu.

La [référence des routes](../reference/api.md#jeux) indique les points d'entrée.

[Retour à l’index](README.md)
