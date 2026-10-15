# Bot Paranoia Studio : fonctionnalités

Bot Discord écrit en Rust (twilight, Postgres), lié au site Next.js. Chaque module s'active, se désactive et se règle depuis la page admin du site. Les commandes d'un module désactivé ne répondent pas.

Les messages du bot utilisent des embeds, des composants Discord (boutons, menus) et des cartes d'image générées. La plupart des textes (messages, titres, couleurs) sont modifiables depuis le site avec ces variables : `{user}` (mention), `{username}`, `{avatar}`, `{server}`, `{memberCount}`, `{level}` selon le module.

Légende : activé / désactivé indique l'état par défaut d'un module.

---

## Communauté

### Tickets (activé)
- `/setup_tickets [salon]` : publie le panneau de support (4 catégories, bouton « Ouvrir » par catégorie).
- Création d'un salon privé par ticket, prise en charge (claim) et fermeture par boutons, journal de fermeture.
- Synchronisation avec la page Support du site.
- Catégories : général, signalement, vidéaste, appel de sanction.

### Giveaways (activé)
- `/giveaway prix duree [gagnants]` (permission Gérer le serveur) : durée de 10 secondes à 30 jours, 1 à 20 gagnants.
- Bouton « Participer » qui inscrit ou retire le membre, compteur de participants mis à jour.
- Fin automatique, tirage au sort, embed final avec les gagnants, annonce en réponse au message.
- Réglage : rôle à mentionner à chaque nouveau giveaway.

### Tribunal (activé)
- `/tribunal membre motif sanction [texte]` : procès humoristique ouvert à tous.
- Vote Innocent / Coupable par boutons, un vote par personne et modifiable, prolongation de 1 minute (2 fois maximum).
- Coupable si les voix coupable sont strictement plus nombreuses, égalité = acquittement.
- Peines : exclusion temporaire, amende en ParaCoins, message du tribunal.
- Immunité de 24 heures après un procès. L'accusé ne vote pas, les bots et soi-même sont refusés.
- Réglages : durée du vote, durée de l'exclusion, montant de l'amende.

