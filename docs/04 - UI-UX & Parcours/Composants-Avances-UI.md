# 🎨 Composants UI Avancés & Animations

Ce document recense les composants d'interface à forte complexité visuelle ou interactive, ainsi que les bibliothèques tierces requises pour leur implémentation fluide.

---

## 1. Inventaire des Composants Complexes

| Composant | Emplacement | Librairie / Technique | Rôle & Spécificités |
|---|---|---|---|
| **CardDisplay (3D Parallax)** | `src/features/binder/` | **Framer Motion + CSS 3D** | Rendu des calques multiples (L1, L2, L3, Skin, Badges), inclinaison gyroscopique au pointeur (`rotateX`, `rotateY`), effets de brillance holographique (`Holo`, `Glitch`, `Cosmic`). |
| **PackOpener (Booster)** | `src/app/cards/` | **Framer Motion + Canvas-Confetti** | Animation d'ouverture de sachet (déchirure), révélation progressive des cartes, projection de particules multicolores pour les raretés Légendaires et Mythiques. |
| **PlayerSkinViewer (3D)** | `src/components/player/` | **Three.js / skinview3d** | Rendu 3D interactif du personnage Minecraft, support des capes et des calques 1.8+ (armure/cheveux) avec rotation orbitale à la souris. |
| **CrashCanvas (Fusée)** | `src/app/jeux/crash/` | **HTML5 Canvas / RAF** | Tracé vectoriel à 60 FPS de la courbe exponentielle, affichage du multiplicateur temps réel, secousse de caméra et explosion lors du crash. |
| **RouletteScroller** | `src/app/jeux/roulette/` | **Framer Motion / Spring** | Rouleau horizontal à défilement physique avec amorti non linéaire (`cubic-bezier`), arrêt précis sur le numéro gagnant. |
| **FloatingDock** | `src/components/ui/` | **Aceternity UI + Lucide** | Barre d'outils flottante rétractable en bas d'écran avec effet de grossissement d'icône au survol (style macOS dock). |
| **BackgroundBeams / Sparkles**| `src/features/home/` | **React Bits / Tailwind** | Arrière-plans néons animés pour la Landing Page et les titres de sections sans impact sur les performances CPU. |
| **CopyIpButton** | `src/components/common/` | **Web Clipboard API + Lucide** | Bouton 1-clic avec retour d'état instantané (icône `Copy` ➔ `Check` vert fluo pendant 2s). |

---

## 2. Dépendances Frontend Recommandées

```json
{
  "dependencies": {
    "framer-motion": "^12.40.0",
    "canvas-confetti": "^1.9.4",
    "lucide-react": "^1.18.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.6.0",
    "skinview3d": "^3.1.0",
    "zustand": "^5.0.14",
    "react-hot-toast": "^2.6.0"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  }
}
```

---

## 3. Directives d'Optimisation des Performances

1. **Pas de Layout Shift (CLS)** :
   - Réserver des boîtes à dimensions fixes (`aspect-ratio` ou `min-h-[...]`) pour les images de cartes et les animations textuelles (`FlipWords`).
2. **GPU Acceleration** :
   - Appliquer systématiquement `will-change: transform` et `transform-style: preserve-3d` sur les cartes 3D.
3. **Nettoyage des Timers & AnimationFrames** :
   - Tous les hooks de mini-jeux (`useMines`, `useCrash`, `useRoulette`) doivent annuler leurs boucles `requestAnimationFrame` et `clearInterval` dans le cleanup de `useEffect`.
