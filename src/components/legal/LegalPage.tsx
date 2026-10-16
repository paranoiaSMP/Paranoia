/* eslint-disable react/no-unescaped-entities -- texte français */
import Link from "next/link";
import { TODO } from "@/config/legal";

export function Val({ children }: { children: string }) {
  return children === TODO ? (
    <mark className="rounded bg-amber-300 px-1.5 text-black">{children}</mark>
  ) : (
    <>{children}</>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-zinc-300 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_a]:text-violet-300 [&_a]:underline">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8">
      <p className="text-sm text-zinc-400">Dernière mise à jour : {updatedAt}</p>
      <h1 className="mt-2 mb-10 text-3xl font-black text-white md:text-4xl">{title}</h1>
      <div className="space-y-10">{children}</div>
      <nav aria-label="Documents légaux" className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-zinc-300">
        <Link className="underline" href="/privacy">Confidentialité</Link>
        <Link className="underline" href="/cgu">Conditions d'utilisation</Link>
        <Link className="underline" href="/mentions-legales">Mentions légales</Link>
      </nav>
    </main>
  );
}
