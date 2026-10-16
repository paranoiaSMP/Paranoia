# Échanges de cartes TCG : valeur des cartes

Valeurs en Paracoin, utilisées uniquement pour **équilibrer** les échanges. Les Paracoin n'entrent jamais dans un échange.

## Formule

```
valeur = base(rareté) × multiplicateur(effet)
```

## Base par rareté

| Rareté      | Base |
|-------------|-----:|
| Commune     |   15 |
| Peu commune |   35 |
| Rare        |   70 |
| Épique      |  150 |
| Légendaire  |  350 |
| Mythique    | 1200 |

Calée sur le booster Standard : 150 Paracoin pour 3 cartes, soit environ 50 par carte en moyenne avec les taux de `src/config/boosters.ts`.

## Multiplicateur par effet

| Effet                                                        | Chance de tirage                    | Multiplicateur |
|--------------------------------------------------------------|-------------------------------------|---------------:|
| Aucun                                                        | le reste                            |             ×1 |
| Holo                                                         | 5 %                                 |           ×1,5 |
| Glitch                                                       | 2 %                                 |           ×2,5 |
| Cosmic                                                       | 0,5 %                               |             ×4 |
| Fête {année} (ex. Noël 2026, Halloween 2026) | 15 % par carte, boosters de fête seulement (réglable par carte) | ×5 |
| Saison (ancien)                                              | n'est plus tiré                     |           ×1,5 |

L'effet de fête porte l'année du tirage : une carte « Noël 2026 » est distincte d'une « Noël 2027 », ce qui la rend collectionnable.

Les chances de tirage viennent de `src/app/api/packs/route.ts`. Les effets de fête ont la priorité sur les effets normaux dans un booster de fête.

## Tableau des valeurs

| Rareté      | Sans effet | Holo | Glitch | Cosmic | Fête {année} |
|-------------|-----------:|-----:|-------:|-------:|-------------:|
| Commune     |         15 |   23 |     38 |     60 |           75 |
| Peu commune |         35 |   53 |     88 |    140 |          175 |
| Rare        |         70 |  105 |    175 |    280 |          350 |
| Épique      |        150 |  225 |    375 |    600 |          750 |
| Légendaire  |        350 |  525 |    875 |   1400 |         1750 |
| Mythique    |       1200 | 1800 |   3000 |   4800 |         6000 |

## Règles d'échange

1. Cartes contre cartes uniquement, sans Paracoin.
2. Chaque côté affiche la somme des valeurs.
3. Écart de ±25 % entre les deux côtés : échange accepté normalement.
4. Au-delà de ±25 % : avertissement, et les deux joueurs doivent confirmer.
5. Deux temps : un joueur propose, l'autre confirme. Rien ne bouge avant.
6. Limite d'échanges par jour et historique consultable (anti comptes secondaires).

## Points ouverts

- **Pas de vente contre Paracoin.** Les boosters Premium, Légendaire et Mythique rapportent environ 1,3 à 1,6 fois leur prix en valeur, ce qui permettrait de produire de la monnaie en boucle. À réaligner avant d'ouvrir un marché.
- **Rareté réelle (plus tard).** Bonus ×1,0 à ×1,5 selon le nombre de joueurs qui possèdent la carte. Pas dans la première version.
- **Valeurs approximatives.** Chiffres arrondis, à ajuster après observation des vrais échanges.
