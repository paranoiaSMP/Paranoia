# 🎲 Règles Métier — Mini-Jeux & Économie

Le volet jeux d'argent virtuel (gamification) de Paranoia est basé sur les **Paracoins**, la monnaie interne de la plateforme.

---

## 1. La Monnaie : Paracoins (🪙)

### 1.1 Sources de revenus
1. **Bonus Quotidien (Daily Reward)** : Réclamable 1 fois toutes les 24h. Donne entre 50 et 200 Paracoins + XP de compte.
2. **Gains aux mini-jeux** : En cas de victoire sur Mines, Crash, Roulette ou Blackjack.
3. **Ventes de cartes sur le Marché** : Vente de doublons à d'autres joueurs.
4. **Récompenses en jeu (Minecraft)** : Sync avec les quêtes ou events du SMP.

### 1.2 Dépenses
- Achat de boîtes de boosters TCG (150 à 750 🪙).
- Mises dans les mini-jeux.
- Achats de cosmétiques exclusifs pour le Launcher dans la boutique.

---

## 2. Mini-Jeu : Mines (Démineur à Gains)

### 2.1 Principes du jeu
- Grille de **5×5 cases (25 cases au total)**.
- Le joueur choisit le nombre de mines cachées : `1, 3, 5, 10, ou 20` mines.
- Les autres cases contiennent des **Diamants**.
- Chaque diamant découvert augmente le multiplicateur de gain.
- Si le joueur clique sur une mine, la partie est perdue et la mise est détruite.
- Le joueur peut cliquer sur **"Cashout"** à tout moment après au moins 1 diamant découvert.

### 2.2 Formule mathématique du multiplicateur
Pour une grille de $N = 25$ cases, avec $M$ mines et $k$ cases sûres découvertes :

$$\text{Multiplicateur}(k) = 0.96 \times \prod_{i=0}^{k-1} \frac{25 - i}{25 - M - i}$$

*(Le coefficient 0.96 représente l'avantage de la maison de 4% pour préserver l'économie).*

---

## 3. Mini-Jeu : Crash (La Fusée)

### 3.1 Déroulement
1. **Phase de mise** : Les joueurs placent leur pari avant le décollage.
2. **Décollage** : Le multiplicateur commence à $1.00\times$ et augmente de façon exponentielle au fil du temps.
3. **Cashout** : Le joueur doit cliquer sur "Encaisser" avant que la fusée n'explose.
4. **Crash** : À un instant aléatoire déterminé dès le début du tour, la fusée explose. Tous les joueurs n'ayant pas encaissé perdent leur mise.

### 3.2 Génération du point de crash (Provably Fair)
Le multiplicateur de crash $C$ suit une distribution géométrique / loi de probabilité standard des jeux de crash avec 3 à 5% de House Edge :
$$C = \max\left(1.00, \; \frac{0.96}{1 - U}\right) \quad \text{où } U \in [0, 1[$$
- Si le résultat calculé est inférieur à 1.01, un "instant crash" à $1.00\times$ survient.

---

## 4. Mini-Jeu : Roulette Européenne Personnalisée

### 4.1 Grille de paris
La roulette comporte 15 numéros (ou roue stylisée 0 à 14) :
- **Rouge** : Numéros 1 à 7 (Multiplicateur : **$\times 2$**)
- **Noir** : Numéros 8 à 14 (Multiplicateur : **$\times 2$**)
- **Vert** : Numéro 0 (Multiplicateur : **$\times 14$**)

### 4.2 Puces de mise rapide (Chips)
Pour faciliter les paris rapides sur mobile et desktop :
`10, 50, 100, 250, 500, 1000` Paracoins.

### 4.3 Animation & Historique
- Rouleau horizontal animé avec amorti physique (cubic-bezier).
- Affichage de l'historique des 10 derniers tirages avec badges colorés.

---

## 5. Mini-Jeu : Blackjack 21

### 5.1 Règles officielles de la table
- **Jeu de 6 jeux de 52 cartes** mélangés.
- Les cartes 2 à 10 valent leur valeur faciale. Les têtes (Valet, Dame, Roi) valent 10. L'As vaut 1 ou 11 au choix.
- **Règles du Croupier** :
  - Le croupier doit tirer jusqu'à atteindre au moins 17.
  - Le croupier s'arrête sur tout 17 (Soft 17 stand).
- **Ratios de paiement** :
  - Victoire normale : **$1:1$** (mise récupérée + mise gagnée).
  - **Blackjack naturel** (As + carte à 10 dès le départ) : **$3:2$**.
  - Égalité (Push) : mise remboursée à 100%.
- **Actions disponibles** :
  - **Hit** (Tirer une carte)
  - **Stand** (Rester sur son score)
  - **Double** (Doubler sa mise et recevoir une seule carte finale).
