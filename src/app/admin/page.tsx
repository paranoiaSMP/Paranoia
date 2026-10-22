"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Overview from "@/features/admin/Overview";
import Users from "@/features/admin/Users";
import Players from "@/features/admin/Players";
import Reports from "@/features/admin/Reports";
import News from "@/features/admin/News";
import Gifts from "@/features/admin/Gifts";
import Shop from "@/features/admin/Shop";
import Tcg from "@/features/admin/Tcg";
import Settings from "@/features/admin/Settings";
import { isAdmin, isOwner, isStaff } from "@/lib/roles";
import { EASE_OUT } from "@/lib/motion";

type Level = "staff" | "admin" | "dev";
const TABS = [
  { key: "overview", label: "Vue d'ensemble", min: "admin" },
  { key: "users", label: "Utilisateurs", min: "staff" },
  { key: "players", label: "Joueurs et bans", min: "staff" },
  { key: "reports", label: "Signalements", min: "admin" },
  { key: "gifts", label: "Dons", min: "admin" },
  { key: "shop", label: "Boutique", min: "admin" },
  { key: "tcg", label: "TCG", min: "admin" },
  { key: "news", label: "Actualités", min: "admin" },
  { key: "settings", label: "Paramètres", min: "dev" },
] as const satisfies readonly { key: string; label: string; min: Level }[];
type TabKey = (typeof TABS)[number]["key"];

const allowed = (role: string | undefined, min: Level) =>
  min === "dev" ? isOwner(role) : min === "admin" ? isAdmin(role) : isStaff(role);

function Admin() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const role = session?.user?.role as string | undefined;
  const tabs = TABS.filter((t) => allowed(role, t.min));
  const raw = params.get("tab");
  const tab: TabKey = (tabs.find((t) => t.key === raw) ?? tabs[0])?.key ?? "overview";
  const go = (t: TabKey) => router.push(`${pathname}?tab=${t}`, { scroll: false });

  if (status === "loading") {
    return <div role="status" className="mx-auto h-96 max-w-7xl animate-pulse px-5 md:px-10" />;
  }
  if (!isStaff(role)) {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-7xl flex-col justify-center px-5 md:px-10">
        <h1 className="text-4xl font-bold tracking-[-0.03em] text-white">Accès réservé</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pb-24 pt-10 md:px-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-white">Admin</h1>
        <nav aria-label="Sections admin" className="mt-6">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((t) => {
              const active = t.key === tab;
              return (
                <li key={t.key} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => go(t.key)}
                    aria-current={active ? "page" : undefined}
                    className="press relative flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm"
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-tab"
                        transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }}
                        className="absolute inset-0 rounded-md bg-zinc-900 ring-1 ring-zinc-700"
                      />
                    )}
                    <span className={`relative ${active ? "text-white" : "text-zinc-400 hover:text-white"}`}>{t.label}</span>
                  </button>
                </li>
              );
            })}
            <li className="shrink-0 lg:mt-4 lg:border-t lg:border-zinc-900 lg:pt-4">
              <Link href="/bot" className="flex min-h-11 items-center rounded-md px-3 text-sm text-zinc-400 hover:text-white">
                Bot Discord
              </Link>
            </li>
            {isAdmin(role) && (
              <li className="shrink-0">
                <Link href="/admin/cartes" className="flex min-h-11 items-center rounded-md px-3 text-sm text-zinc-400 hover:text-white">
                  Éditeur de cartes
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)", transitionEnd: { transform: "none" } }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="min-w-0"
        >
          {tab === "overview" && <Overview go={go} />}
          {tab === "users" && <Users />}
          {tab === "players" && <Players />}
          {tab === "reports" && <Reports />}
          {tab === "news" && <News />}
          {tab === "gifts" && <Gifts />}
          {tab === "shop" && <Shop />}
          {tab === "tcg" && <Tcg />}
          {tab === "settings" && <Settings />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}
