/* eslint-disable react/no-unescaped-entities -- texte français */
import { pageMeta } from "@/lib/seo";
import { legal } from "@/config/legal";
import LegalPage, { Section, Val } from "@/components/legal/LegalPage";

export const metadata = pageMeta({
  title: "Politique de confidentialité",
  description: "Quelles données Paranoia Studio collecte sur le site et dans le launcher, pourquoi, combien de temps, et comment exercer vos droits RGPD.",
  path: "/privacy",
});

const ROWS: [string, string, string, string][] = [
  ["Compte Discord : identifiant, pseudo, avatar, email", "Connexion et gestion du compte", "Exécution du service", "Jusqu'à suppression du compte"],
  ["Pseudo et UUID Minecraft, skin personnalisé", "Lier votre compte au jeu, afficher votre profil et vos cartes", "Exécution du service", "Jusqu'à suppression du compte"],
  ["Progression : ParaCoins, XP, niveau, cartes, échanges, statistiques de casino", "Faire fonctionner le TCG et les mini-jeux", "Exécution du service", "Jusqu'à suppression du compte"],
  ["Identifiant matériel (HWID) du launcher", "Appliquer les bannissements et éviter leur contournement", "Intérêt légitime (sécurité de la communauté)", "Tant que le joueur est enregistré, puis suppression sur demande sauf bannissement actif"],
  ["Rapport de bug : titre, description, matériel (CPU, GPU, RAM, système), arguments Java, journaux", "Corriger les bugs, uniquement si vous envoyez le rapport", "Consentement (vous cliquez sur envoyer)", "[À COMPLÉTER] mois après clôture du ticket"],
  ["Tickets, avertissements, sanctions, appels", "Modération et support", "Intérêt légitime / exécution du service", "Durée de la sanction, puis [À COMPLÉTER]"],
  ["Adresse IP", "Limiter les abus (limitation de débit). Conservée en mémoire seulement, non enregistrée en base.", "Intérêt légitime (sécurité)", "Quelques minutes"],
];

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt={legal.updatedAt}>
      <Section title="Qui est responsable de vos données ?">
        <p>Paranoia Studio, projet non professionnel porté par des particuliers (voir les <a href="/mentions-legales">mentions légales</a>). Contact pour toute question ou demande : <Val>{legal.contactEmail}</Val>.</p>
        <p>Cette politique couvre le site, le launcher Paranoia Client, le bot Discord et le serveur Minecraft du studio.</p>
      </Section>

      <Section title="Ce que nous collectons">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/20 text-zinc-100">
                <th className="py-2 pr-3">Donnée</th><th className="py-2 pr-3">Pourquoi</th><th className="py-2 pr-3">Base légale</th><th className="py-2">Durée</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r[0]} className="border-b border-white/10 align-top">
                  {r.map((c, i) => (
                    <td key={i} className="py-2 pr-3"><Val>{c}</Val></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Nous ne vendons pas vos données et ne faisons aucune publicité ciblée ni profilage.</p>
      </Section>

      <Section title="Cookies et stockage local">
        <p>Le site n'utilise ni outil d'analyse d'audience, ni cookie publicitaire. Seuls sont déposés :</p>
        <ul>
          <li>un cookie de session, nécessaire pour rester connecté (exempté de consentement) ;</li>
          <li>une préférence de confort stockée dans votre navigateur (par exemple le son), exemptée de consentement.</li>
        </ul>
        <p>C'est pourquoi aucune bannière de cookies n'est affichée. Si un outil de mesure est ajouté un jour, nous demanderons votre accord avant.</p>
      </Section>

      <Section title="Le launcher">
        <ul>
          <li>Au lancement, il envoie à nos serveurs votre pseudo Minecraft et un identifiant matériel pour vérifier que vous n'êtes pas banni.</li>
          <li>Les rapports de bug et de crash ne partent que si vous les envoyez, ou si vous avez accepté l'envoi. Ils peuvent contenir des informations sur votre machine et des journaux : relisez-les avant envoi.</li>
          <li>Vous pouvez désinstaller le launcher à tout moment, ce qui supprime les données locales.</li>
        </ul>
      </Section>

      <Section title="Services tiers qui reçoivent des données">
        <ul>
          <li>Discord : connexion OAuth, bot, tickets. <a href="https://discord.com/privacy">discord.com/privacy</a></li>
          <li>Mojang / Microsoft : vérification du pseudo et de l'UUID Minecraft.</li>
          <li>vzge.me : affichage des skins (votre pseudo ou UUID est demandé au service).</li>
          <li>Cloudflare R2 : stockage d'images, si activé.</li>
          <li>Hébergeur : <Val>{legal.host}</Val></li>
        </ul>
        <p>Si l'un de ces prestataires est situé hors de l'Union européenne, le transfert est encadré par des clauses contractuelles types ou une décision d'adéquation.</p>
      </Section>

      <Section id="droits" title="Vos droits">
        <p>Vous pouvez demander l'accès, la rectification, l'effacement, la limitation, la portabilité de vos données, et vous opposer aux traitements fondés sur l'intérêt légitime. Pour retirer un consentement, c'est possible à tout moment sans effet sur ce qui précède.</p>
        <p>Écrivez à <Val>{legal.contactEmail}</Val> ou ouvrez un ticket sur la page <a href="/support">Support</a>, en précisant votre pseudo Discord. Nous répondons sous un mois. Nous pouvons vous demander de prouver votre identité.</p>
        <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL : <a href="https://www.cnil.fr/fr/plaintes">cnil.fr/plaintes</a>.</p>
      </Section>

      <Section title="Mineurs">
        <p>En France, l'inscription seule à un service en ligne exige 15 ans, ou l'accord d'un parent en dessous. Un parent peut demander la suppression du compte de son enfant via les contacts ci-dessus.</p>
      </Section>

      <Section title="Sécurité">
        <p>Accès à la base restreint au staff, sessions chiffrées, limitation de débit. Aucun système n'étant infaillible, en cas de violation de données susceptible de vous nuire, nous vous en informons ainsi que la CNIL dans les délais légaux.</p>
      </Section>

      <Section title="Modifications">
        <p>La date en haut de page indique la dernière révision. Un changement important sera annoncé sur le Discord.</p>
      </Section>
    </LegalPage>
  );
}
