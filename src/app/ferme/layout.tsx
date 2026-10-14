import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site fermé",
  robots: { index: false },
};

export default function FermeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
