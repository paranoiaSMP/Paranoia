import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import NavigationManager from "@/components/layout/NavigationManager";

import { Providers } from "@/components/providers";

import { Toaster } from 'react-hot-toast';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ComingSoon from "@/components/layout/ComingSoon";

export const dynamic = "force-dynamic";

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
        url: '/Paranoia_logo.png', // Fallback to the logo for now
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check maintenance mode
  let isMaintenance = false;
  let isAdmin = false;

  try {
    const session = await getServerSession(authOptions);
    isAdmin = (session?.user as any)?.role === "ADMIN";
    
    const maintenanceSetting = await prisma.systemSetting.findUnique({ where: { key: "maintenance_mode" } });
    isMaintenance = maintenanceSetting?.value === "true";
  } catch (e) {
    console.error("Failed to fetch maintenance mode state:", e);
  }

  return (
    <html lang="fr">
      <body className={`${inter.variable} ${outfit.variable} flex flex-col min-h-screen bg-[var(--background)]`}>
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
      </body>
    </html>
  );
}