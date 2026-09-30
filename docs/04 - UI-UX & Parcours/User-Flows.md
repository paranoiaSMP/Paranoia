# 🗺️ Parcours Utilisateurs — User Flows

Ce document cartographie les flux de navigation et les décisions clés des utilisateurs à travers la plateforme Paranoia.

---

## 1. Flux Principal : Onboarding, Connexion & Liaison Minecraft

```mermaid
flowchart TD
    Start([Arrivée sur la Landing Page]) --> InspectHero[Découverte de l'univers & IP Serveur]
    InspectHero --> ClicCopyIP[Copie de l'IP en 1-clic : 'play.paranoiastudio.fr']
    InspectHero --> ClicLogin[Clic sur 'Connexion']
    
    ClicLogin --> DiscordOAuth[Redirection vers Discord OAuth2]
    DiscordOAuth -->|Autorisation validée| CreateOrFetchUser[Création / Récupération du compte User]
    CreateOrFetchUser --> Dashboard[Redirection Dashboard Joueur]
    
    Dashboard --> CheckMC{Compte Minecraft lié ?}
    CheckMC -->|Oui| ViewFullProfile[Affichage Skin 3D, Solde Paracoins & Tiers]
    CheckMC -->|Non| ShowLinkPrompt[Bannière : 'Liez votre compte Minecraft']
    
    ShowLinkPrompt --> GenCode[Génération du code /verify PARA-XXXX]
    GenCode --> InGameAction[Le joueur tape la commande sur le serveur Minecraft]
    InGameAction --> WebhookSuccess[Validation instantanée en arrière-plan]
    WebhookSuccess --> ViewFullProfile
```

---

## 2. Flux TCG : Achat, Ouverture de Booster & Collection

```mermaid
flowchart TD
    EnterCards([Page /cards : TCG Hub]) --> SelectTab{Sélection d'onglet}
    
    SelectTab -->|Boutique Boosters| ChooseBooster[Choix du pack : Standard, Premium, Légendaire, Mythique]
    ChooseBooster --> ViewRates[Consultation de la modale des taux de drop]
    ViewRates --> ConfirmBuy{Solde Paracoins suffisant ?}
    
    ConfirmBuy -->|Non| PromptRecharge[Redirection vers Jeux ou Quêtes]
    ConfirmBuy -->|Oui| DeductCoins[Débit des coins & Incrément UserBox]
    
    DeductCoins --> OpenAnimation[Lancement animation : Déchirure du paquet]
    OpenAnimation --> CardReveal[Révélation interactive carte par carte avec son]
    CardReveal --> CheckRare{Rareté >= Épique ou Effet Holo ?}
    CheckRare -->|Oui| ConfettiBurst[Particules confettis & lueur intense]
    CheckRare -->|Non| SimpleFlip[Retournement standard]
    CardReveal --> StoreInventory[Cartes ajoutées à l'inventaire UserCard]
    
    SelectTab -->|Mon Binder| ViewCollection[Grille de cartes possédées]
    ViewCollection --> InspectCard[Clic carte : Modale 3D CardDetail avec reflets]
    InspectCard --> SellOption[Mettre en vente sur le Marché]
```

---

## 3. Flux Mini-Jeux : Mise, Action & Retrait (Mines / Crash)

```mermaid
flowchart TD
    EnterGame([Page /jeux : Hub Casino Virtuel]) --> SelectGame[Choix : Mines, Crash, Roulette, Blackjack]
    
    SelectGame --> SetBet[Sélection de la mise en Paracoins & chips rapides]
    SetBet --> CheckBalance{Solde >= Mise ?}
    CheckBalance -->|Non| AlertError[Message d'erreur solde insuffisant]
    CheckBalance -->|Oui| StartRound[Début du tour de jeu]
    
    StartRound --> GameLoop[Interaction en jeu : Découverte case ou attente multiplicateur]
    GameLoop --> PlayerDecision{Action Joueur}
    
    PlayerDecision -->|Cashout avant échec| WinRound[Crédit immédiat des gains x multiplicateur]
    PlayerDecision -->|Mine touchée ou Crash| LoseRound[Perte de la mise, son d'échec]
    
    WinRound --> UpdateBalanceUI[Mise à jour du solde en haut à droite]
    LoseRound --> UpdateBalanceUI
```
