# 📖 User Stories — Paranoia Studio

Voici le backlog exhaustif des User Stories classé par module fonctionnel, suivant le standard agile :
`En tant que [Rôle], je veux [Action/Fonctionnalité] afin de [Bénéfice/Valeur métier]`.

---

## 1. 🔐 Authentification, Profil & Liaison Mojang

- **US-01** : *En tant que visiteur*, je veux me connecter avec mon compte Discord en 1 clic afin d'accéder à mon profil Paranoia sans créer de nouveau mot de passe.
- **US-02** : *En tant que joueur*, je veux lier mon compte Minecraft officiel en générant un code de vérification unique sur le site puis en tapant `/verify <code>` en jeu afin de valider mon identité Mojang et récupérer mon skin 3D.
- **US-03** : *En tant que joueur*, je veux voir le rendu 3D dynamique de mon skin Minecraft avec mes cosmétiques équipés sur mon dashboard afin de personnaliser mon avatar.
- **US-04** : *En tant que joueur*, je veux réclamer ma récompense journalière de Paracoins (Daily Bonus) toutes les 24h afin d'accumuler de la monnaie pour les jeux et boosters.
- **US-05** : *En tant que joueur*, je veux suivre mon niveau de compte et ma jauge d'XP afin de mesurer ma fidélité et débloquer des avantages exclusifs.

---

## 2. 🎴 Système TCG (Cartes & Boosters)

- **US-06** : *En tant que joueur*, je veux acheter des packs de boosters (Standard, Premium, Légendaire, Mythique) avec mes Paracoins afin de tenter d'obtenir des cartes rares.
- **US-07** : *En tant que joueur*, je veux vivre une animation d'ouverture de booster interactive (déchirure du sachet, retournement des cartes avec son et effets de particules) afin de ressentir l'excitation du tirage.
- **US-08** : *En tant que collectionneur*, je veux consulter ma collection personnelle (Binder) filtrée par rareté, édition ou joueur afin d'admirer les cartes que je possède et voir les cartes manquantes.
- **US-09** : *En tant que collectionneur*, je veux inspecter une carte en détail avec une vue 3D interactive sensible à l'inclinaison de ma souris/smartphone afin d'observer les reflets holographiques (Holo, Glitch, Cosmic).
- **US-10** : *En tant que joueur*, je veux consulter la modale officielle des taux de drop (Rates Modal) avec les pourcentages exacts pour chaque pack afin d'avoir une transparence totale sur mes chances.
- **US-11** : *En tant que joueur*, je veux explorer l'arbre d'évolution d'une carte mère vers ses variantes alternatives afin de découvrir les formes spéciales débloquables.
- **US-12** : *En tant que joueur*, je veux mettre en vente un exemplaire de carte en doublon sur le Marché Communautaire au prix en Paracoins de mon choix afin d'en tirer un bénéfice.
- **US-13** : *En tant qu'acheteur*, je veux parcourir le Marché des cartes et acheter une carte mise en vente par un autre joueur en débitant automatiquement mes Paracoins et en transférant la carte dans mon inventaire.

---

## 3. 🎲 Mini-Jeux & Économie (Paracoins)

- **US-14** : *En tant que joueur*, je veux jouer au mini-jeu **Mines** sur une grille 5x5 en choisissant ma mise et mon nombre de mines (1 à 20) afin de multiplier mes gains case après case et encaisser (Cashout) au moment opportun.
- **US-15** : *En tant que joueur*, je veux jouer au mini-jeu **Crash** avec une fusée dont le multiplicateur grimpe en temps réel afin de tenter un x2, x10 ou x100 avant le crash fatal.
- **US-16** : *En tant que joueur*, je veux parier sur la **Roulette** (Rouge x2, Noir x2, Vert x14) avec des puces de mise rapide (10, 50, 100, 250, 500, 1000) et voir le rouleau tourner avec un historique des derniers numéros sortis.
- **US-17** : *En tant que joueur*, je veux jouer au **Blackjack 21** contre le croupier virtuel avec les options standards (Tirer, Rester, Doubler) et un paiement bonus 3:2 sur le Blackjack naturel.
- **US-18** : *En tant que joueur*, je veux avoir un historique clair de mes transactions de Paracoins (gains de jeux, achats boosters, daily) afin de suivre l'évolution de mon solde.

---

## 4. 🎫 Support, Tickets & Candidatures

- **US-19** : *En tant que joueur*, je veux ouvrir un ticket de support sur le site en choisissant une catégorie (Problème launcher, Perte d'item, Signalement tricheur, Question générale) afin d'obtenir de l'aide du staff.
- **US-20** : *En tant que joueur*, je veux pouvoir discuter en direct dans mon ticket web et recevoir les réponses postées par le staff depuis Discord sans latence.
- **US-21** : *En tant que modérateur*, je veux répondre directement dans le salon Discord créé pour le ticket et que mon message apparaisse instantanément sur le site web pour le joueur.
- **US-22** : *En tant que membre motivé*, je veux soumettre un formulaire complet de candidature pour devenir modérateur du serveur et suivre le statut de ma candidature (En attente, Accepté, Refusé).

---

## 5. 🛡️ Sécurité Launcher, Modération & Administration

- **US-23** : *En tant qu'admin*, je veux bannir un joueur du serveur Minecraft et du launcher en ciblant son compte Mojang ET son empreinte machine matérielle (HWID) afin d'empêcher toute tentative de contournement par double-compte.
- **US-24** : *En tant qu'admin*, je veux débannir un joueur avec traçabilité complète (qui a débanni, à quelle date, motif) pour maintenir un registre d'audit fiable.
- **US-25** : *En tant que système Launcher*, je veux envoyer une requête d'authentification sécurisée avec token secret pour vérifier si le joueur lançant le jeu est banni (par UUID ou HWID) avant de démarrer le jeu Minecraft.
- **US-26** : *En tant que système Launcher*, je veux téléverser automatiquement un rapport de crash complet (version Java, CPU, GPU, RAM libre, logs JVM) en cas de crash client pour que les développeurs corrigent les bugs rapidement.
- **US-27** : *En tant qu'administrateur TCG*, je veux créer et éditer des cartes de jeu via un studio d'édition : choix des 3 calques graphiques, positionnement libre du personnage (X, Y, Scale), sélection de l'édition et association avec le profil du joueur.
- **US-28** : *En tant qu'admin*, je veux modifier les taux de drop et les prix des boosters en base de données pour équilibrer l'économie en direct.
