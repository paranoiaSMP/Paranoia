import HeroSection from "@/components/home/HeroSection";
import TcgPreviewSection from "@/components/home/TcgPreviewSection";
import GamesPreviewSection from "@/components/home/GamesPreviewSection";
import CommunitySection from "@/components/home/CommunitySection";

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      <HeroSection />
      <TcgPreviewSection />
      <GamesPreviewSection />
      <CommunitySection />
    </div>
  );
}
