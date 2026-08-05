import React from 'react';

/**
 * <BoldGradient>
 * Un texte en gras avec un dégradé de couleurs utilisant les couleurs du thème.
 * Par défaut, le dégradé va du rouge accentué au violet accentué du thème.
 */
export function BoldGradient({ 
  children, 
  from = "from-[var(--color-accent-red)]", 
  to = "to-[var(--color-accent-purple)]",
  className = ""
}: { 
  children: React.ReactNode, 
  from?: string, 
  to?: string,
  className?: string
}) {
  return (
    <span className={`font-bold text-transparent bg-clip-text bg-gradient-to-r ${from} ${to} ${className}`}>
      {children}
    </span>
  );
}

/**
 * <GlowText>
 * Un texte qui brille en utilisant la couleur du thème (violet par défaut).
 */
export function GlowText({ 
  children, 
  color = "var(--color-accent-purple)", // Couleur du thème par défaut
  className = ""
}: { 
  children: React.ReactNode, 
  color?: string,
  className?: string
}) {
  return (
    <span 
      className={`font-semibold ${className}`} 
      style={{ textShadow: `0 0 10px ${color}, 0 0 20px ${color}` }}
    >
      {children}
    </span>
  );
}

/**
 * <EasyBadge>
 * Une petite étiquette stylée reprenant les couleurs du thème (rouge et violet).
 */
export function EasyBadge({ 
  children, 
  color = "bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)] border-[var(--color-accent-purple)]/50",
  className = ""
}: { 
  children: React.ReactNode, 
  color?: string,
  className?: string
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color} ${className}`}>
      {children}
    </span>
  );
}

/**
 * <EasyBox>
 * Une boîte avec le style Paranoia (fond sombre, bordure, léger effet de verre).
 */
export function EasyBox({ 
  children, 
  className = ""
}: { 
  children: React.ReactNode, 
  className?: string
}) {
  return (
    <div className={`bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-6 shadow-xl ${className}`}>
      {children}
    </div>
  );
}
