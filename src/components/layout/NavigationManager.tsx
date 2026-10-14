"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import ConsoleEasterEgg from "@/components/common/ConsoleEasterEgg";
import { usePathname } from "next/navigation";

export default function NavigationManager({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/ferme") return <main className="flex-grow">{children}</main>;
  return (
    <>
      <ConsoleEasterEgg />
      <Navbar />
      <main className="flex-grow pt-16">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
