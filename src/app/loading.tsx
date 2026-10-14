export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl px-5 py-20 md:px-10">
      <div className="h-12 w-2/3 animate-pulse rounded-sm bg-zinc-900" />
      <div className="mt-6 h-5 w-1/2 animate-pulse rounded-sm bg-zinc-900" />
      <span className="sr-only">Chargement</span>
    </div>
  );
}
