import Link from "next/link";
import Image from "next/image";

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  );
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.419-2.1569 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
    </svg>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative bg-[#0a0a0a] text-[#888888] pt-20 overflow-hidden font-sans border-t border-[#1a1a1a]">
      <div className="max-w-[90rem] mx-auto px-6 lg:px-12 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-24 mb-16">
          
          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-16 w-full lg:w-3/4">
            
            {/* Column 1 */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm">Navigation</h3>
              <ul className="flex flex-col gap-4 text-sm font-medium">
                <li><Link href="/" className="hover:text-white transition-colors">Accueil</Link></li>
                <li><Link href="/cards" className="hover:text-white transition-colors">Système de Cartes</Link></li>
                <li><Link href="/shop" className="hover:text-white transition-colors">Boutique</Link></li>
                <li><Link href="/launcher" className="hover:text-white transition-colors">Launcher Custom</Link></li>
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm">Légal</h3>
              <ul className="flex flex-col gap-4 text-sm font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">CGV</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Mentions Légales</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Cookies</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Remboursements</Link></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm">Ressources</h3>
              <ul className="flex flex-col gap-4 text-sm font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">Wiki</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Tutoriels</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Règlement du serveur</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>

            {/* Column 4 */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm">Communauté</h3>
              <ul className="flex flex-col gap-4 text-sm font-medium">
                <li><Link href="/videastes" className="hover:text-white transition-colors">Vidéastes</Link></li>
                <li><Link href="/candidature" className="hover:text-white transition-colors">Nous rejoindre</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Partenaires</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Événements</Link></li>
              </ul>
            </div>

            {/* Column 5 */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm">Réseaux</h3>
              <ul className="flex flex-col gap-4 text-sm font-medium">
                <li><Link href="https://discord.gg/paranoiasmp" className="hover:text-white transition-colors">Discord</Link></li>
                <li><Link href="https://youtube.com" className="hover:text-white transition-colors">YouTube</Link></li>
                <li><Link href="https://twitch.tv" className="hover:text-white transition-colors">Twitch</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Twitter</Link></li>
              </ul>
            </div>
            
          </div>
          
          {/* Brand Column */}
          <div className="w-full lg:w-1/4">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 relative bg-white rounded-md flex items-center justify-center overflow-hidden">
                <Image src="/Paranoia_logo.png" alt="Logo" width={24} height={24} className="object-contain" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">Paranoia</span>
            </Link>
            <p className="text-sm font-medium leading-relaxed mb-6">
              Le serveur Minecraft SMP qui redéfinit la survie en multijoueur. Découvrez des fonctionnalités inédites.
            </p>
            <div className="flex items-center gap-4 text-[#888888]">
              <a href="https://discord.gg/paranoiasmp" className="hover:text-[#5865F2] transition-colors"><DiscordIcon className="w-5 h-5" /></a>
              <a href="https://twitter.com" className="hover:text-[#1DA1F2] transition-colors"><TwitterIcon className="w-5 h-5" /></a>
              <a href="https://youtube.com" className="hover:text-[#FF0000] transition-colors"><YoutubeIcon className="w-5 h-5" /></a>
            </div>
          </div>

        </div>

        {/* Divider & Copyright */}
        <div className="border-t border-[#1a1a1a] pt-8 pb-32 flex flex-col items-center justify-center text-sm font-medium relative z-10">
          <p>&copy; {new Date().getFullYear()} Paranoia. All rights reserved.</p>
        </div>
      </div>

      {/* Giant Watermark Text (Like in the Compos image) */}
      <div className="absolute bottom-[-10%] left-0 w-full overflow-hidden pointer-events-none select-none flex justify-center z-0">
        <span 
          className="text-[28vw] font-black leading-none tracking-tighter"
          style={{ 
            background: "linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 80%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          Paranoia
        </span>
      </div>
    </footer>
  );
}