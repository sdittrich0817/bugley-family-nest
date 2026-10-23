export const GAME_KEYS = ["real_robot", "robot_chef", "train_bugley", "fact_fib"] as const;
export type GameKey = (typeof GAME_KEYS)[number];
export type Band = "sprouts" | "explorers" | "builders";

export const GAMES: Record<GameKey, { name: string; blurb: string; ages: string; bands: Band[]; learned: string; emoji: string }> = {
  real_robot: { name: "Real or Robot?", blurb: "Spot the pictures a computer made.", ages: "Ages 5–12", bands: ["sprouts", "explorers", "builders"], emoji: "🔍", learned: "AI can make pictures that look real, so we look closely for clues." },
  robot_chef: { name: "Robot Chef", blurb: "Give Chef Bolt the perfect steps.", ages: "Ages 5–9", bands: ["sprouts", "explorers"], emoji: "🥪", learned: "Computers do exactly what we say, so clear step-by-step instructions matter." },
  train_bugley: { name: "Train Bugley", blurb: "Teach Bugley to sort things.", ages: "Ages 7–12", bands: ["explorers", "builders"], emoji: "🧺", learned: "AI learns only from the examples it’s shown, so missing examples make it unfair." },
  fact_fib: { name: "Fact or Fib", blurb: "Bugley sounds sure. Is he right?", ages: "Ages 7–12", bands: ["explorers", "builders"], emoji: "🕵️", learned: "Sounding confident isn’t the same as being right, so we always check." },
};

export const MAX_LEVEL = 3;
export const ROUND_MINUTES = 4;
export const BONUS_GLOW_DAILY_CAP = 3;
export const UNLOCK_SHARE = 0.7;
const SIZES: Record<GameKey, Record<Band, number>> = {
  real_robot: { sprouts: 6, explorers: 8, builders: 10 },
  fact_fib: { sprouts: 4, explorers: 4, builders: 5 },
  robot_chef: { sprouts: 2, explorers: 2, builders: 2 },
  train_bugley: { sprouts: 1, explorers: 1, builders: 1 },
};
export const roundSize = (g: GameKey, b: Band) => SIZES[g][b];
export const canPlay = (g: GameKey, b: Band) => GAMES[g].bands.includes(b);
export const shouldUnlock = (score: number, total: number, level: number, unlocked: number) => level === unlocked && level < MAX_LEVEL && total > 0 && score / total >= UNLOCK_SHARE;
/** Bonus glow for a perfect round, never more than the daily cap from games. */
export const bonusFor = (score: number, total: number, alreadyToday: number) => (total > 0 && score === total && alreadyToday < BONUS_GLOW_DAILY_CAP ? 1 : 0);
export function badgesFor(game: GameKey, score: number, total: number, level: number) {
  const n = GAMES[game].name;
  return [`${n} Rookie`, ...(total > 0 && score === total ? [`${n} Star`] : []), ...(level === MAX_LEVEL && score / Math.max(total, 1) >= UNLOCK_SHARE ? [`${n} Master`] : [])];
}

// ---- Robot Chef: the robot follows steps exactly and literally ----
export type ChefStep = { id: string; text: string; ifMissing: string };
export type ChefDecoy = { id: string; text: string; funny: string };
export function runChef(steps: ChefStep[], decoys: ChefDecoy[], plan: string[]): { ok: boolean; at: number; result: string } {
  for (let i = 0; i < Math.max(plan.length, steps.length); i++) {
    const pick = plan[i];
    const decoy = decoys.find((d) => d.id === pick);
    if (decoy) return { ok: false, at: i, result: decoy.funny };
    const want = steps[i];
    if (!want) return { ok: false, at: i, result: "Chef Bolt keeps going after the job is done. Beep? Too many steps!" };
    if (pick !== want.id) return { ok: false, at: i, result: want.ifMissing };
  }
  return { ok: true, at: steps.length, result: "It worked! Chef Bolt followed every step perfectly." };
}

// ---- Train Bugley: learns trait → group only from the child's sorted examples ----
export type TrainCard = { id: string; emoji: string; name: string; traits: Record<string, string> };
export type TrainTest = { emoji: string; name: string; group: string; traits: Record<string, string> };
export function trainBugley(examples: TrainCard[], sorted: Record<string, string>, tests: TrainTest[]) {
  const learned = examples.filter((e) => sorted[e.id]);
  return tests.map((t) => {
    let best: { group: string; score: number } | null = null; let tie = false;
    for (const e of learned) {
      const score = Object.entries(t.traits).filter(([k, v]) => e.traits[k] === v).length;
      if (!best || score > best.score) { best = { group: sorted[e.id]!, score }; tie = false; }
      else if (score === best.score && sorted[e.id] !== best.group) tie = true;
    }
    const guess = best && best.score > 0 && !tie ? best.group : null;
    return { name: t.name, emoji: t.emoji, answer: t.group, guess, correct: guess === t.group };
  });
}
