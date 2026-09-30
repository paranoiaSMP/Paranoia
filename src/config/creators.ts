export interface Creator {
  id: number;
  name: string;
  platform: "youtube" | "twitch";
  role: string;
  link: string;
  minecraftUsername: string;
}

export const CREATORS: Creator[] = [
  {
    id: 1,
    name: "Leoo955",
    platform: "youtube",
    role: "Fondateur & Créateur",
    link: "https://youtube.com/@leoo955",
    minecraftUsername: "Leoo955",
  },
];
