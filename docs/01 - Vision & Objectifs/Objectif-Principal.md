# 🎯 Objectif Principal — Paranoia Studio

## 1. Quel est le but précis de la plateforme ?

La plateforme **Paranoia** est le portail central web et l'écosystème communautaire du serveur Minecraft **Paranoia SMP** et de son studio.

Elle remplit **5 missions capitales** :

1. **Expérience TCG (Jeu de Cartes à Collectionner)** :
   - Offrir aux joueurs un méta-jeu addictif et gratifiant en dehors du serveur Minecraft.
   - Permettre l'achat et l'ouverture interactive de boosters de cartes représentant les joueurs, streamers, monstres et légendes du serveur.
   - Gérer une collection numérique avec des effets de brillance holographique, des variantes d'évolution, et un système de marché entre joueurs.

2. **Économie & Mini-Jeux Interactifs** :
   - Proposer des mini-jeux équitables alimentés par la monnaie du serveur (*Paracoins*) : Mines, Crash en direct, Roulette 14x, Blackjack 21.
   - Créer une boucle d'engagement quotidienne (récompenses journalières, progression d'XP et niveaux de compte).

3. **Passerelle d'Identité & Sécurité (Autonome : Web ↔ Mojang ↔ Discord)** :
   - Authentification unifiée via Discord OAuth2.
   - Liaison directe de compte Mojang via l'API REST officielle Mojang (résolution UUID + validation pseudo + rendu de skin), fonctionnant à 100% de manière autonome sans nécessiter de serveur Minecraft actif en ligne.
   - Intégration prête pour le **Launcher personnalisé** : vérification de session, contrôle strict du HWID (Hardware ID) pour bloquer les doubles-comptes et bannir les tricheurs dès l'ouverture du serveur.

4. **Support & Service Joueur Hybride** :
   - Système de billetterie/tickets synchronisé en temps réel entre le site web et le serveur Discord du staff.
   - Formulaires de candidatures pour rejoindre l'équipe de modération ou le serveur en whitelist.
   - Remontée automatisée des rapports de crash (télémétrie hardware JVM/GPU) directement depuis le launcher.

5. **Hub Communautaire & Vitrine** :
   - Présentation du serveur (IP en 1-clic avec retour visuel, statistiques de connexion en direct).
   - Espace créateurs/vidéastes partenaires, actualités et patchnotes.

---

## 2. À qui s'adresse le site ? (Public Cible)

1. **Les Joueurs Actifs du SMP** :
   - Ils veulent suivre leurs statistiques, lier leur compte, acheter des boosters avec leurs Paracoins gagnés en jeu, flexer leur inventaire de cartes rares, et contacter le staff en cas de problème.

2. **Les Passionnés de TCG & Mini-Jeux** :
   - Utilisateurs friands de collectionnite, d'ouvertures de boosters animées et de mini-jeux d'adrénaline (Mines, Crash).

3. **L'Équipe de Modération & Staff** :
   - Ils ont besoin d'un tableau de bord de modération réactif pour traiter les tickets, valider les candidatures, gérer les sanctions (bans joueur + HWID), et surveiller les crashs launcher.

4. **L'Équipe d'Administration & Gestion de Contenu** :
   - Ils conçoivent les nouvelles cartes de jeu (système multi-calques, positions, badges, raretés), créent des éditions de boosters, ajustent les taux de drop et gèrent l'économie globale.
