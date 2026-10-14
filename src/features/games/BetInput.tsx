"use client";

import { fmt } from "./useBalance";

export default function BetInput({
  value,
  onChange,
  min = 10,
  max,
  balance,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  balance: number | null;
  disabled?: boolean;
}) {
  const cap = Math.max(min, Math.min(max, balance ?? max));
  const clamp = (v: number) => Math.max(min, Math.min(cap, Math.floor(v)));
  const chip =
    "press min-h-11 flex-1 rounded-md border border-zinc-800 px-2 text-sm font-medium text-zinc-200 hover:border-white disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="bet" className="flex justify-between text-sm text-zinc-300">
        Mise
        <span className="text-zinc-400">
          {fmt(min)} à {fmt(max)} PC
        </span>
      </label>
      <input
        id="bet"
        type="number"
        inputMode="numeric"
        min={min}
        max={cap}
        step={10}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={() => onChange(clamp(value || min))}
        className="min-h-12 w-full rounded-md border border-zinc-500 bg-black px-4 text-lg font-semibold tabular-nums text-white focus-visible:border-violet-400 disabled:opacity-50"
      />
      <div className="flex gap-2">
        <button type="button" disabled={disabled} onClick={() => onChange(clamp(value / 2))} className={chip}>
          ½
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(clamp(value * 2))} className={chip}>
          ×2
        </button>
        {[100, 500].map((v) => (
          <button key={v} type="button" disabled={disabled} onClick={() => onChange(clamp(v))} className={chip}>
            {v}
          </button>
        ))}
        <button type="button" disabled={disabled} onClick={() => onChange(cap)} className={chip}>
          Max
        </button>
      </div>
    </div>
  );
}
