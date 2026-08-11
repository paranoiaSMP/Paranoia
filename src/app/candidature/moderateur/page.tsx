"use client";

import { useState } from "react";
import { Check, Send, ShieldCheck, ChevronRight } from "lucide-react";
import toast from 'react-hot-toast';

export default function ModCandidaturePage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    discordName: "",
    minecraftName: "",
    platform: "Minecraft",
    experience: "",
    motivation: "",
    additions: "",
    other: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/candidature/moderateur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi");
      
      setIsSuccess(true);
      toast.success("Candidature envoyée avec succès !");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-slide-up text-center">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
          <Check className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--text-color)' }}>Candidature Reçue</h1>
        <p className="mb-8 max-w-lg mx-auto" style={{ color: 'var(--muted-text)' }}>
          Merci pour ton intérêt ! Le staff étudiera ta candidature avec attention. Nous te recontacterons sur Discord si ton profil est retenu.
        </p>
        <button onClick={() => window.location.href = '/'} className="btn-primary">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 animate-slide-up">
      <div className="text-center mb-8">
        <ShieldCheck className="w-16 h-16 text-indigo-500 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
        <h1 className="text-2xl md:text-5xl font-outfit font-black mb-3" style={{ color: 'var(--text-color)', textShadow: '0 0 30px rgba(99,102,241,0.5)' }}>
          Recrutement <span className="text-indigo-400">Staff</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-base max-w-xl mx-auto mb-6">
          Vous souhaitez aider à modérer PARANOIA ? Remplissez ce formulaire avec le plus de détails possible.
        </p>

        {/* Segmented Role Selector Tabs */}
        <div className="inline-flex p-1.5 rounded-2xl border-2 gap-2 bg-[var(--navbar-bg)] shadow-md" style={{ borderColor: 'var(--card-border)' }}>
          <a href="/candidature" className="px-6 py-2.5 rounded-xl font-outfit font-bold text-sm text-[var(--nav-item-color)] hover:text-[var(--text-color)] hover:bg-white/5 transition-all flex items-center gap-2">
            <span>🎮</span> Candidature Joueur
          </a>
          <span className="px-6 py-2.5 rounded-xl font-outfit font-bold text-sm bg-indigo-600 text-white shadow-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-white" /> Candidature Modérateur
          </span>
        </div>
      </div>

      <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl border p-5 md:p-12 shadow-2xl" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/20">
          <div 
            className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] transition-all duration-700 ease-out relative" 
            style={{ width: `${(step / 3) * 100}%` }}
          >
            <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/50 blur-sm"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          {step === 1 && (
            <div className="space-y-8 animate-slide-up">
              <h2 className="text-3xl font-outfit font-black mb-8 flex items-center gap-4" style={{ color: 'var(--text-color)' }}>
                <div className="relative flex items-center justify-center w-10 h-10">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 blur-md"></div>
                  <span className="relative w-full h-full rounded-full border border-indigo-500 bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg shadow-lg">1</span>
                </div>
                Informations Personnelles
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="relative group">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-text)' }}>Pseudo Discord *</label>
                  <input
                    type="text"
                    required
                    value={formData.discordName}
                    onChange={e => setFormData({...formData, discordName: e.target.value})}
                    className="w-full bg-black/10 border-b-2 rounded-t-xl px-5 py-4 focus:outline-none transition-all duration-300"
                    style={{ color: 'var(--text-color)', borderColor: 'var(--card-border)', borderBottomColor: formData.discordName ? '#6366f1' : 'var(--card-border)' }}
                    placeholder="Ex: utilisateur#1234"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-500 ease-out group-focus-within:w-full"></div>
                </div>
                <div className="relative group">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-text)' }}>Pseudo Minecraft *</label>
                  <input
                    type="text"
                    required
                    value={formData.minecraftName}
                    onChange={e => setFormData({...formData, minecraftName: e.target.value})}
                    className="w-full bg-black/10 border-b-2 rounded-t-xl px-5 py-4 focus:outline-none transition-all duration-300"
                    style={{ color: 'var(--text-color)', borderColor: 'var(--card-border)', borderBottomColor: formData.minecraftName ? '#6366f1' : 'var(--card-border)' }}
                    placeholder="Ex: Notch"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-500 ease-out group-focus-within:w-full"></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-color)' }}>Où voulez vous modérer ? *</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.platform === 'Minecraft' ? 'border-indigo-500' : 'border-gray-500 group-hover:border-gray-400'}`}>
                      {formData.platform === 'Minecraft' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </div>
                    <input
                      type="radio"
                      name="platform"
                      value="Minecraft"
                      checked={formData.platform === 'Minecraft'}
                      onChange={e => setFormData({...formData, platform: e.target.value})}
                      className="hidden"
                    />
                    <span style={{ color: 'var(--text-color)' }}>Minecraft</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.platform === 'Discord' ? 'border-indigo-500' : 'border-gray-500 group-hover:border-gray-400'}`}>
                      {formData.platform === 'Discord' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </div>
                    <input
                      type="radio"
                      name="platform"
                      value="Discord"
                      checked={formData.platform === 'Discord'}
                      onChange={e => setFormData({...formData, platform: e.target.value})}
                      className="hidden"
                    />
                    <span style={{ color: 'var(--text-color)' }}>Discord</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-slide-up">
              <h2 className="text-3xl font-outfit font-black mb-8 flex items-center gap-4" style={{ color: 'var(--text-color)' }}>
                <div className="relative flex items-center justify-center w-10 h-10">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 blur-md"></div>
                  <span className="relative w-full h-full rounded-full border border-indigo-500 bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg shadow-lg">2</span>
                </div>
                Expérience & Motivations
              </h2>

              <div className="space-y-8">
                <div className="relative group">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-text)' }}>Avez vous déjà modéré dans un serveur (ou plusieurs) ? Si oui , lequel/lesquels ? *</label>
                  <textarea
                    required minLength={10}
                    value={formData.experience}
                    onChange={e => setFormData({...formData, experience: e.target.value})}
                    className="w-full h-32 bg-black/10 border-b-2 rounded-t-xl px-5 py-4 focus:outline-none transition-all duration-300 resize-none"
                    style={{ color: 'var(--text-color)', borderColor: 'var(--card-border)', borderBottomColor: formData.experience ? '#6366f1' : 'var(--card-border)' }}
                    placeholder="Votre réponse..."
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-500 ease-out group-focus-within:w-full"></div>
                </div>

                <div className="relative group">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-text)' }}>Pour quelles raisons voulez vous faire partie de la modération? *</label>
                  <textarea
                    required minLength={20}
                    value={formData.motivation}
                    onChange={e => setFormData({...formData, motivation: e.target.value})}
                    className="w-full h-40 bg-black/10 border-b-2 rounded-t-xl px-5 py-4 focus:outline-none transition-all duration-300 resize-none"
                    style={{ color: 'var(--text-color)', borderColor: 'var(--card-border)', borderBottomColor: formData.motivation ? '#6366f1' : 'var(--card-border)' }}
                    placeholder="Votre réponse..."
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-500 ease-out group-focus-within:w-full"></div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-slide-up">
              <h2 className="text-3xl font-outfit font-black mb-8 flex items-center gap-4" style={{ color: 'var(--text-color)' }}>
                <div className="relative flex items-center justify-center w-10 h-10">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 blur-md"></div>
                  <span className="relative w-full h-full rounded-full border border-indigo-500 bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg shadow-lg">3</span>
                </div>
                Vos Atouts
              </h2>

              <div className="space-y-8">
                <div className="relative group">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-text)' }}>Qu'est ce que vous pourrez ajouter au serveur? *</label>
                  <textarea
                    required minLength={20}
                    value={formData.additions}
                    onChange={e => setFormData({...formData, additions: e.target.value})}
                    className="w-full h-40 bg-black/10 border-b-2 rounded-t-xl px-5 py-4 focus:outline-none transition-all duration-300 resize-none"
                    style={{ color: 'var(--text-color)', borderColor: 'var(--card-border)', borderBottomColor: formData.additions ? '#6366f1' : 'var(--card-border)' }}
                    placeholder="Votre réponse..."
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-500 ease-out group-focus-within:w-full"></div>
                </div>

                <div className="relative group">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-text)' }}>Quelque chose d'autre à ajouter ?</label>
                  <textarea
                    value={formData.other}
                    onChange={e => setFormData({...formData, other: e.target.value})}
                    className="w-full h-24 bg-black/10 border-b-2 rounded-t-xl px-5 py-4 focus:outline-none transition-all duration-300 resize-none"
                    style={{ color: 'var(--text-color)', borderColor: 'var(--card-border)', borderBottomColor: formData.other ? '#6366f1' : 'var(--card-border)' }}
                    placeholder="Votre réponse (facultatif)..."
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-500 ease-out group-focus-within:w-full"></div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-between items-center pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 font-medium opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-color)' }}
              >
                Retour
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="relative overflow-hidden px-8 py-4 rounded-xl font-bold flex items-center gap-3 group transition-all bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              {isSubmitting ? (
                <span className="relative z-10 flex items-center gap-2"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></span>
              ) : step < 3 ? (
                <span className="relative z-10 flex items-center gap-2">Étape suivante <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              ) : (
                <span className="relative z-10 flex items-center gap-2">Envoyer la candidature <Send className="w-5 h-5 group-hover:scale-110 transition-transform" /></span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
