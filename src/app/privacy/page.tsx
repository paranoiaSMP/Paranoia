import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

export const metadata = {
  title: "Politique de Confidentialité — Paranoia SMP",
  description: "Politique de traitement et de protection des données personnelles de Paranoia SMP conformément au RGPD.",
};

export default function PrivacyPage() {
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
          <ShieldCheck className="w-3.5 h-3.5" /> Protection des données
        </span>
        <h1 className="text-3xl sm:text-4xl font-black font-outfit text-white tracking-tight">
          Politique de Confidentialité
        </h1>
        <p className="text-xs text-zinc-500 mt-2">Dernière mise à jour : 18 septembre 2026</p>
      </div>

      <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8 text-zinc-300 text-sm leading-relaxed shadow-xl">
        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">1.</span> Responsable du Traitement
          </h2>
          <p>
            L'équipe d'administration de Paranoia SMP est responsable du traitement des données à caractère personnel collectées auprès des utilisateurs du site internet et des services de jeu.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">2.</span> Données Collectées
          </h2>
          <p>Dans le cadre de l'utilisation de nos plateformes, nous sommes amenés à traiter les données suivantes :</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 ml-2">
            <li>Identifiant Discord, nom d'utilisateur, avatar et adresse email associés (via OAuth 2.0).</li>
            <li>Pseudonyme Minecraft et UUID (identifiant unique de joueur).</li>
            <li>Adresse IP et horodatage des connexions (pour des impératifs de sécurité et de modération).</li>
            <li>Historique des transactions et inventaire virtuel sur le serveur.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">3.</span> Finalités du Traitement
          </h2>
          <p>Les données collectées sont utilisées pour :</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 ml-2">
            <li>Permettre l'authentification et l'accès sécurisé à l'espace utilisateur.</li>
            <li>Gérer l'attribution des pièces, boosters et récompenses achetés en boutique.</li>
            <li>Assurer la sécurité des serveurs, prévenir les fraudes et appliquer les règles de jeu.</li>
            <li>Traiter les demandes d'assistance et tickets de support.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">4.</span> Durée de Conservation
          </h2>
          <p>
            Les données de profil et de compte sont conservées pendant toute la durée de validité du compte utilisateur. Les journaux de connexion et données de sécurité sont archivés pour une durée maximale de 12 mois avant d'être supprimés ou anonymisés.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">5.</span> Vos Droits (RGPD)
          </h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits d'accès, de rectification, d'effacement et de portabilité de vos données personnelles.
          </p>
          <p>
            Vous pouvez exercer ces droits à tout moment en ouvrant un ticket sur notre serveur Discord ou en contactant notre équipe via la page Support.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">6.</span> Sécurité des Données
          </h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (chiffrement TLS, restrictions d'accès, mots de passe salés) afin de garantir la sécurité et la confidentialité de vos données personnelles contre tout accès non autorisé.
          </p>
        </section>
      </div>
    </div>
  );
}
