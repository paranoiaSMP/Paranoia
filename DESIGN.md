# 🎨 Spécifications de Design UI/UX — Paranoia Studio (v2.0)

Ce document est le **référentiel absolu de conception** (Single Source of Truth) pour la refonte complète des interfaces et de l'expérience utilisateur de **Paranoia**. 

Toute interface développée doit respecter strictement les principes ergonomiques, la charte graphique et les règles d'accessibilité ci-dessous.

---

## 1. Principes Fondamentaux UX & Ergonomie

1. **Vitesse & Réactivité Instantanée** :
   - Toute interaction (clic, mise, sélection de filtre) doit produire un retour visuel en moins de **100 ms**.
   - Pas de loaders plein écran pour des actions légères : privilégier des indicateurs discrets (skeletons ou spinners intégrés dans le bouton).
   - Les animations d'interface ne doivent jamais bloquer la navigation : durée maximale de **200 ms** (sauf animations narratives volontaires comme la détonation d'un booster).

2. **Accessibilité & Inclusivité (WCAG AA)** :
   - Ratio de contraste texte / fond $\ge 4.5:1$ sur tous les éléments informatifs.
   - Contour de focus clavier distinctif obligatoire (`:focus-visible:outline-2 outline-purple-500`).
   - Cibles tactiles d'au moins **44 × 44 px** sur tous les boutons, onglets et contrôles interactifs.
   - Support natif de la touche `Escape` pour refermer n'importe quelle modale ou tiroir latéral.

3. **Mobile-First & Ergonomie du Pouce** :
   - Les contrôles critiques (mise, bouton jouer, filtres rapides) sont positionnés dans la moitié inférieure de l'écran sur mobile pour être accessibles à une main.
   - Pas de défilement horizontal involontaire (`overflow-x: hidden` strict sur la page).
   - Redimensionnement fluide des grilles : 1 colonne (Mobile) ➔ 2 colonnes (Tablette) ➔ 3 ou 4 colonnes (Desktop).

4. **Règles Anti-Slop (Zéro Pollution Visuelle)** :
   - **Typographie** : 0 tiret cadratin (`—`). Utiliser les deux-points (`:`), la barre verticale (`|`) ou le point médian (`·`).
   - **Zéro fausses métriques** : Ne pas afficher de faux compteurs ("10 000 joueurs satisfaits", "99.9% uptime"). Afficher uniquement des données réelles ou des règles de jeu concrètes.
   - **Vocabulaire naturel** : Bannir les superlatifs marketing creux ("révolutionnaire", "seamless", "cutting-edge"). Privilégier des termes clairs, directs et en français soigné.

---

## 2. Design Tokens & Palette Graphique

### 2.1 Fonds & Surfaces (Dark Theme Néon Subtil)

| Rôle | Token Tailwind | Code Hex / RGBA | Usage |
| :--- | :--- | :--- | :--- |
| **Fond de page** | `bg-[#090810]` | `#090810` | Arrière-plan global, noir teinté violet très profond |
| **Surface de base** | `bg-[#12111a]` | `#12111a` | Cartes, conteneurs, panneaux de mise |
| **Surface élevée** | `bg-[#181726]` | `#181726` | Modales, menus déroulants, survols actifs |
| **Bordure standard** | `border-white/10` | `rgba(255, 255, 255, 0.10)` | Délimitation nette et subtile sans contraste agressif |
| **Bordure accent** | `border-purple-500/40` | `rgba(168, 85, 247, 0.40)` | Focus, sélection active, cartes rares |

### 2.2 Accents d'Identité & Feedback

| Rôle | Couleur | Code Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Marque Principale** | Violet Paranoia | `#b366ff` / `#9d0df2` | Titres majeurs, logo, boutons primaires |
| **Succès / Gains** | Vert Émeraude | `#10b981` | Victoires de jeu, cashout, validation |
| **Avertissement / Cotes** | Jaune Ambre | `#f59e0b` | Multiplicateurs de jeu, cotes, attention |
| **Erreur / Perte** | Rose Corail | `#f43f5e` | Mines, crash de partie, fonds insuffisants |
| **Monnaie Virtuelle** | Or Flamboyant | `#fbbf24` | Badge de solde PARA Coins, icônes pièces |

### 2.3 Raretés des Cartes TCG

