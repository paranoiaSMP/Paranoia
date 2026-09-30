# 🎨 Spécifications de Design UI/UX — Paranoia Studio (v2.0)

Ce document est le **référentiel absolu de conception** (Single Source of Truth) pour la refonte complète des interfaces et de l'expérience utilisateur de **Paranoia**. 

Toute interface développée doit respecter strictement les principes ergonomiques, la charte graphique et les règles d'accessibilité ci-dessous.

---

## 1. Lois Cognitives & Principes Fondamentaux UX

L'ensemble des interfaces de **Paranoia Studio** s'appuie rigoureusement sur les lois de psychologie cognitive et d'ergonomie numérique ci-dessous :

### 1.1 Lois de Prise de Décision et d'Effort

1. **Loi de Jakob** :
   - *Principe* : Les utilisateurs passent la majorité de leur temps sur d'autres plateformes et s'attendent à ce que votre interface fonctionne selon les mêmes conventions. Il faut privilégier les structures de navigation et les icônes standards plutôt que de réinventer la roue.
   - *Application Paranoia* :
     - Navigation horizontale en haut de page, occupant **100% de la largeur**, avec logo à gauche, liens de navigation clairs au centre, et zone compte / connexion à droite.
     - Icônes standards universelles (Maison pour Accueil, Cartes pour TCG, Dé pour Jeux, Panier pour Boutique, Manette pour Launcher).
     - Modales avec fermeture standard par clic extérieur, croix en haut à droite et touche `Escape`.

