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
  title: "PARANOIA | Serveur SMP Minecraft Privé",
  description: "Rejoignez l'élite sur PARANOIA. Serveur Survie Multijoueur Minecraft Privé. Forum, Tier List, Trading Cards et Candidatures.",
};

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
          <NavigationManager>
            {children}
          </NavigationManager>
        </Providers>
      </body>
    </html>
  );
}