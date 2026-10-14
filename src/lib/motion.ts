export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const SPRING_UI = { type: "spring", bounce: 0, duration: 0.45 } as const;
export const SPRING_SOFT = { stiffness: 150, damping: 20, mass: 0.6 } as const;
