export interface LauncherFeature {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface LauncherInstance {
  name: string;
  loader: string;
  version: string;
  highlight?: boolean;
}

export interface LauncherNews {
  title: string;
  description: string;
}

export interface LauncherConfig {
  name: string;
  version: string;
  downloadStatus: string;
  features: LauncherFeature[];
  mockInstances: LauncherInstance[];
  mockNews: LauncherNews;
  userSkin: {
    username: string;
    subtitle: string;
    skinUrl: string;
  };
}

export const LAUNCHER_CONFIG: LauncherConfig = {
  name: "Paranoia Client",
  version: "1.21.1",
  downloadStatus: "Bientôt disponible",
  features: [
    {
      title: "Ultra Rapide",
      description: "Téléchargement optimisé des mods et lancement instantané du jeu.",
      icon: "Zap",
      color: "#a855f7",
    },
    {
      title: "100% Sécurisé",
      description: "Connexion directe et sécurisée avec votre compte Microsoft officiel.",
      icon: "Shield",
      color: "#818cf8",
    },
    {
      title: "Prêt à jouer",
      description: "Aucune configuration requise. Tout est géré pour vous automatiquement.",
      icon: "Rocket",
      color: "#34d399",
    },
  ],
  mockInstances: [
    { name: "Lunar - PVP MAIN", loader: "fabric", version: "1.21.1" },
    { name: "Survie", loader: "fabric", version: "1.21.1" },
    { name: "MAIN", loader: "pvp", version: "1.21.1", highlight: true },
  ],
  mockNews: {
    title: "Saison 3 · Les cartes mythiques",
    description: "Nouvelle édition de cartes, deux boosters inédits et le retour des événements du samedi soir.",
  },
  userSkin: {
    username: "Leoo955",
    subtitle: "skin · cape saison 3",
    skinUrl: "https://vzge.me/full/512/Leoo955.png",
  },
};