| Rareté | Couleur | Badge CSS | Probabilité de Base |
| :--- | :--- | :--- | :--- |
| **Commune** | Gris Acier | `bg-slate-500/10 text-slate-300 border-slate-500/30` | 40.0% |
| **Peu Commune** | Vert Émeraude | `bg-emerald-500/10 text-emerald-300 border-emerald-500/30` | 30.0% |
| **Rare** | Bleu Électrique | `bg-blue-500/10 text-blue-300 border-blue-500/30` | 20.0% |
| **Épique** | Violet Fuchsia | `bg-purple-500/10 text-purple-300 border-purple-500/30` | 7.8% |
| **Légendaire** | Or Solaire | `bg-amber-500/10 text-amber-300 border-amber-500/30` | 2.0% |
| **Mythique** | Cyan Cosmique | `bg-cyan-500/10 text-cyan-300 border-cyan-500/40 shadow-cyan` | 0.2% |

### 2.4 Typographie

- **Titres & Identité** : `font-outfit` (`Outfit`, `sans-serif`) avec `font-black` ou `font-bold` et `tracking-tight`. Donne du caractère et de l'énergie sans être illisible.
- **Corps de texte & UI** : `font-inter` (`Inter`, `sans-serif`) avec `font-medium` ou `font-semibold`. Rendu ultra-net sur tous les écrans (OLED, Retina).
- **Données, Soldes & Multiplicateurs** : `font-mono` (`JetBrains Mono`, `monospace`) avec chiffres tabulaires (`tabular-nums`) pour éviter tout saut de ligne lors du défilement des nombres.

---

## 3. Architecture des Composants d'Interface

### 3.1 Boutons Primitifs

1. **Bouton Primaire (`btn-primary`)** :
   - Fond dégradé violet `#9d0df2` ➔ `#b366ff`
   - Texte blanc `font-bold`
   - Hauteur minimale : `44px` (`py-3 px-6`)
   - Ombre portée violette subtile au survol (`hover:shadow-[0_0_20px_rgba(179,102,255,0.4)]`)
   - Active state : léger enfoncement visuel (`active:scale-[0.98]`).

2. **Bouton Secondaire (`btn-secondary`)** :
   - Fond `bg-white/5` avec bordure `border-white/10`
   - Texte blanc, survol `hover:bg-white/10 hover:border-white/20`
   - Hauteur minimale : `44px`.

3. **Bouton Danger (`btn-danger`)** :
   - Fond `bg-rose-500/10` avec bordure `border-rose-500/30`
   - Texte `text-rose-400`, survol `hover:bg-rose-500/20`.

### 3.2 Cartes & Panneaux (`Panel`)

- Structure : `rounded-2xl border border-white/10 bg-[#12111a] p-6`
- Effet d'élévation au survol (pour les éléments cliquables) : `hover:border-purple-500/40 hover:-translate-y-0.5 transition-all duration-150`
- Découpage interne : séparateurs nets `border-t border-white/5 pt-4`.

### 3.3 Modales & Dialogues

- **Fond d'arrière-plan** : `fixed inset-0 z-50 bg-black/80 backdrop-blur-md`
- **Fenêtre modale** : `relative max-w-lg w-full rounded-3xl border border-white/15 bg-[#12111a] p-6 sm:p-8 shadow-2xl`
- **Bouton de fermeture** : Positionné en haut à droite avec taille minimale `44 × 44 px` et focus outline accessible.
- **Gestion clavier** : La touche `Escape` déclenche immédiatement `onClose()`.

---

## 4. Parcours Utilisateur & Wireframes Page par Page

