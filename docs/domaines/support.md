# Tickets et liaison Discord

Le site sépare l'ouverture du ticket, les changements d'état et l'envoi des messages. La synchronisation Discord passe par `/api/tickets/sync-discord`.

Pour diagnostiquer un message manquant, relever l'identifiant du ticket, le sens de la synchronisation et l'heure du message. Contrôler ensuite la réponse HTTP et les permissions du bot dans le salon concerné. Une reproduction en développement doit utiliser un serveur Discord de test.

Voir les [routes de support](../reference/api.md#support) et la [configuration Discord](../operations.md#variables-denvironnement-fichier-env).

[Retour à l’index](README.md)
