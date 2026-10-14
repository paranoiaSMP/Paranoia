import HeroSection from "@/components/home/HeroSection";
import BoostersSection from "@/components/home/BoostersSection";
import UniversSection from "@/components/home/UniversSection";
import CommunitySection from "@/components/home/CommunitySection";
import Marquee from "@/components/motion/Marquee";
import { pageMeta } from "@/lib/seo";

export const metadata = {
  ...pageMeta({
    title: "Paranoia Studio",
    description: "La communauté Paranoia Studio : cartes à collectionner, casino en ParaCoins et Paranoia Client, le launcher Minecraft du studio.",
    path: "/",
  }),
  title: { absolute: "Paranoia Studio" },
};

const UNIVERS = ["TCG", "Casino", "Launcher", "SMP"];

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Marquee
        items={UNIVERS}
        className="border-b border-zinc-900 py-6 text-3xl font-bold uppercase tracking-[-0.02em] text-white md:text-5xl"
      />
      <BoostersSection />
      <UniversSection />
      <CommunitySection />
    </>
  );
}
