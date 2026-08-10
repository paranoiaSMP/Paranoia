import React from 'react';

export default function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      
      {/* Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-[0.05]" style={{ backgroundColor: 'var(--logo-end)' }}></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full blur-3xl opacity-[0.03]" style={{ backgroundColor: 'var(--feature-emerald-bg)' }}></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full blur-3xl opacity-[0.04]" style={{ backgroundColor: 'var(--feature-amber-bg)' }}></div>

      {/* Grid Pattern Overlay for depth */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ 
        backgroundImage: 'linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(90deg, var(--card-border) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>
      
    </div>
  );
}
