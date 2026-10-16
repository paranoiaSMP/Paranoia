export const TRADE_MAX_CARDS = 5;
export const TRADE_MAX_PENDING = 5;
export const TRADE_DAILY_LIMIT = 10;
export const TRADE_TOLERANCE = 0.25;

/** Les deux côtés sont équilibrés si l'écart reste dans la marge, mesuré sur le plus grand total. */
export const balanced = (a: number, b: number) => Math.abs(a - b) <= Math.max(a, b) * TRADE_TOLERANCE;
