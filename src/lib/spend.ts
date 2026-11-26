// Pure AI spending math (no I/O). Worst-case reservations and settlement amounts.
// Lovable AI is counted in credits; Replicate drawings in estimated dollars from published prices (never invoices).

/** Assumed list rates for the current text/vision model (credits per token). Input uses the cache-write rate seen on bills. */
export const AI_RATES = { input: 0.00005, output: 0.0002 } as const;
/** Conservative image allowance including print-size/reference inputs; not an invoice-derived hard provider bound. */
export const TOKENS_PER_IMAGE = 25000;
/** Output allowance per call including reasoning. */
export const OUTPUT_TOKENS_MAX = 1500;

export function aiCallWorstCredits(inputChars: number, images: number, withModeration: boolean): number {
  // UTF-8 byte counts, not average English chars/token. Upper tier is reserved when needed.
  const inputTokens = inputChars + 1000 + images * TOKENS_PER_IMAGE;
  const one = inputTokens * (inputTokens > 272000 ? 0.0001 : AI_RATES.input) + OUTPUT_TOKENS_MAX * (inputTokens > 272000 ? 0.0003 : AI_RATES.output);
  // The output safety pass sends the generated JSON (bounded by the output allowance) as text.
  const moderation = withModeration ? aiCallWorstCredits(OUTPUT_TOKENS_MAX * 6 + 2000, 0, false) : 0;
  return round(one + moderation);
}

export function aiCallCredits(inputTokens: number, outputTokens: number) {
  return round(Math.max(0, inputTokens) * (inputTokens > 272000 ? 0.0001 : AI_RATES.input) + Math.max(0, outputTokens) * (inputTokens > 272000 ? 0.0003 : AI_RATES.output));
}

/** Estimated Replicate price per drawing (USD). Unknown models get the most expensive known price. */
export function drawUsd(model: string, settings: Record<string, unknown> = {}) {
  const res = String(settings["resolution"] ?? "");
  if (model === "google/nano-banana-pro") return res === "4K" ? 0.30 : 0.15;
  if (model === "google/nano-banana") return 0.039;
  return 0.30;
}

/** Worst case for a drawing operation: every retry plus each picture's safety and character checks. */
export function drawingWorstCase(input: { model: string; settings?: Record<string, unknown>; draws: number; refs: number; similarity: boolean; textChars?: number; extraAi?: number }) {
  const perCheck = aiCallWorstCredits(1500, 1, false);
  const perSimilarity = input.similarity ? aiCallWorstCredits(2500 + (input.textChars ?? 0), 1 + Math.min(6, input.refs), false) : 0;
  return {
    credits: round(input.draws * (perCheck + perSimilarity) + (input.extraAi ?? 0)),
    // A delivered candidate has one safety/likeness pair, but its provider may have one transient retry.
    usd: round(input.draws * 2 * drawUsd(input.model, input.settings)),
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
