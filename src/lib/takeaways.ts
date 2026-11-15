/**
 * Finish-screen takeaways for the first-session games. Each line only claims
 * what the round actually recorded (checked pairs, checked photos, caught
 * mistakes); with no evidence it encourages instead of claiming learning.
 */
export type Takeaway = { title: string; body: string };

export type MeadowRound = { pairs: number; caught: number; learned: Array<"blue" | "yellow"> };
const MEADOW_FEATURE = { blue: "wing shape and body length", yellow: "dots and stripes" } as const;

export function meadowTakeaway({ pairs, caught, learned }: MeadowRound): Takeaway {
  if (!pairs || !learned.length) return { title: "Twins can be tricky!", body: "Next time, flip two leaves and look at the tiny details. When you find a pair, I learn from you." };
  const features = learned.map((c) => MEADOW_FEATURE[c]).join(" and ");
  const caughtLine = caught ? ` You caught ${caught === 1 ? "one of my wrong guesses" : `${caught} of my wrong guesses`}, too.` : "";
  return { title: "Small details make a big difference.", body: `My little AI matches features, not whole pictures. Your pairs taught me to notice ${features}.${caughtLine} Those details stay with me when we play again!` };
}

export type DragonRound = { checked: number; corrections: number };

export function dragonTakeaway({ checked, corrections }: DragonRound): Takeaway {
  if (corrections > 0) return { title: "You caught the camera’s mistakes!", body: `My practice camera would have guessed wrong ${corrections === 1 ? "once" : `${corrections} times`}, and your checks fixed it. Even a very sure guess can be wrong!` };
  if (checked > 0) return { title: "You taught Dragon Eye!", body: "Your checked pictures help my practice camera recognize those shapes next flight. I can still miss new ones." };
  return { title: "Dragon Eye is still learning.", body: "Next flight, snap a picture and tell me what you see. Your answers help my practice camera learn." };
}
