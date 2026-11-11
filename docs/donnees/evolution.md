# Faire évoluer le schéma

Avant une modification, relever les contraintes Prisma et les lecteurs concernés, y compris le bot si la table est partagée. Si une nouvelle colonne doit devenir obligatoire, prévoir le traitement des lignes existantes et la compatibilité avec les versions encore déployées.

Sur une base de test isolée, appliquer le changement à une copie représentative, démarrer les services concernés et vérifier les lectures et écritures principales. Consigner la commande réellement utilisée, le résultat et la méthode de retour arrière.

La procédure d'initialisation des tables reste à confirmer dans le [guide de démarrage](../README.md#démarrage-local).

[Retour à l’index](README.md)
