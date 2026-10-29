import { z } from "zod";

export const BUG_KINDS = ["beetle", "ladybug", "bee", "dragonfly", "butterfly", "ant", "mantis", "spider"] as const;
export const BUG_COLORS = { red: "#E8443A", orange: "#F28C28", gold: "#FFC94D", lime: "#8BD346", green: "#2FA866", teal: "#1FB5A8", sky: "#3BA3F0", blue: "#3A5BD9", purple: "#8A4FE0", pink: "#F06BB0", brown: "#8A5A3B", charcoal: "#3A3F4B", white: "#F4F1EA" } as const;
export const COLOR_KEYS = Object.keys(BUG_COLORS) as (keyof typeof BUG_COLORS)[];
export const BUG_PATTERNS = ["none", "spots", "stripes", "zigzag"] as const;
export const BUG_EYES = ["big", "fierce", "shades", "visor", "cheeky"] as const;
export const BUG_MOUTHS = ["grin", "smirk", "fangs", "open"] as const;
export const BUG_ANTENNAE = ["none", "bobble", "curly", "zap", "horn"] as const;
export const BUG_EXTRAS = ["none", "headphones", "cap", "crown", "cape"] as const;

const color = z.enum(COLOR_KEYS as [keyof typeof BUG_COLORS, ...(keyof typeof BUG_COLORS)[]]);
export const bugSchema = z.object({
  kind: z.enum(BUG_KINDS), body: color, accent: color, pattern: z.enum(BUG_PATTERNS),
  eyes: z.enum(BUG_EYES), mouth: z.enum(BUG_MOUTHS), antennae: z.enum(BUG_ANTENNAE), extra: z.enum(BUG_EXTRAS),
  imagePath: z.string().optional(), imageUrl: z.string().optional(),
});
export type BugConfig = z.infer<typeof bugSchema>;

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const pick = <T,>(list: readonly T[], n: number): T => { const value = list[n % list.length]; if (value === undefined) throw new Error("Missing bug parts"); return value; };
/** A stable starter bug for a child who hasn't built one yet. */
export function starterBug(seed: string): BugConfig {
  const h = hash(seed || "bug");
  return { kind: pick(BUG_KINDS, h), body: pick(COLOR_KEYS, h >>> 3), accent: pick(COLOR_KEYS, (h >>> 7) + 5), pattern: pick(BUG_PATTERNS, h >>> 11), eyes: pick(BUG_EYES, h >>> 13), mouth: pick(BUG_MOUTHS, h >>> 17), antennae: pick(BUG_ANTENNAE, (h >>> 19) + 1), extra: "none" };
}
export function randomBug(): BugConfig { return { ...starterBug(String(Math.random())), extra: pick(BUG_EXTRAS, Math.floor(Math.random() * 5)) }; }
/** Accepts a saved bug, or anything else (old animal avatars) and returns a valid bug. */
export function toBug(value: unknown, seed = ""): BugConfig {
  const p = bugSchema.safeParse(value);
  return p.success ? p.data : starterBug(typeof value === "string" ? `${value}${seed}` : seed);
}

export function avatarCost(completed: number) { return completed < 2 ? 0 : 1; }
