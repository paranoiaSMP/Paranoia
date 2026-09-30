# 🚢 Infrastructure, Docker & Déploiement Production

Ce document spécifie l'infrastructure d'hébergement sur VPS Linux (Ubuntu/Debian), la conteneurisation Docker multi-stage et le reverse-proxying SSL.

---

## 1. Topologie d'Hébergement

```mermaid
graph TD
    User["Internaute / Joueur"] -->|HTTPS (Port 443)| Cloudflare["Cloudflare (WAF, DNS, Cache CDN, Anti-DDoS)"]
    Cloudflare -->|HTTPS / Origin Cert| VPS["VPS Dédié (Linux)"]
    
    subgraph VPSDocker ["Docker Engine & Compose"]
        Caddy["Conteneur Caddy (Reverse Proxy & SSL)"]
        Web["Conteneur Next.js 16 (Standalone Node.js :3000)"]
        Postgres[("Conteneur PostgreSQL 15")]
        BotRust["Conteneur Bot Discord (Rust Twilight)"]
        
        Caddy -->|Routage HTTP interne| Web
        Web <-->|Réseau bridge interne :5432| Postgres
        BotRust <-->|Réseau bridge interne :5432| Postgres
    end
```

---

## 2. Dockerfile Multi-Stage Optimisé (Next.js Standalone)

Le build en 4 étapes permet de diviser la taille de l'image Docker finale par 5 (~150 Mo au lieu de 800 Mo) :

```dockerfile
# 1. Image de base
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# 2. Dépendances de développement & build
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

# 3. Étape de compilation
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# 4. Image de production minimale (Runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN mkdir -p .next data public/uploads && \
    chown -R nextjs:nodejs .next data public/uploads && \
    chmod -R 775 .next data public/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

---

## 3. Configuration Caddyfile (Reverse Proxy)

Caddy gère automatiquement le renouvellement des certificats SSL et la compression Gzip/Zstandard :

```caddyfile
play.paranoiastudio.fr, paranoiastudio.fr {
    encode zstd gzip

    # Redirection des requêtes statiques mises en cache
    @static {
        path /_next/static/* /public/*
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # Proxy vers l'application Next.js
    reverse_proxy web:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 4. Règles & Paramétrage Cloudflare

1. **Chiffrement SSL/TLS** : Mode `Full (Strict)` avec certificat d'origine Cloudflare installé sur le VPS.
2. **Optimisations de Vitesse** :
   - Activation d'Early Hints HTTP/103.
   - Compression Brotli activée.
3. **Sécurité WAF** :
   - Limitation de débit (Rate Limiting) sur les endpoints sensibles :
     - `/api/packs` : max 10 requêtes / minute / IP
     - `/api/games/*` : max 30 requêtes / minute / IP
     - `/api/auth/*` : protection contre les attaques par force brute.
