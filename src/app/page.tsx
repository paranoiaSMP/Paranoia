"use client";

import React, { useEffect, useState } from 'react';
import HeroSection from '@/features/home/components/HeroSection';
import FeaturesSection from '@/features/home/components/FeaturesSection';
import CardsSystemSection from '@/features/home/components/CardsSystemSection';
import CTASection from '@/features/home/components/CTASection';
import BackgroundEffects from '@/features/home/components/BackgroundEffects';

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Subtle organic noise overlay + Floating effects for the entire page */}
      <div className="fixed inset-0 bg-noise opacity-30 pointer-events-none mix-blend-overlay z-0"></div>
      <BackgroundEffects />
      
      {/* Page Content */}
      <div className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <CardsSystemSection />
        <CTASection />
      </div>
    </div>
  );
}
