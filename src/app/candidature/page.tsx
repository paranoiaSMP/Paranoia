"use client";

import { useState } from "react";
import { Check, Send, ChevronRight, ChevronLeft, Shield } from "lucide-react";
import toast from 'react-hot-toast';

export default function CandidaturePage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    minecraftName: "",
    age: "",
    motivation: "",
    experience: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      toast.success("Candidature envoyée avec succès ! (Simulation)");
    }
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 pt-24 pb-12 overflow-hidden">
      {/* Background Noise & Grid */}
      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay pointer-events-none"></div>
      
      <div className="text-center mb-8 relative z-10 w-full max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-outfit font-black text-[var(--text-color)] mb-3 tracking-tight">
          Rejoindre <span className="text-[var(--logo-end)] drop-shadow-[0_0_15px_rgba(179,102,255,0.3)]">PARANOIA</span>
        </h1>
        <p className="text-[var(--nav-item-color)] font-medium text-base max-w-xl mx-auto mb-6">
          Prêt à survivre ? Remplis ce formulaire pour demander ton accès à la whitelist du serveur.
        </p>
        
        {/* Segmented Role Selector Tabs */}
        <div className="inline-flex p-1.5 rounded-2xl border-2 gap-2 bg-[var(--navbar-bg)] shadow-md" style={{ borderColor: 'var(--card-border)' }}>
          <span className="px-6 py-2.5 rounded-xl font-outfit font-bold text-sm bg-[var(--color-accent-purple,#9d0df2)] text-white shadow-sm flex items-center gap-2">
            <span>🎮</span> Candidature Joueur
          </span>
          <a href="/candidature/moderateur" className="px-6 py-2.5 rounded-xl font-outfit font-bold text-sm text-[var(--nav-item-color)] hover:text-[var(--text-color)] hover:bg-white/5 transition-all flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" /> Devenir Modérateur
          </a>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="relative border-4 rounded-2xl shadow-2xl p-8 md:p-12" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          {/* Top Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--card-border)] overflow-hidden rounded-t-xl">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%`, backgroundColor: 'var(--logo-end)' }}
            ></div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            {step === 1 && (
              <div className="space-y-6 animate-slide-up">
                <h2 className="text-2xl font-outfit font-black mb-8 flex items-center gap-3 text-[var(--text-color)]">
                  <span className="flex items-center justify-center w-8 h-8 rounded border-2 text-sm bg-[var(--logo-end)] border-[var(--logo-end)] text-white">1</span>
                  Qui es-tu ?
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold uppercase tracking-wider text-[var(--nav-item-color)]">Pseudo Minecraft</label>
                    <input
                      type="text"
                      required
                      value={formData.minecraftName}
                      onChange={e => setFormData({...formData, minecraftName: e.target.value})}
                      className="w-full bg-black/10 border-2 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--logo-end)] transition-colors text-[var(--text-color)] font-medium"
                      style={{ borderColor: formData.minecraftName ? 'var(--logo-end)' : 'var(--card-border)' }}
                      placeholder="Ton pseudo in-game"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold uppercase tracking-wider text-[var(--nav-item-color)]">Âge</label>
                    <input
                      type="number"
                      required min="13" max="99"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      className="w-full bg-black/10 border-2 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--logo-end)] transition-colors text-[var(--text-color)] font-medium"
                      style={{ borderColor: formData.age ? 'var(--logo-end)' : 'var(--card-border)' }}
                      placeholder="Ton âge (ex : 18)"
                    />
                  </div>
                </div>

                <div className="pt-8 flex justify-end">
                  <button type="button" onClick={() => setStep(2)} className="group relative inline-block">
                    <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150 bg-[var(--logo-end)] opacity-50 border border-[var(--logo-end)]"></div>
                    <div className="relative px-8 py-3 rounded-xl font-bold text-sm border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5 flex items-center justify-center gap-2 border-[var(--logo-end)] text-[var(--text-color)]" style={{ background: 'var(--surface-bg)' }}>
                      Suivant <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-slide-up">
                <h2 className="text-2xl font-outfit font-black mb-8 flex items-center gap-3 text-[var(--text-color)]">
                  <span className="flex items-center justify-center w-8 h-8 rounded border-2 text-sm bg-[var(--logo-end)] border-[var(--logo-end)] text-white">2</span>
                  Ton Profil de Survie
                </h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold uppercase tracking-wider text-[var(--nav-item-color)]">Tes motivations</label>
                    <textarea
                      required minLength={50}
                      value={formData.motivation}
                      onChange={e => setFormData({...formData, motivation: e.target.value})}
                      className="w-full h-32 bg-black/10 border-2 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--logo-end)] transition-colors text-[var(--text-color)] font-medium resize-none"
                      style={{ borderColor: formData.motivation ? 'var(--logo-end)' : 'var(--card-border)' }}
                      placeholder="Pourquoi veux-tu rejoindre PARANOIA spécifiquement ?"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold uppercase tracking-wider text-[var(--nav-item-color)]">Ton expérience</label>
                    <textarea
                      required minLength={20}
                      value={formData.experience}
                      onChange={e => setFormData({...formData, experience: e.target.value})}
                      className="w-full h-32 bg-black/10 border-2 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--logo-end)] transition-colors text-[var(--text-color)] font-medium resize-none"
                      style={{ borderColor: formData.experience ? 'var(--logo-end)' : 'var(--card-border)' }}
                      placeholder="Build, Redstone, PvP, Farming... Dis-nous tout !"
                    />
                  </div>
                </div>

                <div className="pt-8 flex justify-between items-center">
                  <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 text-sm font-bold text-[var(--nav-item-color)] hover:text-[var(--text-color)] transition-colors">
                    <ChevronLeft className="w-5 h-5" /> Retour
                  </button>
                  
                  <button type="button" onClick={() => setStep(3)} className="group relative inline-block">
                    <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150 bg-[var(--logo-end)] opacity-50 border border-[var(--logo-end)]"></div>
                    <div className="relative px-8 py-3 rounded-xl font-bold text-sm border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5 flex items-center justify-center gap-2 border-[var(--logo-end)] text-[var(--text-color)]" style={{ background: 'var(--surface-bg)' }}>
                      Suivant <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-slide-up">
                <h2 className="text-2xl font-outfit font-black mb-8 flex items-center gap-3 text-[var(--text-color)]">
                  <span className="flex items-center justify-center w-8 h-8 rounded border-2 text-sm bg-[var(--logo-end)] border-[var(--logo-end)] text-white">3</span>
                  Dernière vérification
                </h2>
                
                <div className="border-2 rounded-xl p-6 space-y-4" style={{ background: 'var(--surface-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--nav-item-color)]">Joueur:</span>
                    <span className="font-outfit font-black text-xl text-[var(--logo-end)]">{formData.minecraftName}</span>
                    <span className="text-sm font-medium text-[var(--nav-item-color)]">({formData.age} ans)</span>
                  </div>
                  <div className="border-t-2 pt-4" style={{ borderColor: 'var(--card-border)' }}>
                    <span className="block text-sm font-bold uppercase tracking-wider text-[var(--nav-item-color)] mb-2">Motivations</span>
                    <p className="text-sm text-[var(--text-color)] font-medium leading-relaxed">{formData.motivation}</p>
                  </div>
                </div>

                <label className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors hover:bg-black/5 mt-6" style={{ borderColor: 'var(--card-border)' }}>
                  <input type="checkbox" required className="mt-1 w-5 h-5 rounded" style={{ accentColor: 'var(--logo-end)' }} />
                  <span className="text-sm font-medium text-[var(--text-color)] leading-relaxed">
                    Je jure solennellement que ces informations sont exactes. J'ai lu et j'accepte les règles du serveur PARANOIA. Je suis prêt à survivre.
                  </span>
                </label>

                <div className="pt-8 flex justify-between items-center">
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 text-sm font-bold text-[var(--nav-item-color)] hover:text-[var(--text-color)] transition-colors">
                    <ChevronLeft className="w-5 h-5" /> Retour
                  </button>
                  
                  <button type="submit" className="group relative inline-block">
                    <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150 bg-[var(--logo-end)] opacity-50 border border-[var(--logo-end)]"></div>
                    <div className="relative px-8 py-3 rounded-xl font-bold text-sm border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5 flex items-center justify-center gap-2 bg-[var(--logo-end)] border-[var(--logo-end)] text-white">
                      <Send className="w-4 h-4" />
                      Envoyer
                    </div>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
