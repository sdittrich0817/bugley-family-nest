// Planning/rehearsal only. This module never calls providers or creates test sessions.
import { aiCallWorstCredits, drawUsd, round } from "./spend";
import { astraImageTokens } from "./ai-image-cost.server";

export function stageOneBound(creditUsdRate: number | null) {
  const outputTokens = astraImageTokens(2048, 2048);
  const referenceTokens = astraImageTokens(1024, 1024);
  // Founder scope: two cases × three Google models; two references conservatively in both cases.
  const outputs = 6;
  const safety = aiCallWorstCredits(3000, 1, false, outputTokens);
  const likeness = aiCallWorstCredits(3000, 3, false, outputTokens + 2 * referenceTokens);
  const credits = round(outputs * (safety + likeness));
  const oneRound = drawUsd("google/nano-banana-pro", { resolution: "2K" }) + drawUsd("google/nano-banana") + drawUsd("google/nano-banana-2.1", { resolution: "1K" });
  const usd = round(2 * 2 * oneRound); // Two cases, at most one transient drawing retry each.
  if (creditUsdRate !== null && (!Number.isFinite(creditUsdRate) || creditUsdRate <= 0)) throw new Error("Invalid approved credit rate.");
  const total = creditUsdRate === null ? null : round(credits * creditUsdRate + usd);
  return { outputs, safetyChecks: outputs, likenessChecks: outputs, maxDrawingStarts: outputs * 2, safety, likeness, credits, usd, total, fits: total !== null && total <= 15 };
}