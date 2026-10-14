import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavigationManager from "@/components/layout/NavigationManager";
import SmoothScroll from "@/components/layout/SmoothScroll";
import Intro from "@/components/layout/Intro";
import { INTRO_SCRIPT } from "@/lib/intro";
import { eventScript } from "@/lib/events";
import SeasonalLayer from "@/components/layout/SeasonalLayer";

import { Providers } from "@/components/providers";

import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter-var", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://paranoiastudio.fr'),
  title: {
    default: "Paranoia Studio",
    template: "%s | Paranoia Studio"
  },
  description: "La communauté Paranoia Studio : cartes à collectionner, casino en ParaCoins et Paranoia Client, le launcher Minecraft du studio.",
  keywords: ["Paranoia Studio", "Minecraft", "Trading Cards", "Cartes à collectionner", "Casino", "Launcher", "Paranoia Client"],
  authors: [{ name: "Paranoia Studio" }],
  creator: "Paranoia Studio",
  publisher: "Paranoia Studio",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Paranoia Studio",
    description: "La communauté Paranoia Studio : cartes à collectionner, casino en ParaCoins et Paranoia Client, le launcher Minecraft du studio.",
    url: '/',
    siteName: 'Paranoia Studio',
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Paranoia Studio" }],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paranoia Studio',
    description: 'La communauté Paranoia Studio : cartes à collectionner, casino en ParaCoins et Paranoia Client, le launcher Minecraft du studio.',
    images: ["/opengraph-image"],
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

import { prisma } from "@/lib/db";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/seo";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let discordUrlSetting = null;
  let eventMode = "auto";
  try {
    discordUrlSetting = await prisma.systemSetting.findUnique({ where: { key: "discord_url" } });
    eventMode = (await prisma.systemSetting.findUnique({ where: { key: "event" } }))?.value || "auto";
  } catch (e) {
    console.warn("Could not fetch discord_url setting during build:", e);
  }
  const discordUrl = discordUrlSetting?.value || siteConfig.discordUrl;

  return (
    <html lang="fr" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: eventScript(eventMode) }} />
      </head>
      <body className="flex flex-col min-h-screen bg-black text-zinc-50">
        <Intro />
        <SeasonalLayer />
        <SettingsProvider discordUrl={discordUrl}>
          <Providers>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                {
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: "Paranoia Studio",
                  url: SITE_URL,
                  sameAs: [discordUrl],
                },
                {
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: "Paranoia Studio",
                  url: SITE_URL,
                  inLanguage: "fr-FR",
                },
              ])
            }}
          />
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: '',
              duration: 4000,
              style: {
                background: '#0b0b0d',
                color: '#fafafa',
                border: '1px solid #27272a',
                borderRadius: '6px',
                fontWeight: '500',
                padding: '14px 18px',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-accent-purple-soft)',
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
          
          <NavigationManager>
            <SmoothScroll>
              {children}
            </SmoothScroll>
          </NavigationManager>
          </Providers>
        </SettingsProvider>
      </body>
    </html>
  );
}
