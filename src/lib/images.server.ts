// Server-only image pipeline: guard -> glow -> server-built prompt -> Replicate -> image safety check -> storage.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { aiObject } from "@/lib/studio-ai.server";
import { chargeGlow, giftGlowServer } from "@/lib/glow.server";
import { guardChildText, loadChild } from "@/lib/studio.server";

type Sb = SupabaseClient<any>;
export type ImageMode = "sketch" | "final" | "character";
const GW = "https://connector-gateway.lovable.dev/replicate/v1";
export const BUCKET = "studio-images";
const SAFETY_SUFFIX = "Kid-friendly, wholesome, gentle and joyful, suitable for a children's picture book. Absolutely no text, no words, no letters, no numbers, no captions, no signs, no logos, no speech bubbles anywhere in the image.";
export const SLEEPY = "I’m all out of glow for today! Let’s write the next page and I’ll draw it tomorrow.";
const FAMILY_LIMIT = "My glow needs a rest for now. Let’s write the next page and draw it later!";

async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

export function buildPrompt(recipe: string, description: string, mode: ImageMode) {
  const framing = mode === "character"
    ? "A single character, clean full-body portrait, standing, facing the viewer, whole body visible head to toe, centered on a plain soft white background, no scenery."
    : "";
  return [recipe, framing, description, SAFETY_SUFFIX].filter(Boolean).join(". ").replace(/\.\s*\./g, ".");
}

async function replicateRun(model: { model: string; version: string; settings: Record<string, unknown> }, prompt: string, refs: string[]) {
  const lovable = process.env["LOVABLE_API_KEY"], key = process.env["REPLICATE_API_KEY"];
  if (!lovable || !key) throw new Error("Image making isn’t set up yet.");
  const headers = { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json", Prefer: "wait=55" };
  const { reference_field, reference_single, ...settings } = model.settings as { reference_field?: string; reference_single?: boolean };
  const input: Record<string, unknown> = { ...settings, prompt };
  if (refs.length && reference_field) input[reference_field] = reference_single ? refs[0] : refs;
  const url = model.version ? `${GW}/predictions` : `${GW}/models/${model.model}/predictions`;
  const body = model.version ? { version: model.version, input } : { input };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (res.status === 402) { console.error("replicate: no credit"); throw new Error("Bugley’s paint box is empty right now. A grown-up needs to check the Studio account."); }
  if (!res.ok) { console.error(`replicate create [${res.status}]`, (await res.text()).slice(0, 500)); throw new Error("Bugley couldn’t paint that one."); }
  let pred = (await res.json()) as { id: string; status: string; output?: unknown; error?: unknown };
  for (let i = 0; i < 40 && !["succeeded", "failed", "canceled"].includes(pred.status); i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 2000 : 4000));
    const p = await fetch(`${GW}/predictions/${pred.id}`, { headers });
    if (!p.ok) { console.error(`replicate poll [${p.status}]`, (await p.text()).slice(0, 300)); continue; }
    pred = await p.json();
  }
  if (pred.status !== "succeeded") { console.error("replicate result", pred.status, pred.error); throw new Error("Bugley couldn’t paint that one."); }
  const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (typeof out !== "string") throw new Error("Bugley couldn’t paint that one.");
  return out;
}

const checkSchema = z.object({ safe: z.boolean(), has_text: z.boolean() });
async function imageIsSafe(url: string) {
  const v = await aiObject(checkSchema, "You review images made for a children's creative app (ages 5–12). safe=false if the image has anything violent, gory, scary beyond a picture book, sexual, suggestive, hateful, drug-related, a realistic photo of a real-looking person, or a famous copyrighted character or logo. has_text=true if it contains readable words, letters or speech bubbles.", "Review this image.", url);
  return v ? v.safe : false; // fail closed
}

export async function signPaths(paths: string[]) {
  if (!paths.length) return [] as string[];
  const { data } = await (await admin()).storage.from(BUCKET).createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl ?? "");
}

export type GenResult = { ok: true; path: string; url: string; prompt: string } | { ok: false; reply: string; chips?: string[] };

