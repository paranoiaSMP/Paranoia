/* eslint-disable react/no-unescaped-entities -- texte français */
import { pageMeta } from "@/lib/seo";
import { legal } from "@/config/legal";
import { siteConfig } from "@/config/site";
import LegalPage, { Section, Val } from "@/components/legal/LegalPage";

export const metadata = pageMeta({
  title: "Mentions légales",
  description: "Éditeur, hébergeur et contact de Paranoia Studio.",
  path: "/mentions-legales",
});

export default function Page() {
  return (
    <LegalPage title="Mentions légales" updatedAt={legal.updatedAt}>
      <Section title="Éditeur du site et du launcher">
        <p>Le site {siteConfig.siteUrl} et le launcher Paranoia Client sont édités par :</p>
        <ul>
          <li>Nom ou raison sociale : <Val>{legal.publisher}</Val></li>
          <li>Statut : <Val>{legal.status}</Val></li>
          <li>Directeur de la publication : <Val>{legal.director}</Val></li>
          <li>Contact : <Val>{legal.contactEmail}</Val> ou un ticket sur la page Support</li>
        </ul>
        <p>Paranoia Studio est édité par des particuliers, sans société. Conformément à la loi pour la confiance dans l'économie numérique (art. 6, III, 2°), leur identité complète est communiquée à l'hébergeur, qui peut la transmettre à l'autorité judiciaire.</p>
      </Section>
      <Section title="Hébergement">
        <p><Val>{legal.host}</Val></p>
        <p>Les images et fichiers du studio peuvent aussi être servis par Cloudflare R2.</p>
      </Section>
      <Section title="Propriété intellectuelle">
        <p>Les cartes, illustrations, textes et le code du studio appartiennent à Paranoia Studio ou à leurs auteurs. Minecraft est une marque de Mojang AB. Paranoia Studio n'est ni affilié, ni approuvé par Mojang ou Microsoft.</p>
      </Section>
      <Section title="Données personnelles">
        <p>Le traitement de vos données est détaillé dans la <a href="/privacy">politique de confidentialité</a>.</p>
      </Section>
    </LegalPage>
  );
}
