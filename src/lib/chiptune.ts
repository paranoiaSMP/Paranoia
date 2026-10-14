let ctx: AudioContext | null = null;
let muted = typeof window !== "undefined" && localStorage.getItem("ps-sound") === "off";

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; vol?: number; slideTo?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
  gain.gain.setValueAtTime(opts.vol ?? 0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.08) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  const gain = a.createGain();
  src.buffer = buf;
  gain.gain.setValueAtTime(vol, t);
  src.connect(gain).connect(a.destination);
  src.start(t);
}

const synth = {
  blip: () => tone(380 + Math.random() * 40, 0, 0.045, { vol: 0.035 }),
  select: () => {
    tone(880, 0, 0.05);
    tone(1320, 0.05, 0.06);
  },
  encounter: () => [0, 0.2, 0.4].forEach((s) => tone(660, s, 0.09, { vol: 0.07 })),
  hit: () => {
    noise(0, 0.12);
    tone(220, 0, 0.25, { slideTo: 55, vol: 0.08 });
  },
  spare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.14, { vol: 0.05 })),
};


type SoundName = keyof typeof synth;

const found: Partial<Record<SoundName, string | null>> = {};

async function locate(name: SoundName): Promise<string | null> {
  if (found[name] !== undefined) return found[name] ?? null;
  for (const ext of ["mp3", "wav", "ogg"]) {
    const url = `/sounds/${name}.${ext}`;
    try {
      const res = await fetch(url, { method: "HEAD", cache: "force-cache" });
      if (res.ok) return (found[name] = url);
    } catch {}
  }
  return (found[name] = null);
}

function play(name: SoundName) {
  if (muted || typeof window === "undefined") return;
  const url = found[name];
  if (url) {
    const el = new Audio(url);
    el.volume = 0.6;
    void el.play().catch(() => synth[name]());
    return;
  }
  synth[name]();
  if (url === undefined) void locate(name);
}

export function preloadSounds() {
  (Object.keys(synth) as SoundName[]).forEach((n) => void locate(n));
}

export const sfx = {
  blip: () => play("blip"),
  select: () => play("select"),
  encounter: () => play("encounter"),
  hit: () => play("hit"),
  spare: () => play("spare"),
};

export const isMuted = () => muted;
export function setMuted(value: boolean) {
  muted = value;
  localStorage.setItem("ps-sound", value ? "off" : "on");
  if (value && ctx) void ctx.suspend();
}
