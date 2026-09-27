# Guide de Déploiement & Infrastructure — Paranoia Studio

Ce guide décrit la mise en production de l'infrastructure Paranoia Studio via Docker Compose et son reverse proxy Caddy HTTPS.

---

## 1. Prérequis Serveur

- **Système d'exploitation** : Ubuntu 22.04 LTS / Debian 12 ou supérieur
- **Outils requis** : Docker Engine 24+, Docker Compose v2, Git
- **Nom de domaine** : Un domaine (ex: `paranoiastudio.fr`) dont les enregistrements DNS A / AAAA pointent vers l'adresse IP publique du serveur VPS.
- **Ports ouverts** :
  - `80/tcp` (HTTP pour le challenge Let's Encrypt Caddy)
  - `443/tcp` (HTTPS sécurisé)
  - `8543/tcp` (Accès PostgreSQL externe si nécessaire, sinon fermer dans le pare-feu)

---

## 2. Architecture des Conteneurs

L'orchestration est définie dans [docker-compose.yml](file:///c:/Users/leoo9/Documents/Projet/Paranoia/docker-compose.yml) :

| Service | Image / Build | Rôle |
|---|---|---|
| `web` | `Dockerfile` (Node 22 Alpine) | Serveur Next.js 16 standalone sur le port interne 3000 |
| `db` | `postgres:15-alpine` | Base de données relationnelle PostgreSQL |
| `db-migrator` | `node:22-alpine` | Conteneur automatique exécutant les migrations Prisma au démarrage |
| `caddy` | `caddy:2-alpine` | Reverse proxy avec émission et renouvellement automatique des certificats SSL |
| `bot` | Conteneur dédié | Bot Discord connecté à la base de données et à l'API web |

---

## 3. Configuration des Variables d'Environnement (`.env`)

Créez ou modifiez le fichier `.env` à la racine du projet :

```env
# Authentification NextAuth
NEXTAUTH_SECRET="votre_cle_secrete_aleatoire"
NEXTAUTH_URL="https://paranoiastudio.fr"

# Identifiants OAuth2 Discord
DISCORD_CLIENT_ID="1515011300420227122"
DISCORD_CLIENT_SECRET="votre_secret_discord"
DISCORD_TOKEN="votre_token_bot_discord"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
ADMIN_DISCORD_ID="1417148856646242387"

# Base de données PostgreSQL
POSTGRES_USER=paranoia
POSTGRES_PASSWORD=paranoia_secure_password
POSTGRES_DB=paranoia_db

# En conteneur Docker, utiliser l'hôte de service 'db'
DATABASE_URL="postgresql://paranoia:paranoia_secure_password@db:5432/paranoia_db"

# Sécurité Launcher & Télémétrie
LAUNCHER_API_SECRET="votre_secret_partage_launcher"

# Configuration Bot Discord (IDs des Rôles & Salons)
ROLE_STAFF_ID="1516106532792828036"
ROLE_VIDEASTE_ID="1516106532784177317"
TICKET_CATEGORY_ID="1516106533962907679"
TICKET_LOG_CHANNEL_ID="1516106534122426433"
WEB_API_URL="http://web:3000/api/tickets/sync-discord"
```

---

## 4. Configuration du Reverse Proxy Caddy

Le fichier [Caddyfile](file:///c:/Users/leoo9/Documents/Projet/Paranoia/Caddyfile) gère l'obtention automatique du certificat TLS et le routage vers Next.js :

```caddyfile
paranoiastudio.fr {
    encode zstd gzip
    reverse_proxy web:3000
}
```

---

## 5. Procédure de Déploiement

### 5.1 Cloner le dépôt et préparer les dossiers
```bash
git clone https://github.com/paranoiaSMP/Paranoia.git
cd Paranoia
mkdir -p data public/uploads
chmod -R 775 data public/uploads
```

### 5.2 Lancer les services en arrière-plan
```bash
docker compose up -d --build
```

### 5.3 Vérifier le statut des conteneurs
```bash
docker compose ps
docker compose logs -f web
```

### 5.4 Appliquer les migrations de base de données manuellement si besoin
```bash
docker compose exec web npx prisma db push
```

---

## 6. Lancement du Bot Discord Rust (`bot-rust`)

### En mode natif / binaire
```bash
cd bot-rust
cargo build --release
./target/release/bot-rust
```

Le bot charge automatiquement les variables depuis le fichier `.env` parent (`../.env`) et vérifie la santé de la base de données avant d'ouvrir la connexion Gateway Discord.

---

## 7. Sauvegarde & Maintenance

### Sauvegarder la base de données PostgreSQL
```bash
docker compose exec db pg_dump -U paranoia -d paranoia_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurer une sauvegarde
```bash
cat backup.sql | docker compose exec -T db psql -U paranoia -d paranoia_db
```
