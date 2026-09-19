import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import NavigationManager from "@/components/layout/NavigationManager";

import { Providers } from "@/components/providers";

import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://votre-domaine.fr'),
  title: {
    default: "PARANOIA SMP | Serveur Survie Privé",
    template: "%s | PARANOIA SMP"
  },
  description: "Rejoignez l'élite sur PARANOIA. Serveur Survie Multijoueur Minecraft Privé. Forum, Tier List, Trading Cards et Candidatures.",
  keywords: ["Minecraft", "SMP", "Serveur privé", "Survie", "Multi-joueur", "Paranoia", "Trading Cards", "TCG"],
  openGraph: {
    title: "PARANOIA SMP",
    description: "Le Serveur Survie Multijoueur Minecraft Privé par excellence.",
    url: '/',
    siteName: 'Paranoia SMP',
    images: [
      {
        url: '/Paranoia_logo.png', 
        width: 800,
        height: 600,
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import SplashScreen from "@/components/layout/SplashScreen";
import { prisma } from "@/lib/db";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { siteConfig } from "@/config/site";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let discordUrlSetting = null;
  try {
    discordUrlSetting = await prisma.systemSetting.findUnique({ where: { key: "discord_url" } });
  } catch (e) {
    // Database might be unavailable during static build time (ECONNREFUSED)
    console.warn("Could not fetch discord_url setting during build:", e);
  }
  const discordUrl = discordUrlSetting?.value || siteConfig.discordUrl;

  return (
    <html lang="fr">
      <body className={`${inter.variable} ${outfit.variable} flex flex-col min-h-screen bg-[var(--background)]`}>
        <SettingsProvider discordUrl={discordUrl}>
          <Providers>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: '',
              duration: 4000,
              style: {
                background: 'rgba(22, 22, 31, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6), 0 0 15px rgba(168, 85, 247, 0.15)',
                borderRadius: '12px',
                fontWeight: '600',
                padding: '16px 20px',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-accent-purple)',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--color-accent-red)',
                  secondary: '#fff',
                },
              },
            }}
          />
          <SplashScreen>
            <NavigationManager>
              {children}
            </NavigationManager>
          </SplashScreen>
          </Providers>
        </SettingsProvider>
      </body>
    </html>
  );
}