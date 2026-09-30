# 🎴 Règles Métier — TCG, Cartes & Boosters

Le système TCG de Paranoia est un pilier central de l'engagement communautaire. Il combine une mécanique de collection, des visuels personnalisés multi-calques et des ouvertures de packs animées.

---

## 1. Échelle des Raretés

Chaque carte appartient à l'une des 6 raretés officielles :

| Rareté | Label | Code Couleur Tailwind | Poids dans le tri |
|---|---|---|---|
| `COMMON` | Commune | `text-slate-300` / Bordure grise | 1 |
| `UNCOMMON` | Peu commune | `text-emerald-400` / Bordure émeraude | 2 |
| `RARE` | Rare | `text-blue-400` / Bordure bleue azur | 3 |
| `EPIC` | Épique | `text-purple-400` / Bordure violette néon | 4 |
| `LEGENDARY` | Légendaire | `text-amber-400` / Bordure dorée | 5 |
| `MYTHIC` | Mythique | `text-rose-500` / Bordure rouge rubis incandescent | 6 |

---

## 2. Configuration des Boosters (Packs)

Il existe 4 types de packs de boosters achetables avec des **Paracoins** :

| Type de Pack | Prix (Paracoins) | Nb de Cartes / Pack | Couleur de lueur | Image Asset |
|---|---|---|---|---|
| **Standard** | 150 🪙 | 3 cartes | Bleu (`#3b82f6`) | `/StandardB.png` |
| **Premium** | 250 🪙 | 4 cartes | Violet (`#a855f7`) | `/PreniumB.png` |
| **Légendaire** | 400 🪙 | 4 cartes | Ambre (`#f59e0b`) | `/LegendaireB.png` |
| **Mythique** | 750 🪙 | 5 cartes | Rouge (`#ef4444`) | `/MythiqueB.png` |

---

## 3. Matrice Officielle des Taux de Drop (Probabilités)

Lors du tirage de chaque carte au sein d'un pack, la probabilité dépend exclusivement du type de booster :

```
┌──────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Booster      │ Commune  │ Peu Com. │ Rare     │ Épique   │ Légend.  │ Mythique │
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Standard     │  40.0 %  │  30.0 %  │  20.0 %  │   7.8 %  │   2.0 %  │   0.2 %  │
│ Premium      │  20.0 %  │  25.0 %  │  35.0 %  │  14.5 %  │   5.0 %  │   0.5 %  │
│ Légendaire   │  10.0 %  │  15.0 %  │  40.0 %  │  23.0 %  │  10.0 %  │   2.0 %  │
│ Mythique     │   0.0 %  │   0.0 %  │   0.0 %  │  75.0 %  │  20.0 %  │   5.0 %  │
└──────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Règle de repli (Fallback)
Si le pool de cartes d'une rareté tirée est vide en base de données, l'algorithme parcourt les raretés inférieures disponibles :
`MYTHIC ➔ LEGENDARY ➔ EPIC ➔ RARE ➔ UNCOMMON ➔ COMMON`.

---

## 4. Effets Spéciaux Visuels (Holographie)

En plus de sa rareté intrinsèque, chaque carte tirée a une chance d'obtenir un traitement holographique spécial lors de sa génération dans `UserCard` :

| Effet | Probabilité d'apparition | Rendu Visuel / Shader CSS |
|---|---|---|
| **Standard** | 92.5 % | Aucun reflet additionnel, texture de base |
| **Holo** | 5.0 % | Reflet prismatique arc-en-ciel réactif au gyroscope / curseur |
| **Glitch** | 2.0 % | Effet cyberpunk chromatique, décalage RGB dynamique |
| **Cosmic** | 0.5 % | Champ d'étoiles scintillantes et lueur violette spatiale profonde |

---

## 5. Composition Visuelle d'une Carte (Moteur Multi-Calques)

Une `TradingCard` n'est pas une simple image plate, mais un assemblage dynamique composé de :

1. **Background Layer (`customBackground`)** : Fond texturé thématique ou gradient d'édition.
2. **Layer 1 (`layer1Url`)** : Éléments graphiques d'arrière-plan du personnage.
3. **Character Layer (`characterPosition`)** : Rendu 3D du skin Minecraft ou illustration du joueur, positionné avec :
   - Coordonnée X (%)
   - Coordonnée Y (%)
   - Échelle / Scale (%)
4. **Layer 2 (`layer2Url`)** : Éléments de premier plan venant chevaucher le personnage.
5. **Layer 3 (`layer3Url`)** : Effets lumineux, particules, foudre ou auras.
6. **Badges (`customBadges`)** : Liste d'icônes/logos (ex: Vainqueur Saison 1, Modérateur, Créateur certifié).
7. **Cadre de Rareté & Typographie** : Contour selon le code couleur de la rareté, nom du joueur, niveau et édition.

---

## 6. Système d'Évolution & Variantes (Mother / Target Links)

Pour enrichir l'histoire des joueurs :
- Une **Carte Mère (`motherCard`)** peut disposer de variantes alternatives (`targetCard`).
- La liaison est assurée par l'entité `CardVariantLink` associée à un `VariantProfile` (ex: *Forme Corrompue*, *Ascension Divine*, *Saison 2*).
- Sur l'interface, le joueur peut basculer entre la version originale et ses variantes débloquées.

---

## 7. Marché Communautaire (Marketplace)

- N'importe quel joueur peut lister une carte de son inventaire (`UserCard`) via un `MarketListing`.
- **Règles de vente** :
  - La carte listée est verrouillée et ne peut plus être échangée ni réouverte.
  - Le vendeur fixe un prix minimum en Paracoins (≥ 1 🪙).
  - À l'achat : transaction atomique PostgreSQL (`prisma.$transaction`) :
    1. Débit du solde de l'acheteur.
    2. Crédit du solde du vendeur.
    3. Transfert de propriété du `UserCard` (`userId` mis à jour).
    4. Suppression du `MarketListing`.
