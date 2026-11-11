# Paranoia Studio : doc de passage de la maquette vers React + TypeScript

Pour les API, les données et les procédures d'exploitation, voir la [documentation backend](docs/README.md).

La maquette est du HTML/CSS/JS statique (sans build). Ce document décrit ce qu'il faut reproduire. En cas de doute, la maquette fait foi : ouvre les fichiers `.html`.

## Pages

| Route | Fichier | Contenu |
|---|---|---|
| `/` | `index.html` | Hero, deck de cartes (scroll lié), Launcher, Discord, pied de page |
| `/cartes` | `cartes.html` | Choix d'un booster, ouverture, tirage, récapitulatif |
| `/jeux` | `jeux.html` | Casino (Crash, Roulette, Mines, Blackjack) puis Trade, en scroll lié |
| `/launcher` | `launcher.html` | Téléchargement (Windows, macOS, Linux), titre, capture du launcher |

Commun à toutes les pages : `nav` (logo, 4 liens, avatar) et `footer` (logo, 3 colonnes de liens, mot « PARANOIA » ajusté à la largeur par `site.js`).

## Tokens (`style.css`, `:root`)

| Token | Valeur | Usage |
|---|---|---|
| `--black` | `#fafafa` | texte (thème sombre) |
| `--white` | `#0b0b10` | fond |
| `--purple` | `#7c3aed` | accent unique : action principale, état actif |
| `--lilac` | `#b79af3` | dégradé de l'avatar |
| `--hair` | `rgba(255,255,255,.14)` | filets |
| `--ease-out` | `cubic-bezier(.23,1,.32,1)` | transitions |
| `--font` | Archivo (axes `wdth` 62..125, `wght` 100..900) | seule police |

Titres : classe `.display` (`font-stretch:125%`, `font-weight:900`, `line-height:.92`, majuscules, `letter-spacing:-.02em`). Boutons : `.btn` (rayon 12px). Texte caché mais lu par les lecteurs d'écran : `.sr`.

Le thème est sombre uniquement. Aucun bouton de thème.

## Composants à extraire en React

- `Nav`, `Footer` (avec `FitWord` : ajuste la taille de police pour que le mot remplisse la largeur, au `resize` et quand les polices sont chargées).
- `Button` (`.btn`).
- `Booster` : deux `<img>` de la même image, clippées en `top` (20 % du haut) et `bot` (80 % du bas) pour la déchirure.
- `Card` : deux faces (`.back` avec logo, `.front` avec rareté), flip 3D.
- `OsColumn` : logo du système, nom, boutons de téléchargement, détail.
- `ScrollStage` : section haute (`height: 240vh`, `300vh`, `500vh`) avec un `.stage` en `position: sticky; top: 0; height: 100svh`.

## Scroll lié (le point technique principal)

Le motif revient sur `/`, `/cartes`, `/jeux` et `/launcher` :

1. Une section haute contient un stage sticky.
2. Un écouteur `scroll` (throttlé par `requestAnimationFrame`) calcule une progression `p = clamp(-top / (hauteur - innerHeight))`.
3. Il écrit des variables CSS (`--o`, `--p`, `--a`, `--b`, `--t`) sur les éléments. Le CSS anime avec `calc()` et les propriétés individuelles `translate`, `rotate`, `scale`.

En React : un hook `useScrollProgress(ref)` qui renvoie `p` via `useRef` et écrit les variables avec `element.style.setProperty` (pas de `setState` à chaque frame, sinon re-render à 60 fps).

Sur `/jeux`, la progression globale `g` va de 0 à 4. Un bloc de texte par jeu apparaît quand `g` passe par son tour. Le crash trace la courbe jusqu'à `p0 = clamp(g/.55)`, la roulette défile jusqu'à la case verte (index 30 sur 40), les mines s'allument dans l'ordre d'un tableau `ORDER`, le blackjack affiche A♠ et K♥ (21).

## Données

- **Cartes** (`cartes.html`) : `R` (6 raretés : nom français, couleur), `LV` (niveaux de booster : nom, nombre de cartes, probabilités par rareté), `SE` (saisons : Halloween, Noël, Nouvel An, Pâques, Saint-Valentin). `PACKS` en est dérivé. Le booster courant vit dans l'URL : `?b=premium`, `?b=noel:premium`. Une carte tirée est un simple tirage pondéré (`draw`), trié de la moins rare à la plus rare.
- **Launcher** : version 0.7.41. Fichiers : `Paranoia.Client_0.7.41_x64-setup.exe`, `_aarch64.dmg`, `_amd64.deb`, `_amd64.AppImage`. Base : `https://github.com/paranoiaSMP/client-paranoia/releases/download/v0.7.41/`. Mettre ces données dans un tableau typé (`Download[]`), pas en dur dans le JSX.
- Détection du système : `navigator.userAgent` (Windows, Mac, Linux) pour mettre la colonne « Ton système » en avant. En React, à faire dans un `useEffect` (jamais au rendu serveur).

## Animation d'ouverture d'un booster

Séquence dans `openPack()` : secousse qui s'amplifie (600 ms) puis déchirure : le haut part en rotation et disparaît, une ligne lumineuse apparaît à la déchirure (violet par défaut, couleur de la meilleure carte si elle est de rang 4 ou plus), puis les cartes sortent une par une (70 ms de décalage). Un clic retourne la carte, un second l'envoie hors écran. Après la dernière : récapitulatif.

Mouvement réduit (`prefers-reduced-motion`) : pas de secousse, pas de ligne, pas de délais. À garder.

Un état `busy` bloque les clics pendant les animations. En React, utiliser une machine à états (`idle`, `shaking`, `tearing`, `dealing`, `revealing`, `summary`) plutôt que des drapeaux.

## Accessibilité à conserver

- `:focus-visible` violet partout, jamais `outline: none` seul.
- Cibles tactiles d'au moins 44 px (onglets, boutons).
- Les flèches gauche et droite changent de booster.
- `aria-live="polite"` sur le compteur du deck.
- `prefers-reduced-motion` : les transitions de transformation sont coupées.
- Les titres de pages sans texte visible utilisent `<h1 class="sr">`.

## Ce qui est volontairement faux ou provisoire

- **Boutons morts :** les boutons d'action de `/jeux` ont `href="#"`. Les retirer ou les brancher avant la prod.
- **Liens de téléchargement :** le dépôt `paranoiaSMP/client-paranoia` est privé, donc tous les liens renvoient 404 pour un visiteur. De plus, `arm64-setup.exe` et `x86-setup.exe` (menu « Autres versions » de Windows) n'existent pas dans la release : ces noms sont devinés.
- **Illustrations :** la roulette et le crash sont des illustrations, pas de vrai jeu en direct.
- **Cartes :** les faces sont un texte provisoire (nom de la rareté), sans visuel.
- **Mobile :** les règles `@media (max-width: 760px)` et `900px` existent mais n'ont pas été testées visuellement sur `/jeux`, `/cartes` et `/launcher`.
- **Firefox :** `background-clip: text` non vérifié.

## Vérification de la maquette

Captures faites avec Chrome headless (script CDP, Node 22). Reproduire en React avec Playwright : `viewport 1440x900`, défiler à des `y` précis, capturer.
