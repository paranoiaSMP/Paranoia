"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import HeroSection from '@/features/home/components/HeroSection';
import BackgroundEffects from '@/features/home/components/BackgroundEffects';

const FeaturesSection = dynamic(() => import('@/features/home/components/FeaturesSection'));
const CardsSystemSection = dynamic(() => import('@/features/home/components/CardsSystemSection'));
const CTASection = dynamic(() => import('@/features/home/components/CTASection'));

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden">
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
