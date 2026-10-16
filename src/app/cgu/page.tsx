/* eslint-disable react/no-unescaped-entities -- texte français */
import { pageMeta } from "@/lib/seo";
import { legal } from "@/config/legal";
import LegalPage, { Section } from "@/components/legal/LegalPage";

export const metadata = pageMeta({
  title: "Conditions d'utilisation",
  description: "Règles d'usage du site, du launcher, des cartes et des ParaCoins de Paranoia Studio.",
  path: "/cgu",
});

export default function Page() {
  return (
    <LegalPage title="Conditions d'utilisation" updatedAt={legal.updatedAt}>
      <Section title="1. Objet">
        <p>Ces conditions encadrent l'usage du site, du launcher Paranoia Client, du bot Discord, des cartes à collectionner et des mini-jeux. Se connecter ou lancer le launcher vaut acceptation.</p>
      </Section>
      <Section title="2. Compte">
        <p>La connexion se fait avec votre compte Discord. Vous restez responsable de l'usage de votre compte. Les moins de 15 ans doivent avoir l'accord d'un parent ou tuteur légal.</p>
      </Section>
      <Section title="3. ParaCoins, cartes et boosters">
        <p>Les ParaCoins, cartes, boosters et objets sont des éléments de jeu sans valeur monétaire. Ils ne s'achètent pas avec de l'argent réel, ne se revendent pas contre de l'argent et ne donnent droit à aucun remboursement. Le studio peut en ajuster les taux, prix et stocks pour équilibrer le jeu.</p>
        <p>Les mini-jeux (Crash, Roulette, Mines, Blackjack) n'utilisent que des ParaCoins. Aucun gain réel n'est possible.</p>
      </Section>
      <Section id="reglement" title="4. Règlement communautaire">
        <ul>
          <li>Pas d'insultes, de harcèlement, de discrimination ni de contenu illégal.</li>
          <li>Pas de triche, de mod interdit par le serveur, ni d'exploitation de bug. Signalez-le plutôt via le Support.</li>
          <li>Pas de multi-comptes pour gagner des ParaCoins ou des cartes.</li>
          <li>Pas d'usurpation d'identité, ni de skin ou pseudo contraire à la loi.</li>
        </ul>
      </Section>
      <Section title="5. Sanctions">
        <p>Le staff peut avertir, suspendre ou bannir un compte ou une machine (via l'identifiant matériel du launcher) en cas de manquement. Vous pouvez contester une sanction par un ticket sur la page Support ou via la procédure d'appel du bot Discord.</p>
      </Section>
      <Section title="6. Launcher">
        <p>Le launcher est fourni tel quel. Vous ne devez pas le décompiler pour contourner ses protections ni ses vérifications d'intégrité. Un compte Minecraft légitime reste nécessaire pour jouer sur les serveurs officiels.</p>
      </Section>
      <Section title="7. Responsabilité">
        <p>Le studio fait au mieux pour garder le service disponible mais ne peut garantir l'absence d'interruption ou de perte de données de jeu. Cela ne limite pas vos droits de consommateur.</p>
      </Section>
      <Section title="8. Données personnelles">
        <p>Voir la <a href="/privacy">politique de confidentialité</a>.</p>
      </Section>
      <Section title="9. Droit applicable">
        <p>Droit français. En cas de litige, une solution amiable est recherchée d'abord. Un consommateur peut aussi saisir un médiateur de la consommation ou le tribunal compétent.</p>
      </Section>
    </LegalPage>
  );
}
