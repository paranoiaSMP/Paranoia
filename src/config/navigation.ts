import { siteConfig } from "./site";

export interface NavItem {
  title: string;
  href: string;
  badge?: string;
  iconName?: string;
  external?: boolean;
}

export const mainNavLinks: NavItem[] = [
  { title: "Accueil", href: "/" },
  { title: "Boutique", href: "/shop" },
  { title: "Jeux", href: "/jeux", badge: "New" },
  { title: "Launcher", href: "/launcher" },
];

export const communityDropdownLinks: NavItem[] = [
  { title: "Vidéastes", href: "/videastes", iconName: "Video" },
  { title: "Candidature", href: "/candidature", iconName: "FileText" },
  { title: "Support / Tickets", href: "/tickets", iconName: "Ticket" },
];

export const footerNavLinks: NavItem[] = [
  { title: "Boutique", href: "/shop" },
  { title: "Launcher", href: "/launcher" },
  { title: "Jeux & TCG", href: "/jeux" },
  { title: "Discord", href: siteConfig.discordUrl, external: true },
];

export const footerLegalLinks: NavItem[] = [
  { title: "CGV / CGU", href: "/cgu", iconName: "FileText" },
  { title: "Confidentialité", href: "/privacy", iconName: "ShieldAlert" },
  { title: "Support", href: "/tickets", iconName: "Disc" },
];

export const dockNavLinks: NavItem[] = [
  { title: "Accueil", href: "/", iconName: "Home" },
  { title: "Boutique", href: "/shop", iconName: "ShoppingCart" },
  { title: "Jeux", href: "/jeux", iconName: "Dice" },
  { title: "Launcher", href: "/launcher", iconName: "DeviceGamepad2" },
  { title: "Communauté", href: "/videastes", iconName: "Users" },
];
