export default function CardsLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {}
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none mix-blend-screen" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] max-w-7xl h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/50 via-purple-900/20 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        {}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
          <div>
            <div className="h-12 w-72 bg-white/5 rounded-xl animate-pulse mb-2"></div>
            <div className="h-5 w-96 bg-white/5 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-32 bg-white/5 rounded-xl animate-pulse"></div>
          ))}
        </div>

        {}
        <div className="flex justify-center items-center gap-8 py-12 mb-8">
          <div className="w-48 h-72 bg-white/5 rounded-2xl animate-pulse opacity-40"></div>
          <div className="w-56 h-80 bg-white/5 rounded-2xl animate-pulse border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)]"></div>
          <div className="w-48 h-72 bg-white/5 rounded-2xl animate-pulse opacity-40"></div>
        </div>

        {}
        <div className="flex justify-center mb-12">
          <div className="h-14 w-64 bg-white/5 rounded-xl animate-pulse"></div>
        </div>

        {}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[2.5/3.5] bg-white/5 rounded-xl animate-pulse border border-white/5" style={{ animationDelay: `${i * 0.1}s` }}></div>
          ))}
        </div>
      </div>
    </div>
  );
}
