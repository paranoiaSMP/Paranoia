"use client";

import React from 'react';
import HeroSection from '@/features/home/components/HeroSection';
import FeaturesSection from '@/features/home/components/FeaturesSection';
import CardsSystemSection from '@/features/home/components/CardsSystemSection';
import CTASection from '@/features/home/components/CTASection';
import BackgroundEffects from '@/features/home/components/BackgroundEffects';

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>
      <BackgroundEffects />
      
      <div className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <CardsSystemSection />
        <CTASection />
      </div>
    </div>
  );
}