### Bienvenue (désactivé)
- Message d'accueil dans un salon choisi, mention hors de l'embed.
- Carte « BIENVENUE » générée : avatar rond, titre, pseudo, sous-titre, dégradé ou fond personnalisé.
- Réglages : message (éditeur d'embed), image oui/non, titre, sous-titre, deux couleurs, lien du fond.

### Événements (activé)
- `/event` : annonce d'événement avec inscription et désinscription par boutons.

### Vidéastes (activé)
- `/creators` : présentation des vidéastes du studio avec un menu de sélection.

### Rôles de notification (activé)
- `/notifications` : panneau avec un bouton par rôle (Annonces, Vidéastes, Événements, Mises à jour, Giveaways). Un clic active le rôle, un second le retire.

### Alertes TikTok (activé)
- `/tiktok add`, `remove`, `list`, `check` : surveillance de comptes TikTok et annonce de leurs lives dans un salon.

---

## Modération

### Modération (activé)
- `/ban`, `/mute`, `/kick`, `/unban`, `/unmute` avec durée et motif.
- `/warn`, `/warnings` : avertissements et historique.
- `/cases` : historique des sanctions d'un membre.
- `/clear` : suppression de messages en masse.
- `/promote`, `/demote` : changement de rôles du staff avec grande carte d'annonce.
- Appel de sanction : le membre sanctionné reçoit un bouton d'appel, le staff accepte ou refuse.
- Permissions par rôle réglables pour chaque commande.

### Modération automatique (désactivé)
- Anti-toxicité contextuelle, détection des contournements (anti-bypass), flood, mentions, liens, médias.
- Système de points avec escalade des sanctions.
- `/test_message` : diagnostic d'un message sans sanction.

### Journal d'audit (désactivé)
- Messages modifiés (avant et après) ou supprimés (contenu, auteur, qui a supprimé).
- Arrivées : membre, date de création du compte et âge, invitation utilisée (code, inviteur, nombre d'utilisations), nombre de membres.
- Départs et mouvements dans les salons vocaux.

### Anti-raid (désactivé)
- Bloque les comptes Discord trop récents.
- Verrouille le serveur quand trop de membres arrivent en peu de temps.
- `/verrouillage on`, `off`, `statut`.

---

## Jeu et progression

### Niveaux (désactivé)
- XP en écrivant (avec délai anti-spam) et en vocal, pour les comptes liés au site.
- `/rang [membre]` : carte d'image (avatar, niveau, classement, barre d'XP) ou embed.
- Annonce de montée de niveau avec carte, message personnalisable, salon au choix.
- Rôles de récompense par palier (`niveau=identifiant du rôle`).
- `/xp action membre [montant]` (Gérer le serveur) : ajouter, retirer, définir ou remettre à zéro l'XP.
- Réglages : délai entre deux gains, XP vocal par minute, couleurs et fond de la carte.

### Classements (activé)
- `/classement [type]` : top 10 des niveaux, des ParaCoins, des collections de cartes ou des gains au casino, en carte d'image.

### ParaCoins (activé)
- `/pc` : solde.
- `/daily` : récompense quotidienne.

### Cartes TCG (activé)
- `/pack` : ouvrir un booster.
- `/cartes [membre]` : collection d'un joueur.
- `/flex` : afficher sa carte la plus rare.

### Profil (activé)
- `/profile [membre]` : compte du site, cartes et statistiques.

### Quêtes du jour (désactivé)
- `/quetes` : trois objectifs par jour (messages, vocal, booster ouvert), récompensés en ParaCoins, à réclamer par bouton.

### Drops (désactivé)
- De temps en temps, un paquet de ParaCoins apparaît dans le chat : le premier qui clique le gagne.

### Quiz (désactivé)
- Questions de culture générale (QuizzAPI) ou personnalisées, filtre de catégorie et de difficulté.
- La première bonne réponse gagne des ParaCoins, le salon se verrouille ensuite jusqu'à la question suivante.
- Une question toutes les 12 heures par défaut (réglable, 0 = seulement avec `/quiz`).

---

## Vocal

### Salons vocaux temporaires (désactivé)
- Rejoindre le salon « créer » ouvre un vocal personnel, supprimé quand il est vide.

### Rôles de salon vocal (activé)
- Donne un rôle portant le nom du salon vocal rejoint, le retire à la sortie.

### Conférences (activé)
- `/conference start`, `/conference end` : tout le monde écoute, on lève la main ou on pose une question écrite.
- Régie privée pour l'animateur, bilan à la fin.

---

## Staff

### Notes staff (désactivé)
- `/note ajouter`, `voir`, `supprimer` : notes privées sur un membre, invisibles pour les membres.

### Statistiques de modération (désactivé)
- `/statsmodo` : sanctions et avertissements par membre du staff sur 7, 30 ou 90 jours.

### Absences du staff (désactivé)
- `/absence ajouter`, `liste`, `annuler` : annonce dans un salon et rôle « absent » pendant la période.

### Candidatures (désactivé)
- `/candidature` : formulaire pour rejoindre le staff. Le staff accepte ou refuse par bouton, le candidat reçoit la réponse en message privé.

### Sauvegarde des rôles et salons (désactivé)
- `/sauvegarde creer`, `liste`, `restaurer` : la restauration recrée seulement ce qui manque, sans rien modifier ni supprimer.

---

## Site web (administration)

- Page admin des modules : activation, réglages, éditeur d'embed avec aperçu pour tous les messages personnalisables.
- Annonce du bot depuis le site (avec identifiant de message pour modifier un message existant).
- Éditeur de cartes, classeur, boutique de packs.

---

## Technique

- Rust, twilight 0.17, Postgres via sqlx, migrations automatiques au démarrage.
- Composants Discord V2 (panneaux tickets, notifications, annonces de rang) envoyés en requêtes brutes, avec embed classique en repli.
- Images générées par le bot (bienvenue, rang, classement) : crates `image`, `imageproc` et `ab_glyph`, police embarquée.
- Emojis d'application importés et utilisés dans les descriptions, les champs et les boutons.
- Déploiement par Docker : conteneurs `paranoia_bot`, `paranoia_web`, `paranoia_db`, `paranoia_caddy`.

---

## Lignes de code

Comptées avec `wc -l` sur les fichiers Rust du bot (`bot-rust/src`), tests exclus. Un fichier partagé entre plusieurs modules n'est compté qu'une fois, dans la ligne indiquée.

| Module | Fichiers | Lignes |
|---|---|---:|
| Conférences | `modules/conference.rs` | 839 |
| Modération | `commands/moderation.rs` | 733 |
| Anti-raid | `modules/security.rs` | 673 |
| Modération automatique | `events/automod.rs`, `modules/automod/*` (11 fichiers) | 2 472 |
| Tickets | `commands/tickets.rs` | 527 |
| Quiz | `modules/quiz.rs` | 467 |
| Cartes TCG | `commands/tcg.rs`, `cartes.rs`, `flex.rs` | 455 |
| Niveaux et classements | `commands/levels.rs`, `events/xp.rs` | 421 |
| Staff (notes, statistiques, absences) | `modules/staff.rs` | 360 |
| Sauvegarde des rôles et salons | `modules/backup.rs` | 300 |
| Tribunal | `modules/tribunal.rs` | 288 |
| Alertes TikTok | `commands/tiktok.rs` | 276 |
| Journal d'audit | `events/audit.rs`, `modules/message_log.rs`, `modules/invites.rs` | 506 |
| Bienvenue (cartes d'image) | `modules/welcome_image.rs` | 233 |
| ParaCoins | `commands/economy.rs`, `pc.rs`, `modules/wallet.rs` | 224 |
| Giveaways | `modules/giveaway.rs` | 202 |
| Quêtes du jour | `commands/quests.rs` | 190 |
| Événements | `commands/events.rs` | 191 |
| Rôles de notification | `commands/notifications.rs` | 189 |
| Candidatures | `modules/applications.rs` | 186 |
| Drops | `modules/drops.rs` | 185 |
| Profil | `commands/profile.rs` | 162 |
| Vidéastes | `commands/creators.rs` | 145 |
| Salons vocaux temporaires | `events/temp_voice.rs` | 59 |
| Socle commun | `main.rs`, `events/mod.rs`, `modules/mod.rs`, `activity.rs`, `embed.rs`, `utils/mod.rs`, `commands/mod.rs` | 1 719 |

Les rôles de salon vocal sont gérés dans le socle commun (`events/mod.rs`).

### Totaux

| Partie | Lignes |
|---|---:|
| Bot Rust, code source | 12 519 |
| Bot Rust, tests d'intégration (`bot-rust/tests`) | 6 945 |
| Bot Rust, migrations SQL (12 fichiers) | 78 |
| Site web, TypeScript et TSX (`src`) | 16 383 |