export async function generateImage(sb: Sb, userId: string, input: { childId: string; description: string; styleKey: string; mode: ImageMode; characterIds: string[]; requireReferences?: boolean }): Promise<GenResult> {
  const child = await loadChild(sb, userId, input.childId);
  // a) safety guard
  const guard = await guardChildText(sb, userId, child, input.description, input.mode === "character" ? "character" : "picture");
  if (guard.decision !== "allowed") return { ok: false, reply: guard.reply!, chips: guard.chips ?? [] };
  const a = await admin();
  const [{ data: style }, { data: model }] = await Promise.all([
    a.from("art_styles").select("recipe").eq("key", input.styleKey).eq("active", true).maybeSingle(),
    a.from("image_models").select("model,version,settings").eq("mode", input.mode).maybeSingle(),
  ]);
  if (!style) return { ok: false, reply: "Pick a style first!" };
  if (!model?.model) return { ok: false, reply: "My paintbrush isn’t ready yet! A grown-up at Bugley is still setting it up." };
  if (input.requireReferences && input.characterIds.length) {
    const settings = (model.settings ?? {}) as { reference_field?: string; reference_single?: boolean };
    if (!settings.reference_field || (settings.reference_single && input.characterIds.length > 1)) return { ok: false, reply: "My paintbrush needs a grown-up to set up matching character pictures first. Your words are safe!" };
    const { data: cast } = await sb.from("studio_creations").select("id,images").eq("parent_id", userId).eq("child_id", child.id).eq("kind", "character").is("deleted_at", null).in("id", input.characterIds);
    if ((cast ?? []).length !== input.characterIds.length || (cast ?? []).some((c: any) => !c.images?.[0])) return { ok: false, reply: "One of this story’s characters is missing from My Cast. Ask a grown-up to restore it first." };
  }
  // b) glow
  const kind = input.mode === "final" ? "picture" : "sketch";
  const charge = await chargeGlow(sb, userId, child.id, kind, input.mode === "character" ? "Character portrait" : input.mode === "final" ? "Final picture" : "Sketch");
  if (!charge.ok) return { ok: false, reply: charge.reason === "family_limit" ? FAMILY_LIMIT : SLEEPY };
  const refund = () => giftGlowServer(sb, userId, child.id, charge.cost ?? (kind === "picture" ? 3 : 1), "Refund: picture didn’t work").catch(() => {});
  try {
    // c) server-built prompt with character references
    let refs: string[] = [], castText = "";
    if (input.characterIds.length) {
      const { data: cast } = await sb.from("studio_creations").select("title,images,details").eq("parent_id", userId).eq("child_id", child.id).eq("kind", "character").is("deleted_at", null).in("id", input.characterIds);
      refs = await signPaths((cast ?? []).map((c: any) => c.images?.[0]).filter(Boolean));
      castText = (cast ?? []).map((c: any) => `${c.title}: ${c.details?.summary ?? ""}`).join("; ");
    }
    const description = castText ? `${input.description}. Featuring these characters exactly as in the reference images: ${castText}` : input.description;
    const prompt = buildPrompt(style.recipe, description, input.mode);
    // d) model
    const src = await replicateRun({ model: model.model, version: model.version, settings: (model.settings ?? {}) as Record<string, unknown> }, prompt, refs);
    // e) image safety check
    if (!(await imageIsSafe(src))) {
      await refund();
      await a.from("studio_events").insert({ parent_id: userId, child_id: child.id, source: input.mode, input: input.description.slice(0, 2000), decision: "unsafe", reply: "Image blocked by safety check" });
      return { ok: false, reply: "Hmm, that picture didn’t come out right, so I tossed it. Your glow is back! Let’s try a new idea.", chips: ["Try it a little differently", "Pick a new style"] };
    }
    // f) storage
    const img = await fetch(src);
    if (!img.ok) throw new Error("fetch output failed");
    const type = img.headers.get("content-type") ?? "image/png";
    const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
    const path = `${userId}/${child.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await a.storage.from(BUCKET).upload(path, new Uint8Array(await img.arrayBuffer()), { contentType: type });
    if (error) throw error;
    const [url] = await signPaths([path]);
    return { ok: true, path, url: url!, prompt };
  } catch (e) {
    await refund();
    console.error("image pipeline", e);
    return { ok: false, reply: e instanceof Error && e.message.startsWith("Bugley") ? e.message : "Oops, my paintbrush slipped! Your glow is back. Try again?" };
  }
}