2. **Loi de Hick** :
   - *Principe* : Le temps nécessaire pour prendre une décision augmente de façon logarithmique avec le nombre et la complexité des choix proposés. Il est indispensable de simplifier les menus, masquer les options secondaires et scinder les formulaires complexes en plusieurs étapes.
   - *Application Paranoia* :
     - Navigation limitée à 5 éléments primaires maximum.
     - Dans les jeux (Mines, Crash, etc.), sélection de mise pré-configurée (10, 50, 100, Max) pour éliminer la friction de saisie.
     - Processus de liaison de compte en une seule action (via l'API Mojang ou Discord).

3. **Loi de Fitts** :
   - *Principe* : Le temps requis pour atteindre une cible dépend de sa distance et de sa taille. Les boutons d'appel à l'action (CTA) doivent être suffisamment larges et placés dans des zones facilement accessibles (comme le bas de l'écran sur mobile).
   - *Application Paranoia* :
     - Taille minimale absolue de toute cible interactive : **44 × 44 px** (WCAG AA).
     - Boutons d'action principaux (CTA) à **48 px de hauteur** avec marge de confort.
     - Sur mobile, boutons majeurs (Cashout, Ouvrir, Valider) positionnés en bas de l'écran dans la "zone naturelle du pouce".
     - Header en 100% pleine largeur permettant de projeter le logo et le menu utilisateur aux coins supérieurs gauche et droit, maximisant la vitesse de visée.

---

### 1.2 Lois de Mémorisation et d'Attention

4. **Loi de Miller** :
   - *Principe* : La mémoire de travail d'un être humain ne peut retenir en moyenne que 7 éléments (± 2) simultanément. Pour éviter la surcharge cognitive, il faut regrouper les informations en blocs logiques (le "chunking"), comme on le fait naturellement pour formater un numéro de téléphone ou une carte bancaire.
   - *Application Paranoia* :
     - Découpage des pages en sections thématiques distinctes et aérées.
     - Formatage systématique des grands nombres et soldes (`1 250 PC` avec espace insécable et police à espacement fixe `font-mono`).
     - Grille des 4 mini-jeux essentiels (Mines, Crash, Roulette, Blackjack) sans encombrement inutile.

5. **Effet de Von Restorff (Effet d'isolation)** :
   - *Principe* : Parmi un ensemble d'éléments similaires, celui qui se démarque visuellement sera le plus facilement mémorisé ou cliqué. C'est le principe qui dicte de donner une couleur très contrastante au bouton de validation principal par rapport aux boutons d'annulation.
   - *Application Paranoia* :
     - **Discipline stricte à couleur d'accent unique** : Le violet `#9d0df2` / `#b366ff` est réservé exclusivement à l'action primaire et à l'identité de marque.
     - Bannissement des palettes "arc-en-ciel" anarchiques où chaque carte ou tag arbore une couleur différente (vert, bleu, rouge, jaune, rose) qui noie le signal visuel.
     - Les boutons secondaires adoptent des surfaces neutres sombres (`bg-zinc-900 border-zinc-800`), rendant le bouton principal immédiatement identifiable.

6. **Effet Zeigarnik** :
   - *Principe* : Les individus se souviennent beaucoup mieux des tâches inachevées ou interrompues que des tâches terminées. L'intégration de barres de progression ou de checklists incite l'utilisateur à revenir finaliser une configuration ou un achat.
   - *Application Paranoia* :
     - Indicateurs de complétion de collection TCG (ex : "Collection : 14/150 cartes découvertes - 9%").
     - Statut de configuration du compte (ex : "Pseudo Minecraft non lié" avec bouton d'action directe).
     - Progression visuelle de niveau ou de quêtes quotidiennes.

---

### 1.3 Lois de Performance Technique

7. **Seuil de Doherty** :
   - *Principe* : L'engagement est maximisé lorsque le système répond à une action en moins de 400 millisecondes, créant une illusion d'immédiateté. Si un traitement serveur est plus long, l'interface doit utiliser des écrans de chargement structurels (skeleton screens) ou des animations pour occuper l'utilisateur et masquer la latence.
   - *Application Paranoia* :
     - Rendu et feedback interactif instantané sous **100 ms** (optimistic UI sur les sélections et clics).
     - Transitions CSS fluides de **150 à 200 ms** maximum.
     - Utilisation systématique de skeleton screens (écrans structurels grisés) pendant le chargement des données plutôt que de spinners bloquants.

---

### 1.4 Les Principes de la Gestalt (Organisation Visuelle)

8. **Loi de Proximité** :
   - *Principe* : Les éléments graphiques rapprochés sont automatiquement perçus par le cerveau comme appartenant au même groupe (ex : un titre, son paragraphe et son image).
   - *Application Paranoia* : Regroupement serré des paires label / valeur (ex : Solde + montant + bouton recharger), espacements cohérents (`gap-2` pour les éléments conjoints, `gap-6` à `gap-12` entre sections).

9. **Loi de Similarité** :
   - *Principe* : Les éléments partageant les mêmes attributs visuels (couleur, forme, typographie) sont perçus comme ayant la même fonction ou importance, même s'ils ne sont pas à côté.
   - *Application Paranoia* : Tous les boutons interactifs partagent les mêmes rayons de courbure (`rounded-xl`), la même graisse (`font-bold`) et le même comportement au survol.

10. **Loi de Région Commune** :
    - *Principe* : Placer des éléments dans une zone délimitée (comme une "card" avec des bordures ou un fond d'une autre couleur) suffit à créer un groupe distinct du reste de la page.
    - *Application Paranoia* : Délimitation systématique des unités fonctionnelles par des conteneurs (`cards`) avec arrière-plan sombre distinct (`bg-zinc-950/80` ou `bg-[#12111a]`) et bordure nette (`border border-zinc-800`).

---

### 1.5 Règles Complémentaires Anti-Slop (Zéro Pollution Visuelle)

- **Zéro Pill Badges superflus** : Bannir les pastilles décoratives d'en-tête (ex : `[ 🛡️ Infrastructure ]`) qui alourdissent la page. Aller droit au but avec des titres lisibles et expressifs.
- **Typographie soignée** : 0 tiret cadratin (`—`). Utiliser les deux-points (`:`), la barre verticale (`|`) ou le point médian (`·`).
- **Zéro fausses métriques** : Aucun faux compteur marketing artificiel. Données réelles uniquement.
- **Vocabulaire direct** : Français naturel, pas de verbiage commercial creux.

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
