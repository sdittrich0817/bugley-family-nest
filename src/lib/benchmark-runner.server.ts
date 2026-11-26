// No route, automatic job or live provider adapter. Execution requires a separately approved capped test session.
import { Buffer } from "node:buffer";
import { imageSize } from "image-size";
import { z } from "zod";
import { stageOneBound } from "./benchmark-budget";
import { DRAWING_VERSIONS, assertPriceReview } from "./price-review";
import { AI_RATES, drawUsd } from "./spend";
import { meteredAi, meteredDraw, testSpendScope, withSpend } from "./spend.server";
import { prepareAiImages } from "./ai-image-cost.server";
import { aiRequestBytes } from "./studio-ai.server";
import { imageSafetySchema, IMAGE_SAFETY_INSTRUCTIONS, imageDriftSchema, imageDriftRequest } from "./image-check-contract";
import { buildPrompt } from "./images.server";
import { passesCharacterCheck } from "./image-consistency";

export const STAGE_ONE_MODELS = [
  { model: "google/nano-banana-pro", settings: { resolution: "2K", aspect_ratio: "1:1", output_format: "png", reference_field: "image_input" } },
  { model: "google/nano-banana", settings: { aspect_ratio: "1:1", output_format: "png", reference_field: "image_input" } },
  { model: "google/nano-banana-2.1", settings: { resolution: "1K", aspect_ratio: "1:1", output_format: "png", reference_field: "image_input", google_search: false, image_search: false } },
] as const;
const STYLE = "Soft flat hand-drawn cartoon, bold clean outlines and clear cheerful colors.";
export const STAGE_ONE_SCENARIOS = [
  { id: "solo-absence", request: "Pip jumps across stepping stones with one yellow boot and a crescent tail mark. The red kite stays on the riverbank. Miri stayed home and is not in this picture.", dna: "Pip — teal dragon, one yellow boot, crescent tail mark.", mustShow: ["Pip"], referenceIndexes: [0] },
  { id: "two-actions", request: "Pip carries a red kite across a bridge while Miri picks flowers beside it. Both are visible. Keep the kite with Pip and blue scarf with Miri.", dna: "Pip — teal dragon, one yellow boot, crescent tail mark. Miri — coral rabbit, blue scarf, striped ears.", mustShow: ["Pip", "Miri"], referenceIndexes: [0, 1] },
] as const;
type Usage<T> = { value: T; inputTokens?: number; outputTokens?: number };
export type StageOneAdapter = {
  // Exactly one drawing start. Adapter must not retry, call family functions or use a different model.
  draw: (job: { model: string; version: string; settings: Record<string, unknown>; prompt: string; refs: string[] }) => Promise<string>;
  safety: (image: string, instructions: string, input: string) => Promise<Usage<z.infer<typeof imageSafetySchema> | null>>;
  likeness: (images: string[], instructions: string, input: string) => Promise<Usage<z.infer<typeof imageDriftSchema> | null>>;
  // Private operator archive only; persist before checking so partial results survive an interruption.
  record: (artifact: { model: string; version: string; scenario: string; image: string; status: "quarantined" | "checked-safe" | "blocked"; passed?: boolean }) => Promise<void>;
};
export type StageOneEvidence = {
  reviewedAt: string;
  models: { model: string; version: string; usd: number }[];
  inputCreditsPerToken: number; outputCreditsPerToken: number;
};
type Reference = { dataUrl: string; sha256: string; provenance: "adult-synthetic" };
const hash = async (url: string) => {
  const bytes = Buffer.from(url.split(",")[1] ?? "", "base64");
  return Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
};
async function boundedImage(url: string, max: number) {
  if (!url.startsWith("data:image/")) throw new Error("Benchmark uses immutable local synthetic bytes only.");
  const [image] = await prepareAiImages([url]);
  if (!image) throw new Error("Missing benchmark image.");
  const { width, height } = imageSize(Buffer.from(image.url.split(",")[1] ?? "", "base64"));
  if (width > max || height > max) throw new Error("Benchmark image exceeds approved dimensions; never resize safety input.");
  return image.url;
}

