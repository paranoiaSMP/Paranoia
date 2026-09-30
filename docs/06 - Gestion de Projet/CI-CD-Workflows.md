# 🤖 Automatisation & CI/CD — GitHub Actions

Ce document présente la configuration des pipelines d'intégration continue (CI) pour garantir la qualité de code, l'absence d'erreurs TypeScript et la validité du build de **Paranoia New**.

---

## 1. Pipeline d'Intégration Continue (`.github/workflows/ci.yml`)

À chaque Pull Request ou Push sur la branche `main`, le pipeline exécute 4 contrôles automatisés :

1. **Vérification du formatage & linting** : ESLint + Prettier.
2. **Contrôle strict des types TypeScript** : `npx tsc --noEmit`.
3. **Validation du schéma Prisma** : `npx prisma validate` & `npx prisma generate`.
4. **Compilation de production Next.js** : `npm run build`.

---

## 2. Fichier Workflow Complet

```yaml
name: CI Quality & Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    name: Lint, Types & Build
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout du code
        uses: actions/checkout@v4

      - name: 🟢 Configuration Node.js (v22)
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: 📦 Installation des dépendances
        run: npm ci --legacy-peer-deps

      - name: 🗄️ Validation du Schéma Prisma
        run: |
          npx prisma validate
          npx prisma generate

      - name: 🔍 Vérification TypeScript (Strict)
        run: npx tsc --noEmit

      - name: 🧹 Vérification Lint (ESLint)
        run: npm run lint

      - name: 🚀 Test de Build de Production (Next.js)
        env:
          NODE_ENV: production
          NEXT_TELEMETRY_DISABLED: 1
          DATABASE_URL: "postgresql://dummy:dummy@localhost:5432/dummy"
        run: npm run build
```
