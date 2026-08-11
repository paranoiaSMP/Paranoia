import React from 'react';
import { Layers, Sparkles, Users, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    title: "Système de Boosters",
    desc: "Ouvrez des boosters et collectionnez des cartes aux raretés variées.",
    icon: Layers,
    bgVar: "var(--feature-purple-bg)",
    textVar: "var(--feature-purple-text)",
    borderVar: "var(--feature-purple-border)",
  },
  {
    title: "Plugin Custom ",
    desc: "Le serveur est doté d'un plugin unique avec de nouvelle mecaniques de jeu et des fonctionnalités inédites.",
    icon: Sparkles,
    bgVar: "var(--feature-amber-bg)",
    textVar: "var(--feature-amber-text)",
    borderVar: "var(--feature-amber-border)",
  },
  {
    title: "Communauté Active",
    desc: "Faites-vous des amis, participez à des événements hebdomadaires et faites vous un nom dans le serveur.",
    icon: Users,
    bgVar: "var(--feature-emerald-bg)",
    textVar: "var(--feature-emerald-text)",
    borderVar: "var(--feature-emerald-border)",
  }
];

export default function FeaturesSection() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 mt-10">
      <div className="text-center mb-12">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-4xl md:text-5xl font-outfit font-black mb-4 text-balance leading-tight"
          style={{ color: 'var(--text-color)' }}
        >
          Pourquoi rejoindre <span className="text-gradient">Paranoia</span> ?
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto font-inter text-lg text-balance px-2"
          style={{ color: 'var(--nav-item-color)' }}
        >
          Une expérience multijoueur inédite allant du SMP avec un Plugin Custom à la mécaniques de collection de cartes.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: i * 0.2 }}
            className="group relative cursor-pointer"
          >
            {/* Chunky shadow base for physical depth */}
            <div className="absolute inset-0 rounded-xl translate-y-2 translate-x-1 sm:translate-y-3 sm:translate-x-2 transition-transform duration-300 group-hover:translate-y-4 group-hover:translate-x-3" style={{ backgroundColor: 'var(--card-border)' }}></div>
            
            <div 
              className="relative h-full rounded-xl p-6 sm:p-8 flex flex-col justify-between border-2 sm:border-4 transition-all duration-300 group-hover:-translate-y-2 group-active:translate-y-1"
              style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--card-border)' }}
            >
              <div className="relative z-10">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center mb-5 sm:mb-6 border-2"
                  style={{ backgroundColor: feature.bgVar, borderColor: feature.borderVar, color: feature.textVar }}
                >
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold font-outfit mb-3 sm:mb-4" style={{ color: 'var(--text-color)' }}>
                  {feature.title}
                </h3>
                
                <p className="text-sm sm:text-base leading-relaxed font-inter" style={{ color: 'var(--nav-item-color)' }}>
                  {feature.desc}
                </p>
              </div>
              
              <div 
                className="mt-6 sm:mt-8 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between border-2 transition-all duration-300 group-hover:scale-[1.02] shadow-sm"
                style={{ 
                  backgroundColor: feature.bgVar, 
                  borderColor: feature.borderVar,
                  color: feature.textVar 
                }}
              >
                <span>En savoir plus</span>
                <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
