# 📐 Wireframes & Dispositions d'Interface (Layouts)

Ce document formalise l'organisation spatiale des interfaces avant l'intégration graphique, garantissant une ergonomie irréprochable sur Desktop (1440px), Tablette (768-1024px) et Mobile (375-430px).

---

## 1. Structure Globale du Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR GLOBALE (Fixe en haut - z-50)                                       │
│ [Logo Paranoia]  [Accueil] [TCG Cartes] [Jeux] [Boutique] [Launcher] [Support] │
│                                             [🪙 Solde] [Profil / Avatar ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ZONE DE CONTENU DE LA PAGE                          │
│                               (max-w-7xl mx-auto)                           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FLOATING DOCK (Mobile / Raccourcis bas d'écran optionnels)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER GLOBAL (Réseaux, Mentions légales, CGU, Copyright 2026)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Wireframe : Hub TCG (/cards)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EN-TÊTE : Titre "Jeu de Cartes Paranoia" + Sous-titre + Bouton Taux de Drop │
├─────────────────────────────────────────────────────────────────────────────┤
│ ONGLETS CENTRAUX : [ 🎁 Ouvrir un Booster ]  [ 📖 Mon Binder ]  [ 🏛️ Catalogue ] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ IF (Onglet == "Ouvrir un Booster") :                                        │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│   │ PACK STANDARD │ │ PACK PREMIUM  │ │ PACK LÉGENDE  │ │ PACK MYTHIQUE │   │
│   │ Image 3D pack │ │ Image 3D pack │ │ Image 3D pack │ │ Image 3D pack │   │
│   │ 3 Cartes      │ │ 4 Cartes      │ │ 4 Cartes      │ │ 5 Cartes      │   │
│   │ Prix : 150 🪙 │ │ Prix : 250 🪙 │ │ Prix : 400 🪙 │ │ Prix : 750 🪙 │   │
│   │ [ Acheter ]   │ │ [ Acheter ]   │ │ [ Acheter ]   │ │ [ Acheter ]   │   │
│   └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
│ IF (Onglet == "Mon Binder") :                                               │
│   [Barre de recherche] [Filtre Rareté ▼] [Filtre Édition ▼] [Tri ▼]          │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│   │ Carte Joueur │ │ Carte Joueur │ │ Carte Joueur │ │ Carte Joueur │       │
│   │ Layer 3D     │ │ Layer 3D     │ │ Layer 3D     │ │ Layer 3D     │       │
│   │ Holo Effet   │ │ Normal       │ │ Glitch       │ │ Cosmic       │       │
│   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Wireframe : Mini-Jeu Mines (/jeux/mines)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Fil d'Ariane : Accueil > Jeux > Démineur                                    │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ PANNEAU DE CONTRÔLE (Gauche - 35%)   │ PLATEAU DE JEU (Droite - 65%)        │
│                                      │                                      │
│ 1. Montant de la mise (🪙)           │   GRILLE 5 × 5 INTERACTIVE           │
│   [ Input : 100 ]                    │   ┌───┬───┬───┬───┬───┐              │
│   Chips : [10][50][100][500][Max]    │   │ ? │ ? │ 💎│ ? │ ? │              │
│                                      │   ├───┼───┼───┼───┼───┤              │
│ 2. Nombre de Mines                   │   │ ? │ 💎│ ? │ ? │ 💎│              │
│   [ 1 ] [ 3 ] [ 5 ] [ 10 ] [ 20 ]    │   ├───┼───┼───┼───┼───┤              │
│                                      │   │ 💎│ ? │ ? │ 💣│ ? │              │
│ 3. Statut en cours                   │   ├───┼───┼───┼───┼───┤              │
│   Multiplicateur actuel : x1.45      │   │ ? │ ? │ 💎│ ? │ ? │              │
│   Gain potentiel : 145 🪙            │   ├───┼───┼───┼───┼───┤              │
│                                      │   │ ? │ 💎│ ? │ ? │ ? │              │
│ [ BOUTON DÉMARRER / CASHOUT ]        │   └───┴───┴───┴───┴───┘              │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 4. Breakpoints & Responsive Design

- **Mobile (< 640px)** :
  - La Navbar se transforme en Drawer latéral avec bouton Hamburger.
  - Le panneau de contrôle des jeux passe **au-dessus** de la grille de jeu.
  - Les grilles de cartes passent en 1 ou 2 colonnes.
- **Tablette (640px - 1024px)** :
  - Grille de cartes en 3 colonnes.
  - Padding latéral ajusté pour éviter tout débordement horizontal.
- **Desktop (> 1024px)** :
  - Affichage pleine largeur 12 colonnes, animations Framer Motion à 60 FPS.
