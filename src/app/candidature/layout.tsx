import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recrutement',
  description: "Rejoignez l'équipe de Paranoia Studio. Postulez dès maintenant !",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
