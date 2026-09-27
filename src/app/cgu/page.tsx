import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export const metadata = {
  title: "Conditions Générales d'Utilisation — Paranoia SMP",
  description: "Conditions Générales d'Utilisation et de Vente relatives aux services et à la boutique de Paranoia SMP.",
};

export default function CguPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour à l'accueil
      </Link>

      <div className="mb-8">
        <span className="font-mono text-xs uppercase text-purple-400 font-bold tracking-wider flex items-center gap-1.5 mb-2">
          <FileText className="w-3.5 h-3.5" /> Mentions légales
        </span>
        <h1 className="text-3xl sm:text-4xl font-black font-outfit text-white tracking-tight">
          Conditions Générales d'Utilisation & de Vente
        </h1>
        <p className="text-xs text-zinc-500 mt-2">Dernière mise à jour : 18 septembre 2026</p>
      </div>

      <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8 text-zinc-300 text-sm leading-relaxed shadow-xl">
        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">1.</span> Objet & Acceptation
          </h2>
          <p>
            Les présentes Conditions Générales d'Utilisation et de Vente (ci-après « CGU / CGV ») régissent l'accès et l'utilisation des services proposés par Paranoia SMP, incluant le serveur Minecraft, le site internet, la boutique en ligne et le launcher dédié.
          </p>
          <p>
            En accédant au serveur ou au site internet, vous reconnaissez avoir pris connaissance des présentes conditions et les accepter sans réserve.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">2.</span> Accès aux Services & Comptes
          </h2>
          <p>
            L'accès aux fonctionnalités du serveur Minecraft requiert un compte Minecraft officiel conformément aux conditions d'utilisation de Mojang Studios. L'accès à l'espace membre et à la boutique s'effectue via authentification Discord sécurisée.
          </p>
          <p>
            L'utilisateur est seul responsable de la sécurité et de la confidentialité de ses identifiants de connexion. Tout acte commis depuis son compte est réputé avoir été accompli par lui-même.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">3.</span> Boutique, Monnaie Virtuelle & Boosters TCG
          </h2>
          <p>
            Les achats effectués sur la boutique de Paranoia SMP permettent d'acquérir des articles immatériels utilisables exclusivement sur nos serveurs (pièces virtuelles, packs de cartes à collectionner TCG, cosmétiques virtuels).
          </p>
          <p>
            Ces articles n'ont aucune valeur monétaire dans le monde réel, ne sont ni transmissibles, ni échangeables contre de l'argent réel.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">4.</span> Droit de Rétractation & Remboursements
          </h2>
          <p>
            Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de contenus numériques sans support matériel dont l'exécution a commencé après accord préalable exprès du consommateur.
          </p>
          <p>
            Par conséquent, tout achat de monnaie virtuelle ou de contenu débloqué immédiatement est ferme, définitif et non remboursable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">5.</span> Règles de Conduite & Sanctions
          </h2>
          <p>
            Tout comportement abusif, tentative de triche (mods interdits, x-ray, automatisation non autorisée), exploitation de failles (*glitches*), harcèlement ou usurpation d'identité entraîne des sanctions immédiates pouvant aller jusqu'au bannissement définitif du serveur et des services associés sans indemnité.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">6.</span> Propriété Intellectuelle & Non-affiliation Mojang
          </h2>
          <p>
            Paranoia SMP est un serveur indépendant développé par des passionnés. Paranoia SMP n'est en aucun cas affilié, associé, sponsorisé ou approuvé par Mojang AB, Microsoft Corporation ou leurs filiales respectives. Minecraft est une marque déposée de Mojang AB.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">7.</span> Support & Contact
          </h2>
          <p>
            Pour toute demande relative aux présentes conditions ou à une commande, notre équipe d'assistance est joignable via la section Support / Tickets du site ou directement sur notre serveur Discord officiel.
          </p>
        </section>
      </div>
    </div>
  );
}
