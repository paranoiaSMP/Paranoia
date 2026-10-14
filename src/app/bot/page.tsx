import type { Metadata } from "next";
import { Suspense } from "react";
import BotDashboard from "@/features/bot/BotDashboard";

export const metadata: Metadata = {
  title: "Bot Discord",
  robots: { index: false, follow: false },
};

export default function BotPage() {
  return (
    <Suspense fallback={<div role="status" className="mx-auto h-96 max-w-7xl animate-pulse px-5 md:px-10" />}>
      <BotDashboard />
    </Suspense>
  );
}
