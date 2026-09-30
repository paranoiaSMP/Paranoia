export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-[#7a0aad] flex items-center justify-center text-white font-black text-xl shadow-lg animate-pulse">
        P
      </div>
      <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
        Chargement...
      </span>
    </div>
  );
}
