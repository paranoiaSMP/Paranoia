export const levelCost = (level: number) => 5 * level * level + 50 * level + 100;

export function levelOf(xp: number) {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= levelCost(level)) {
    rest -= levelCost(level);
    level++;
  }
  return { level, into: rest, need: levelCost(level) };
}