### 4.1 Page d'Accueil (`/`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR : [Logo P] [Accueil] [Cartes TCG] [Jeux] [Boutique]     [Solde 🪙] [Avatar]│
├─────────────────────────────────────────────────────────────────────────────┤
│ HERO SECTION :                                                              │
│  [Badge : Environnement Autonome v2.0]                                      │
│  PARANOIA STUDIO                                                            │
│  L'univers TCG et la salle de jeux du SMP                                   │
│  [ Bouton : Découvrir les Cartes ]    [ Bouton : Jouer aux Mini-Jeux ]      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3 PILIERS PRINCIPAUX (Cartes 1/3) :                                         │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│  │ 🃏 Cartes TCG         │ │ 🎲 Salle des Jeux    │ │ 🛡️ 100% Autonome    │ │
│  │ Boosters 3D, skins   │ │ Mines, Crash,        │ │ Zéro serveur MC      │ │
│  │ et raretés jusqu'à   │ │ Roulette, Blackjack  │ │ requis pour jouer    │ │
│  │ Mythique 0.2%        │ │ Moteur temps réel    │ │ Liaison Mojang direct│ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER : Liens utiles, légal, statut et copyright                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Module TCG / Boosters (`/cards`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EN-TÊTE : Titre "Collection de Cartes" + Solde PARA Coins + [Bouton Taux]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ONGLETS : [ 🎁 Ouvrir un Booster ]   [ 📖 Ma Collection ]   [ 🏛️ Catalogue ] │
├─────────────────────────────────────────────────────────────────────────────┤
│ VUE 1 : CARROUSEL DES BOOSTERS                                              │
│                                                                             │
│         [← Précédent]     ┌───────────────┐     [Suivant →]                 │
│                           │ BOOSTER 3D    │                                 │
│                           │ Standard / ...│                                 │
│                           │ 150 🪙        │                                 │
│                           └───────────────┘                                 │
│                     [ BOUTON : OUVRIR LE PACK (3) ]                         │
│                                                                             │
│ VUE 2 : SÉQUENCE D'OUVERTURE                                                │
│  1. Pack centré avec vibration et aura lumineuse                            │
│  2. Clic joueur ➔ Détonation et son d'ouverture                             │
│  3. Révélation des 3 à 5 cartes face cachée                                │
│  4. Retournement carte par carte avec effet 3D selon la rareté             │
│  5. Récapitulatif avec option "Ouvrir un autre" ou "Voir ma collection"    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Module Mini-Jeux (`/jeux`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BANNIÈRE SOLDE JOUEUR : Solde actuel : 1 250 🪙  [Recharger]                │
├─────────────────────────────────────────────────────────────────────────────┤
│ GRILLE DES 4 JEUX :                                                         │
│  ┌──────────────────────┐ ┌──────────────────────┐                          │
│  │ 💣 MINES (5x5)       │ │ 📈 CRASH EN DIRECT   │                          │
│  │ Multiplicateur x24   │ │ Multiplicateur live  │                          │
│  │ [ Jouer au Démineur ]│ │ [ Rejoindre la fusée]│                          │
│  ├──────────────────────┼──────────────────────┤                          │
│  │ 🎡 ROULETTE 14x      │ │ ♠️ BLACKJACK 21       │                          │
│  │ Rouge / Noir / Vert  │ │ Battez le croupier   │                          │
│  │ [ Placer ses jetons ]│ │ [ S'asseoir à table ]│                          │
│  └──────────────────────┘ └──────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Structure Type d'un Mini-Jeu (ex : Mines)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FIL D'ARIANE : [← Retour aux jeux]                     HUD : Solde 1 250 🪙 │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ PANNEAU DE MISE (Gauche - 35%)       │ AIRE DE JEU INTERACTIVE (Droite - 65%)│
│                                      │                                      │
│ • Montant de la mise :               │    GRILLE 5 × 5 (25 CASES)           │
│   [ Input : 50 ]                     │    ┌───┬───┬───┬───┬───┐             │
│   Raccourcis : [10][50][100][Max]    │    │ 💎│ ? │ ? │ ? │ ? │             │
│                                      │    ├───┼───┼───┼───┼───┤             │
│ • Nombre de mines :                  │    │ ? │ 💎│ ? │ ? │ ? │             │
│   [ 1 ] [ 3 ] [ 5 ] [ 10 ] [ 24 ]    │    ├───┼───┼───┼───┼───┤             │
│                                      │    │ ? │ ? │ ? │ ? │ ? │             │
│ • Indicateur de gain potentiel :     │    ├───┼───┼───┼───┼───┤             │
│   Multiplicateur : x1.28             │    │ ? │ ? │ ? │ ? │ ? │             │
│   Gain : 64 🪙                       │    ├───┼───┼───┼───┼───┤             │
│                                      │    │ ? │ ? │ ? │ ? │ ? │             │
│ [ BOUTON ACTION : CASHOUT (64 🪙) ]  │    └───┴───┴───┴───┴───┘             │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 5. Checklist de Validation Qualité (DoD UI/UX)

Avant de valider tout nouveau composant ou écran :
- [ ] Le composant fonctionne sur mobile (375 px) sans débordement horizontal.
- [ ] Tous les boutons et éléments cliquables ont une zone tactile $\ge 44\text{ px}$.
- [ ] Le contraste texte / fond respecte les normes WCAG AA ($\ge 4.5:1$).
- [ ] La navigation au clavier (Tab, Shift+Tab, Enter, Escape) fonctionne intégralement.
- [ ] Les chiffres et soldes utilisent une police à espacement fixe (`font-mono`).
- [ ] 0 tiret cadratin (`—`) dans les textes ou commentaires.
- [ ] Les temps d'animation n'excèdent pas 200 ms.
