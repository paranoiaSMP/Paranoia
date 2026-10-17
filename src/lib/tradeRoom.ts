// shortcut: validations gardées en mémoire (un seul serveur web), perdues au redémarrage; passer en base si on scale.
const g = globalThis as unknown as { __tradeReady?: Map<string, { from: boolean; to: boolean }> };
export const ready = (g.__tradeReady ??= new Map());
