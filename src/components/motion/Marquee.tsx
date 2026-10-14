export default function Marquee({ items: base, className = "" }: { items: string[]; className?: string }) {
  const items = Array.from({ length: Math.max(1, Math.ceil(12 / base.length)) }, () => base).flat();
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-10 whitespace-nowrap">
          <span>{item}</span>
          <span aria-hidden className="text-violet-400">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`marquee group flex overflow-hidden ${className}`}>
      <div className="marquee-track flex">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
