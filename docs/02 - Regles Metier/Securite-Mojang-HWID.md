# 🛡️ Règles Métier — Sécurité, Liaison Mojang & HWID Launcher

La sécurité du serveur Paranoia repose sur une synchronisation tripartite : **Discord OAuth2 ↔ Compte Mojang Minecraft ↔ Empreinte Machine Launcher (HWID)**.

---

## 1. Processus de Liaison Mojang
 
### 1.1 Mode Actif : Liaison Directe Web & API Mojang (100% Autonome)
Puisqu'aucun serveur de jeu Minecraft n'est requis pour faire fonctionner la plateforme web, les boosters TCG et les mini-jeux, la liaison de compte s'effectue directement via l'API officielle Mojang :
1. Le joueur renseigne son pseudo Minecraft sur le formulaire `/setup`.
2. L'API Next.js (`POST /api/user/setup`) contacte `https://api.mojang.com/users/profiles/minecraft/{username}`.
3. Mojang renvoie l'UUID officiel et la casse exacte du joueur.
4. Le système enregistre l'UUID au format standard avec tirets (`8-4-4-4-12`), crée le profil `Player` en base de données PostgreSQL et passe `isMcVerified` à `true`.
5. Le skin est automatiquement résolu via le CDN officiel de textures Minecraft (`vzge.me` / session server).
6. **Résultat : Zéro dépendance à un serveur Minecraft actif.**

### 1.2 Mode Futur : Vérification In-Game via Plugin (Optionnel)
Lorsque le serveur SMP sera officiellement ouvert au public, un contrôle supplémentaire optionnel pourra être activé :

```mermaid
sequenceDiagram
    autonumber
    actor Player as Joueur (Web)
    participant Web as Serveur Web Next.js
    participant DB as PostgreSQL
    actor MC as Joueur en jeu (Minecraft)
    participant Server as Serveur Minecraft (Paper/Spigot)

    Player->>Web: Clic sur "Vérifier en jeu"
    Web->>Web: Génération d'un code alphanumérique sécurisé (ex: "PARA-8492")
    Web->>DB: Sauvegarde du mcVerificationCode sur l'utilisateur
    Web-->>Player: Affiche la consigne : Taper "/verify PARA-8492" en jeu
    MC->>Server: Exécute "/verify PARA-8492"
    Server->>Web: Webhook API POST /api/user/verify-link { uuid, username, code }
    Web->>DB: Validation du code, passage de isMcVerified à true
    Web-->>Server: 200 OK (Compte validé)
    Server-->>MC: Message de confirmation en jeu vert fluo !
```

---

## 2. Empreinte Machine Launcher (HWID)

Pour empêcher les joueurs bannis pour triche (x-ray, reach, fly) de recréer un compte alternatif et de revenir polluer l'expérience des autres :

### 2.1 Calcul du Hardware ID
Le Launcher dédié Paranoia génère un hash cryptographique non réversible combinant :
- Le numéro de série de la carte mère (BIOS UUID)
- L'ID matériel du disque système principal (Volume Serial Number)
- L'identifiant processeur (CPU ID).

### 2.2 Vérification au lancement du jeu (`/api/launcher/verify`)
1. Le launcher envoie :
   - `minecraftUuid`
   - `username`
   - `hwid`
   - Header secret `x-launcher-secret`.
2. Le backend vérifie :
   - Si un ban actif existe pour ce `uuid` ➔ **Refus immédiat**.
   - Si un ban actif existe pour ce `hwid` (même sous un autre pseudo) ➔ **Refus immédiat avec alerte "Double-compte détecté sur machine bannie"**.
3. Si tout est valide, une session de jeu temporaire est validée.

---

## 3. Gestion des Sanctions & Bans

L'entité `Ban` conserve l'historique complet pour garantir la justice et la traçabilité :
- `playerId` : Référence vers le joueur Minecraft
- `hwid` : Empreinte machine enregistrée au moment du ban
- `reason` : Motif explicite de la sanction
- `bannedBy` : Identifiant du membre du staff à l'origine du ban
- `bannedAt` : Horodatage
- `isActive` : Booléen (`true` tant que le ban n'est pas purgé ou révoqué)
- `unbannedAt` & `unbannedBy` : Métadonnées d'audit lors d'un débanissement.

---

## 4. Télémétrie & Crash Reports Automatiques

Lorsque le client Minecraft du joueur rencontre un crash critique :
- Le launcher intercepte le signal d'erreur de la Machine Virtuelle Java (JVM).
- Il envoie un rapport complet à `POST /api/telemetry/crash-report` :
  - `gpu`, `cpu`, `screenResolution`
  - `ramSystem`, `ramAllocated`
  - `osInfo` (Windows 11, Linux, macOS)
  - `jvmArgs`
  - `logs` (Stacktrace complète du crash)
- Les administrateurs peuvent consulter et filtrer ces rapports directement dans l'interface admin pour déployer des patchs correctifs.
