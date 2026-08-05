"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";

export default function NavigationManager({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";

  if (isComingSoon) {
    return (
        <main className="flex-grow min-h-screen overflow-hidden">
            {children}
        </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-32 px-6 md:px-10 lg:px-16">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
