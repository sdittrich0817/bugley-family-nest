export const DAILY_GLOW = { family: 10, family_plus: 20 } as const;
export const GLOW_COSTS = { sketch: 1, picture: 3 } as const;
/** Low = not enough left for a finished picture. */
export const isGlowLow = (total: number) => total < GLOW_COSTS.picture;