export async function runStageOne(input: {
  approval: { founderApprovalId: string; sessionKey: string } | null;
  evidence: StageOneEvidence;
  references: Reference[];
}, adapter: StageOneAdapter, now = Date.now()) {
  if (!input.approval?.founderApprovalId) throw new Error("Separate founder execution approval required.");
  assertPriceReview(now);
  const age = now - Date.parse(input.evidence.reviewedAt);
  if (!Number.isFinite(age) || age < 0 || age > 86400000) throw new Error("Refresh free price/version evidence within 24 hours of execution.");
  if (input.evidence.models.length !== 3 || input.evidence.inputCreditsPerToken !== AI_RATES.input || input.evidence.outputCreditsPerToken !== AI_RATES.output) throw new Error("Revalidate changed model/rate evidence before execution.");
  for (const model of STAGE_ONE_MODELS) {
    const observed = input.evidence.models.filter(row => row.model === model.model);
    if (observed.length !== 1 || observed[0]?.version !== DRAWING_VERSIONS[model.model] || observed[0]?.usd !== drawUsd(model.model, model.settings)) throw new Error("Model version or price changed; stop for review, never substitute.");
  }
  if (input.references.length !== 2) throw new Error("Exactly two frozen adult-synthetic references required.");
  const refs = await Promise.all(input.references.map(async ref => {
    if (ref.provenance !== "adult-synthetic" || !/^[a-f0-9]{64}$/.test(ref.sha256) || await hash(ref.dataUrl) !== ref.sha256) throw new Error("Synthetic reference provenance/hash mismatch.");
    return boundedImage(ref.dataUrl, 1024);
  }));
  const jobs = STAGE_ONE_SCENARIOS.map(scene => {
    const drift = imageDriftRequest(scene.dna, STYLE, scene.request, [...scene.mustShow]);
    if (aiRequestBytes(imageSafetySchema, IMAGE_SAFETY_INSTRUCTIONS, "Review this image.") > 3000 || aiRequestBytes(imageDriftSchema, drift.instructions, drift.input) > 3000) throw new Error("Benchmark check exceeds the approved 3000-byte contract.");
    return { scene, drift, prompt: buildPrompt(STYLE, `${scene.request}. Featuring only the intended cast, exactly as in the frozen references: ${scene.dna}`, "final") };
  });
  const bound = stageOneBound(1); // Founder-approved provisional planning rate, not an invoice exchange rate.
  if (!bound.fits) throw new Error("Complete Stage 1 does not fit $15.");
  const sessionKey = input.approval.sessionKey;
  return testSpendScope(sessionKey, () => withSpend({ kind: "benchmark_stage1", opKey: `stage1-${sessionKey}`, draws: true }, bound, async () => {
    const results = [];
    for (const job of jobs) for (const model of STAGE_ONE_MODELS) {
      const version = DRAWING_VERSIONS[model.model];
      if (!version) throw new Error("Missing pinned benchmark version.");
      // No automatic retries, including ambiguous outcomes. The extra-start envelope remains unused headroom.
      const output = await meteredDraw(drawUsd(model.model, model.settings, version), () => adapter.draw({ model: model.model, version, settings: model.settings, prompt: job.prompt, refs: job.scene.referenceIndexes.map(i => refs[i] ?? "") }));
      await adapter.record({ model: model.model, version, scenario: job.scene.id, image: output, status: "quarantined" });
      const image = await boundedImage(output, 2048);
      const safety = await meteredAi(bound.safety, () => adapter.safety(image, IMAGE_SAFETY_INSTRUCTIONS, "Review this image."));
      const parsedSafety = imageSafetySchema.safeParse(safety);
      if (!parsedSafety.success) throw new Error("Safety check unavailable or invalid; stop the benchmark.");
      const safe = parsedSafety.data.safe && !parsedSafety.data.has_text;
      let likeness: z.infer<typeof imageDriftSchema> | null = null;
      if (safe) {
        const verdict = await meteredAi(bound.likeness, () => adapter.likeness([image, ...job.scene.referenceIndexes.map(i => refs[i] ?? "")], job.drift.instructions, job.drift.input));
        const parsed = imageDriftSchema.safeParse(verdict);
        if (!parsed.success) throw new Error("Likeness check unavailable or invalid; stop the benchmark.");
        likeness = parsed.data;
      }
      const passed = safe && likeness !== null && passesCharacterCheck(likeness);
      await adapter.record({ model: model.model, version, scenario: job.scene.id, image, status: safe ? "checked-safe" : "blocked", passed });
      results.push({ model: model.model, version, scenario: job.scene.id, sha256: await hash(image), safe, likeness, passed });
    }
    return { results, bound, dollarBasis: "provisional $1/AI credit; drawing list estimates, not actual provider invoices" };
  }));
}