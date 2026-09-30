"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";

export default function NavigationManager({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-grow pt-16 pb-12">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
