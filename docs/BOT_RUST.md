# Bot Discord Rust (`bot-rust`) — Paranoia Studio

Ce document détaille l'architecture interne, les commandes et le cycle événementiel du bot Discord officiel de Paranoia Studio, développé en **Rust** avec le framework **Twilight**.

---

## 1. Stack Technique & Caractéristiques

- **Langage** : Rust (Edition 2021)
- **Framework Discord** : [Twilight](https://twilight.rs) (`twilight-gateway`, `twilight-http`, `twilight-model`)
- **Runtime Asynchrone** : [Tokio](https://tokio.rs) multi-thread
- **Accès Base de Données** : [SQLx](https://github.com/launchbadge/sqlx) avec pool de connexions asynchrones PostgreSQL
- **Performances** : Empreinte mémoire minime (< 25 Mo de RAM), latence événementielle ultra-faible, gestion native de la concurrence.

---

## 2. Structure du Code

```text
bot-rust/
├── Cargo.toml            # Dépendances (twilight, sqlx, tokio, tracing, reqwest)
├── migrations/           # Scripts SQL DDL pour sanctions, appeals et tiktok
│   └── 0001_initial_schema.sql
└── src/
    ├── main.rs           # Initialisation, pool DB, boucle shard Twilight, tâche TikTok
    ├── config.rs         # Variables d'environnement et valeurs par défaut
    ├── db.rs             # Méthodes d'accès base de données PostgreSQL
    ├── utils/            # Couleurs d'embeds, formats et helpers Discord
    ├── events/
    │   └── mod.rs        # Gestion des événements Gateway (Messages, Vocaux, Interactions)
    └── commands/         # Modules des commandes slash et interactions
        ├── cartes.rs     # Consultation et pagination des cartes TCG
        ├── pc.rs         # Solde et transactions Paracoins
        ├── flex.rs       # Partage public d'une carte rare
        ├── profile.rs    # Fiche joueur (Minecraft / Discord)
        ├── creators.rs   # Liste des vidéastes et créateurs
        ├── notifications.rs # Rôles de notification personnalisés
        ├── events.rs     # Inscription aux événements communautaires
        ├── quests.rs     # Suivi des quêtes
        ├── moderation.rs # Ban, mute, kick, promote, demote et système d'appels
        ├── tickets.rs    # Système de tickets complet
        └── tiktok.rs     # Surveillance et annonces TikTok
```

---

## 3. Commandes Slash

Les commandes sont enregistrées globalement auprès de l'API Discord au démarrage du bot dans [bot-rust/src/main.rs](file:///c:/Users/leoo9/Documents/Projet/Paranoia/bot-rust/src/main.rs).

| Commande | Permissions | Description |
|---|---|---|
| `/cartes` | Tous | Affiche l'inventaire TCG avec boutons de navigation et filtres de rareté |
| `/pc` | Tous | Affiche le solde de Paracoins du compte associé |
| `/flex` | Tous | Publie un aperçu interactif de l'une de ses cartes rares |
| `/profile` | Tous | Profil joueur : liaison Mojang, skin, rang et statistiques |
| `/creators` | Tous | Menu déroulant des créateurs officiels Paranoia |
| `/notifications` | Tous | Menu de sélection des rôles de pings (annonces, events, vidéos) |
| `/event` | Tous | Affiche l'événement en cours avec boutons Rejoindre / Quitter |
| `/quetes` | Tous | Liste des quêtes actives et bouton de vérification de statut |
| `/ban` | Staff | Bannit un membre, enregistre un code de sanction et propose un recours |
| `/mute` | Staff | Rend muet temporairement un membre |
| `/kick` | Staff | Expulse un membre du serveur |
| `/promote` / `/demote` | Staff | Gestion des grades internes |
| `/setup_tickets` | Admin | Déploie le panneau d'ouverture de tickets avec boutons par catégorie |
| `/tiktok` | Admin | Ajoute ou retire un compte TikTok pour la détection automatique de vidéos |

---

## 4. Système de Modération & Recours (Appeals)

1. Lorsqu'un modérateur exécute `/ban`, `/mute` ou `/kick`, une sanction est créée en base PostgreSQL avec un identifiant hexadécimal à 6 caractères.
2. Le bot expédie un message privé (DM) à l'utilisateur contenant la raison, la durée et un bouton interactif `Faire un recours`.
3. Le joueur remplit un formulaire modal (pseudonyme Minecraft, arguments).
4. La demande est transmise dans le salon de log/forum staff avec deux boutons d'action : `Accepter` ou `Refuser`.
5. Si acceptée, la sanction est annulée en base et le joueur est notifié.

---

## 5. Gestion des Rôles Vocaux Éphémères

Conformément au cahier des charges, le bot gère dynamiquement les pings des salons vocaux :
- **À la connexion** (`VoiceStateUpdate`) : Lorsqu'un membre entre dans un salon vocal (ex: "Général 1"), le bot vérifie l'existence du rôle correspondant sur le serveur. S'il n'existe pas, il est créé à la volée avec la couleur violette Paranoia (`#a855f7`). Le rôle est automatiquement attribué au membre.
- **Utilité** : Permet à n'importe quel membre ou staff de mentionner `@Général 1` pour notifier uniquement les participants de ce salon.
- **Au nettoyage** (`ChannelDelete`) : Si un salon vocal est supprimé du serveur Discord, le rôle temporaire associé est supprimé afin de ne pas encombrer la liste des rôles.

---

## 6. Tickets & Synchronisation Web

- **Ouverture** : L'utilisateur clique sur l'une des catégories de `/setup_tickets`, remplit une modale et un salon privé est généré sous `TICKET_CATEGORY_ID`.
- **Relais vers le site web** : Tout message envoyé dans un salon de ticket par un membre du staff est intercepté par l'événement `MessageCreate` et envoyé en POST vers `WEB_API_URL` (`/api/tickets/sync-discord`). Une réaction `🌐` est ajoutée en confirmation visuelle.
- **Fermeture** : La commande `!close` ou le bouton de fermeture clôt le ticket, archive les logs dans `TICKET_LOG_CHANNEL_ID` et informe l'API web.

---

## 7. Veille Automatique TikTok

Une tâche de fond Tokio s'exécute toutes les 90 secondes dans [bot-rust/src/main.rs](file:///c:/Users/leoo9/Documents/Projet/Paranoia/bot-rust/src/main.rs) :
- Scrutateur des créateurs enregistrés dans la table `tiktok_targets`.
- Détection des nouveaux posts ou statuts de live.
- Publication automatique d'une alerte avec mention du rôle configuré dans `TIKTOK_CHANNEL_ID`.
