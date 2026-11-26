// Pure AI spending math (no I/O). Worst-case reservations and settlement amounts.
// Lovable AI is counted in credits; Replicate drawings in estimated dollars from published prices (never invoices).

/** Assumed list rates for the current text/vision model (credits per token). Input uses the cache-write rate seen on bills. */
export const AI_RATES = { input: 0.00005, output: 0.0002 } as const;
/** Astra auto/original: at most 30,000 accepted 32px patches × 1.2; oversized inputs are rejected by the provider. */
export const TOKENS_PER_IMAGE = 36000;
export const MAX_AI_INPUT_TOKENS = 922000;
/** Output allowance per call including reasoning. */
export const OUTPUT_TOKENS_MAX = 1500;

export function aiCallWorstCredits(inputChars: number, images: number, withModeration: boolean, measuredImageTokens = images * TOKENS_PER_IMAGE): number {
  // UTF-8 byte counts, not average English chars/token. Upper tier is reserved when needed.
  if (!Number.isSafeInteger(measuredImageTokens) || measuredImageTokens < 0 || measuredImageTokens > images * TOKENS_PER_IMAGE) throw new Error("Invalid measured image cost.");
  const inputTokens = inputChars + 1000 + measuredImageTokens;
  if (!Number.isSafeInteger(inputChars) || inputChars < 0 || !Number.isSafeInteger(images) || images < 0 || inputTokens > MAX_AI_INPUT_TOKENS) throw new Error("AI input exceeds its verified cost contract.");
  const one = inputTokens * (inputTokens > 272000 ? 0.0001 : AI_RATES.input) + OUTPUT_TOKENS_MAX * (inputTokens > 272000 ? 0.0003 : AI_RATES.output);
  // The output safety pass sends the generated JSON (bounded by the output allowance) as text.
  const moderation = withModeration ? aiCallWorstCredits(OUTPUT_TOKENS_MAX * 6 + 2000, 0, false) : 0;
  return round(one + moderation);
}

export function aiCallCredits(inputTokens: number, outputTokens: number) {
  return round(Math.max(0, inputTokens) * (inputTokens > 272000 ? 0.0001 : AI_RATES.input) + Math.max(0, outputTokens) * (inputTokens > 272000 ? 0.0003 : AI_RATES.output));
}

/** Reviewed fixed-output contracts. Unknown models/settings/versions refuse, never guess a price. */
export function drawUsd(model: string, settings: Record<string, unknown> = {}, version = "") {
  const versions: Record<string, string> = {
    "google/nano-banana-pro": "a378332ef93328c4c704074d4aa7a051ab133b34eec1f0e60995fdf47243837b",
    "google/nano-banana": "2f341bb7cc31b5a041ef3625984c7485f4d1d75174258f388813d045399589be",
    "google/nano-banana-2.1": "061ca4b8aed9fa2a8e1bd92ff55fb4794bd32176d39bad70cc4cfb51d9491f56",
    "bytedance/seedream-4": "cf7d431991436f19d1c8dad83fe463c729c816d7a21056c5105e75c84a0aa7e9",
  };
  if (!versions[model] || (version && version !== versions[model])) throw new Error("Unreviewed drawing price contract.");
  const keys = ["aspect_ratio", "output_format", "reference_field", "reference_single", "resolution", "safety_filter_level"];
  if (model === "google/nano-banana-2.1") keys.push("google_search", "image_search");
  if (model === "bytedance/seedream-4") keys.push("size", "max_images", "sequential_image_generation", "enhance_prompt");
  if (Object.keys(settings).some(k => !keys.includes(k)) || (settings["reference_field"] !== undefined && settings["reference_field"] !== "image_input")) throw new Error("Unreviewed drawing settings.");
  if ((settings["google_search"] !== undefined && settings["google_search"] !== false) || (settings["image_search"] !== undefined && settings["image_search"] !== false)) throw new Error("Unpriced drawing tools.");
  const res = String(settings["resolution"] ?? "");
  if (model === "google/nano-banana-pro") { if (!["", "1K", "2K", "4K"].includes(res)) throw new Error("Unreviewed resolution."); return res === "4K" ? 0.30 : 0.15; }
  if (model === "google/nano-banana") { if (res) throw new Error("Unreviewed resolution."); return 0.039; }
  if (model === "google/nano-banana-2.1") { if (!["1K", "2K", "4K"].includes(res)) throw new Error("Unreviewed resolution."); return res === "4K" ? 0.1134 : res === "2K" ? 0.0504 : 0.0336; }
  if (res || settings["size"] !== "1K" || settings["max_images"] !== 1 || settings["sequential_image_generation"] !== "disabled") throw new Error("Unreviewed output count or size.");
  return 0.03;
}

/** Worst case for a drawing operation: every retry plus each picture's safety and character checks. */
export function drawingWorstCase(input: { model: string; version?: string; settings?: Record<string, unknown>; draws: number; refs: number; similarity: boolean; textChars?: number; extraAi?: number }) {
  const perCheck = aiCallWorstCredits(1500, 1, false);
  const perSimilarity = input.similarity ? aiCallWorstCredits(2500 + (input.textChars ?? 0), 1 + Math.min(6, input.refs), false) : 0;
  return {
    credits: round(input.draws * (perCheck + perSimilarity) + (input.extraAi ?? 0)),
    // A delivered candidate has one safety/likeness pair, but its provider may have one transient retry.
    usd: round(input.draws * 2 * drawUsd(input.model, input.settings, input.version)),
  };
}

export type SpendBlockReason = "duplicate" | "paused_all" | "paused_drawing" | "per_op_credits" | "per_op_usd" | "platform_daily_credits" | "platform_daily_usd" | "platform_monthly_credits" | "platform_monthly_usd" | "family_monthly_credits" | "family_monthly_usd" | "test_session_closed" | "test_session_cap" | "reservation_exhausted" | "gate_unavailable";

/** Friendly, age-appropriate words; never mentions money. */
export function spendBlockedReply(reason: SpendBlockReason) {
  if (reason === "duplicate") return "Bugley is already working on that. Please wait a moment.";
  if (reason === "paused_drawing") return "Bugley’s paintbrush is resting right now. Your work is safe — you can keep writing!";
  return "Bugley needs a little rest right now. Your work is safe. Please try again later.";
}

export const round = (n: number) => Math.round(n * 1e6) / 1e6;
