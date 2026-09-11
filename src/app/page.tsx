"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import HeroSection from '@/features/home/components/HeroSection';
import BackgroundEffects from '@/features/home/components/BackgroundEffects';

const ServerOverviewSection = dynamic(() => import('@/features/home/components/ServerOverviewSection'));
const LauncherSection = dynamic(() => import('@/features/home/components/LauncherSection'));

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundEffects />

      <div className="relative z-10">
        <HeroSection />
        <ServerOverviewSection />
        <LauncherSection />
      </div>
    </div>
  );
}
