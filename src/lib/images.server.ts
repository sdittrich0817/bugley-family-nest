// Server-only image pipeline: guard -> glow -> server-built prompt -> Replicate -> image safety check -> drift check -> storage.
// Character Lock: heroes carry a reference set + fixed "Character DNA"; books lock their style and model.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { aiObject } from "@/lib/studio-ai.server";
import { chargeGlow, refundGlow } from "@/lib/glow.server";
import { guardChildText, loadChild } from "@/lib/studio.server";
import { enrichPictureIdea } from "./picture";
import { passesCharacterCheck } from './image-consistency';
import { imageFileType, MAX_IMAGE_BYTES, allowedImageContentType } from './image-file';

type Sb = SupabaseClient<any>;
export type ImageMode = "sketch" | "final" | "character";
type ModelMode = "sketch" | "final" | "character" | "hero" | "sheet" | "scene_chars" | "scene";
export type ModelRow = { model: string; version: string; settings: Record<string, unknown>; supports_reference?: boolean };
const GW = "https://connector-gateway.lovable.dev/replicate/v1";
export const BUCKET = "studio-images";
const SAFETY_SUFFIX = "Kid-friendly, wholesome, gentle and joyful, suitable for a children's picture book. Absolutely no text, no words, no letters, no numbers, no captions, no signs, no logos, no speech bubbles anywhere in the image.";
export const SLEEPY = "I’m all out of glow for today! Let’s write the next page and I’ll draw it tomorrow.";
const FAMILY_LIMIT = "My glow needs a rest for now. Let’s write the next page and draw it later!";
const NOT_READY = "My paintbrush isn’t ready yet! A grown-up at Bugley is still setting it up.";
export const MAX_LOCKED = 3;

async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

export function buildPrompt(recipe: string, description: string, mode: ImageMode | "sheet") {
  const framing = mode === "character"
    ? "A single character, clean full-body portrait, standing, facing the viewer, whole body visible head to toe, centered on a plain soft white background, no scenery."
    : mode === "sheet"
      ? "A clean character reference sheet of the exact same character from the reference image: one full-body front view, one full-body side view, and one happy face close-up, side by side on a plain white background, identical colors, outfit and markings in every view."
      : "";
  return [recipe, framing, description, SAFETY_SUFFIX].filter(Boolean).join(". ").replace(/\.\s*\./g, ".");
}

async function loadModel(mode: ModelMode): Promise<ModelRow | null> {
  const { data } = await (await admin()).from("image_models").select("model,version,settings,supports_reference").eq("mode", mode).maybeSingle();
  return data?.model ? { model: data.model, version: data.version, settings: (data.settings ?? {}) as Record<string, unknown>, supports_reference: data.supports_reference } : null;
}
const takesRefs = (m: ModelRow, n: number) => {
  const s = m.settings as { reference_field?: string; reference_single?: boolean };
  return !!s.reference_field && (m.supports_reference ?? true) && !(s.reference_single && n > 1);
};

async function replicateRun(model: ModelRow, prompt: string, refs: string[]) {
  const lovable = process.env["LOVABLE_API_KEY"], key = process.env["REPLICATE_API_KEY"];
  if (!lovable || !key) throw new Error("Image making isn’t set up yet.");
  const headers = { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json", Prefer: "wait=55" };
  const { reference_field, reference_single, ...settings } = model.settings as { reference_field?: string; reference_single?: boolean };
  const input: Record<string, unknown> = { ...settings, prompt };
  if (refs.length && !takesRefs(model, refs.length)) throw new Error('Bugley needs a paintbrush that can use every reference.');
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
  const v = await aiObject(checkSchema, "You review images made for a children's creative app (ages 5–12). safe=false if the image has anything violent, gory, scary beyond a picture book, sexual, suggestive, hateful, drug-related, a realistic photo of a real-looking person, or a famous copyrighted character or logo. has_text=true if it contains any words, letters, numbers, signs, captions, logos or speech bubbles, including tiny or partly readable writing.", "Review this image.", url);
  return v ? v.safe && !v.has_text : false; // fail closed; words never belong inside images
}

const driftSchema = z.object({ pass: z.boolean(), score: z.number().min(0).max(100), issues: z.string().max(300) });
async function driftCheck(image: string, refs: string[], dna: string, style: string, request: string) {
  const v = await aiObject(driftSchema,
    "You check character consistency for a children's book. The FIRST image is a new scene; the others are the character reference set. Compare each locked character in the scene to its references and DNA: same colors, same outfit, same special item, same features and markings, same art style. Changes the request explicitly asks for are allowed. score 0-100 for match; pass=true only if every locked character clearly matches (score >= 70).",
    `Character DNA: ${dna}\nArt style: ${style}\nScene request: ${request}`, [image, ...refs.slice(0, 6)]);
  return v ?? { pass: false, score: 0, issues: "check unavailable" };
}

async function store(src: string, userId: string, childId: string, printSize = false) {
  if(new URL(src).protocol!=='https:')throw new Error('Invalid image output');
  const img = await fetch(src,{signal:AbortSignal.timeout(30000)});
  if (!img.ok) throw new Error("fetch output failed");
  const declared=img.headers.get('content-type')?.split(';')[0];
  if(!allowedImageContentType(declared)||Number(img.headers.get('content-length')??0)>MAX_IMAGE_BYTES||!img.body)throw new Error('Invalid image output');
  const reader=img.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_IMAGE_BYTES)throw new Error('Image output too large');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const type=imageFileType(bytes);if(!type||(declared?.startsWith('image/')&&type!==declared))throw new Error('Invalid image output');
  if (printSize) {
    const png = bytes.length >= 24 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (!png || view.getUint32(16) < 2550 || view.getUint32(20) < 2550) throw new Error("Bugley couldn’t make that picture big enough to print. Your glow is back.");
  }
  const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
  const path = `${userId}/${childId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await (await admin()).storage.from(BUCKET).upload(path, bytes, { contentType: type });
  if (error) throw error;
  return path;
}

export async function signPaths(paths: string[]) {
  if (!paths.length) return [] as string[];
  const { data } = await (await admin()).storage.from(BUCKET).createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl ?? "");
}

type Locked = { title: string; dna: string; refs: string[] };
async function loadLocked(sb: Sb, userId: string, childId: string, ids: string[], styleKey: string): Promise<Locked[] | null> {
  if (!ids.length) return [];
  const { data: cast } = await sb.from("studio_creations").select("title,images,details,style_key").eq("parent_id", userId).eq("child_id", childId).eq("kind", "character").is("deleted_at", null).in("id", ids);
  if ((cast ?? []).length !== ids.length || (cast ?? []).some((c: any) => !c.images?.[0] || c.style_key !== styleKey || !c.details?.dna || !c.details?.refs?.length)) return null;
  return Promise.all((cast ?? []).map(async (c: any) => {
    const d = c.details ?? {};
    const refs = await signPaths([...(c.images ?? []).slice(0, 1), ...((d.refs ?? []) as string[])].filter(Boolean));
    if (refs.some(r => !r)) throw new Error('Bugley couldn’t open every character reference.');
    return { title: c.title, dna: d.dna, refs };
  }));
}

/** The book's model lock: snapshot the scene model the first time a locked character is drawn; reuse it forever after. */
async function lockedModel(lockId: string | undefined, fallback: ModelRow | null): Promise<ModelRow | null> {
  if (!lockId) return fallback;
  const a = await admin();
  const { data: row } = await a.from("studio_creations").select("id,details").eq("id", lockId).maybeSingle();
  if (!row) return fallback;
  const d = (row.details ?? {}) as { bookId?: string; modelLock?: ModelRow };
  const target = d.bookId ? (await a.from("studio_creations").select("id,details").eq("id", d.bookId).maybeSingle()).data ?? row : row;
  const td = (target.details ?? {}) as { modelLock?: ModelRow };
  if (td.modelLock?.model) return td.modelLock;
  if (!fallback) return null;
  await a.from("studio_creations").update({ details: { ...td, modelLock: fallback } as never }).eq("id", target.id);
  return fallback;
}

export type GenResult = { ok: true; path: string; url: string; prompt: string; lock?: ModelRow | undefined } | { ok: false; reply: string; chips?: string[] };

export async function generateImage(sb: Sb, userId: string, input: { childId: string; description: string; styleKey: string; mode: ImageMode; characterIds: string[]; requireReferences?: boolean; lockId?: string; pictureFlow?: boolean; previewPath?: string; op?: string }): Promise<GenResult> {
  const child = await loadChild(sb, userId, input.childId);
  // 1) safety guard
  const guard = await guardChildText(sb, userId, child, input.description, input.mode === "character" ? "character" : "picture");
  if (guard.decision !== "allowed") return { ok: false, reply: guard.reply ?? "Let’s try a new idea!", chips: guard.chips ?? [] };
  const a = await admin();
  const ids = [...new Set(input.characterIds)];
  if (ids.length > MAX_LOCKED) return { ok: false, reply: 'Choose up to three heroes.' };
  const withChars = ids.length > 0 && input.mode !== "character";
  const modeKey: ModelMode = input.pictureFlow ? input.mode : input.mode === "character" ? "hero" : withChars ? "scene_chars" : input.mode === "final" && input.requireReferences ? "scene" : input.mode;
  const [{ data: currentStyle }, base] = await Promise.all([
    a.from("art_styles").select("name,recipe").eq("key", input.styleKey).eq("active", true).maybeSingle(),
    loadModel(modeKey).then(async (m) => m ?? (modeKey === "hero" ? loadModel("character") : modeKey === "scene" || modeKey === "scene_chars" ? loadModel("final") : null)),
  ]);
  let style = currentStyle;
  let model = base;
  if (input.lockId) {
    const { data: row } = await a.from('studio_creations').select('details').eq('id', input.lockId).eq('parent_id', userId).eq('child_id', child.id).maybeSingle();
    if (!row) return { ok: false, reply: 'Your saved book couldn’t be opened.' };
    const details = row.details as any;
    const { data: book } = details?.bookId ? await a.from('studio_creations').select('details').eq('id',details.bookId).eq('parent_id',userId).eq('child_id',child.id).maybeSingle() : { data: row };
    const existing = (book?.details as any)?.artLock;
    const fallbackModel = (book?.details as any)?.modelLock ?? base;
    if (!existing && (!currentStyle || !fallbackModel)) return { ok: false, reply: NOT_READY };
    const snapshot = existing ?? { styleKey: input.styleKey, style: currentStyle, model: fallbackModel };
    const { data: saved, error } = await a.rpc('lock_studio_art', { _id: input.lockId, _snapshot: snapshot });
    if (error || !saved) return { ok: false, reply: 'Your book’s look couldn’t be safely locked. Please try again.' };
    const lock = saved as any;
    if (lock.styleKey !== input.styleKey) return { ok: false, reply: 'This book keeps its original look.' };
    style = lock.style; model = lock.model;
  }
  if (!style) return { ok: false, reply: "Pick a style first!" };
  if (!model) return { ok: false, reply: NOT_READY };
  const upgrade = input.pictureFlow === true && input.mode === "final" && !!input.previewPath;
  if (upgrade) {
    if (!input.previewPath?.startsWith(`${userId}/${child.id}/`) || !takesRefs(model, 1)) return { ok: false, reply: "My paintbrush needs matching-picture settings first. Your preview is safe!" };
    if (model.model === "google/nano-banana-pro") model = { ...model, settings: { ...model.settings, resolution: "4K", output_format: "png" } };
  }
  let locked: Locked[] = [];
  if (withChars) {
    if (!takesRefs(model, ids.length)) return { ok: false, reply: "My paintbrush needs a grown-up to set up matching character pictures first. Your words are safe!" };
    const l = await loadLocked(sb, userId, child.id, ids, input.styleKey);
    if (!l) return { ok: false, reply: "Choose a hero with matching reference pictures in this look. Your words are safe." };
    locked = l;
    if (!takesRefs(model, locked.flatMap(c => c.refs).length + (upgrade ? 1 : 0))) return { ok: false, reply: 'My paintbrush needs to use every hero reference first.' };
  }
  // 2) glow
  const kind = upgrade ? "picture_upgrade" : input.mode === "final" ? "picture" : "sketch";
  const charge = await chargeGlow(sb, userId, child.id, kind, input.mode === "character" ? "Hero picture" : input.mode === "final" ? "Final picture" : "Sketch");
  if (!charge.ok) return { ok: false, reply: charge.reason === "family_limit" ? FAMILY_LIMIT : SLEEPY };
  const refund = () => giftGlowServer(sb, userId, child.id, charge.cost ?? (upgrade ? 2 : kind === "picture" ? 3 : 1), "Refund: picture didn’t work").catch(() => {});
  try {
    // 3) server-built prompt; Character DNA inserted word for word
    const dna = locked.map((c) => `${c.title} — ${c.dna}`).join(" | ");
    const idea = input.pictureFlow ? enrichPictureIdea(input.description) : input.description;
    const description = locked.length ? `${idea}. Featuring these characters looking EXACTLY as in the reference images and exactly as described (do not change their look unless the scene asks): ${dna}` : idea;
    const prompt = buildPrompt(style.recipe, description, input.mode);
    const previewRefs = upgrade && input.previewPath ? await signPaths([input.previewPath]) : [];
    const refs = [...previewRefs, ...locked.flatMap((c) => c.refs)];
    const paintPrompt = upgrade ? `${prompt}. The first reference is the child's chosen preview: preserve its exact composition, subjects, poses, setting and colors; refine details and clarity at full print resolution.` : prompt;
    // 4–6) model, safety, drift (up to 2 free retries; keep the best match)
    let best: { src: string; score: number } | null = null;
    const requestId = crypto.randomUUID();
    for (let attempt = 1; attempt <= (locked.length ? 3 : 1); attempt++) {
      const src = await replicateRun(model, paintPrompt, refs);
      if (!(await imageIsSafe(src))) {
        if (attempt < 3 && locked.length) continue;
        await refund();
        await a.from("studio_events").insert({ parent_id: userId, child_id: child.id, source: input.mode, input: input.description.slice(0, 2000), decision: "unsafe", reply: "Image blocked by safety check" });
        return { ok: false, reply: "Hmm, that picture didn’t come out right, so I tossed it. Your glow is back! Let’s try a new idea.", chips: ["Try it a little differently", "Pick a new style"] };
      }
      if (!locked.length) { best = { src, score: 100 }; break; }
      const d = await driftCheck(src, locked.flatMap((c) => c.refs), dna, style.name, input.description);
      const passed = passesCharacterCheck(d);
      const { error: logError } = await a.from("drift_checks").insert({ parent_id: userId, child_id: child.id, model: model.model, model_version: model.version, request_id: requestId, creation_id: input.lockId ?? null, style_key: input.styleKey, attempt, passed, score: Math.round(d.score), notes: d.issues, checker_available: d.issues !== 'check unavailable', delivered: passed });
      if (logError) throw new Error('Character check couldn’t be recorded.');
      if (passed) { best = { src, score: d.score }; break; }
    }
    if (!best) throw new Error("Bugley couldn’t match your hero safely. Your glow is back. Let’s try again.");
    // 7) storage
    const path = await store(best.src, userId, child.id, upgrade);
    const [url] = await signPaths([path]);
    if (!url) throw new Error("image signing failed");
    if(input.mode==='character'){
      const {error}=await a.from('hero_portrait_provenance').insert({path,parent_id:userId,child_id:child.id,style_key:input.styleKey,model:JSON.parse(JSON.stringify(model))});
      if(error)throw new Error('Hero provenance couldn’t save.');
    }
    return { ok: true, path, url, prompt: paintPrompt, lock: input.lockId ? model : undefined };
  } catch (e) {
    await refund();
    console.error("image pipeline", e);
    return { ok: false, reply: e instanceof Error && e.message.startsWith("Bugley") ? e.message : "Oops, my paintbrush slipped! Your glow is back. Try again?" };
  }
}

/** Hero Builder step 6: three hero options in one go for one glow. Nothing is saved to the album until the child picks one. */
export async function generateHeroOptions(sb: Sb, userId: string, input: { childId: string; styleKey: string; description: string; op?: string }) {
  const child = await loadChild(sb, userId, input.childId);
  const guard = await guardChildText(sb, userId, child, input.description, "character");
  if (guard.decision !== "allowed") return { ok: false as const, reply: guard.reply!, chips: guard.chips ?? [] };
  const a = await admin();
  const [{ data: style }, model] = await Promise.all([
    a.from("art_styles").select("recipe").eq("key", input.styleKey).eq("active", true).maybeSingle(),
    loadModel("hero").then((m) => m ?? loadModel("character")),
  ]);
  if (!style) return { ok: false as const, reply: "Pick a style first!" };
  if (!model) return { ok: false as const, reply: NOT_READY };
  const charge = await chargeGlow(sb, userId, child.id, "sketch", "Hero options", input.op);
  if (!charge.ok) return { ok: false as const, reply: charge.reason === "family_limit" ? FAMILY_LIMIT : SLEEPY };
  const prompt = buildPrompt(style.recipe, input.description, "character");
  const results = await Promise.allSettled([0, 1, 2].map(async () => {
    const src = await replicateRun(model, prompt, []);
    if (!(await imageIsSafe(src))) throw new Error("unsafe");
    const path = await store(src, userId, child.id);
    const { error } = await a.from('hero_portrait_provenance').insert({path,parent_id:userId,child_id:child.id,style_key:input.styleKey,model:JSON.parse(JSON.stringify(model))});
    if (error) throw new Error('Hero provenance couldn’t save.');
    return path;
  }));
  const paths = results.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
  if (!paths.length) {
    await refundGlow(sb, userId, child.id, charge.cost ?? 1, "Refund: hero didn’t work").catch(() => {});
    return { ok: false as const, reply: "Oops, my paintbrush slipped! Your glow is back. Try again?" };
  }
  const urls = await signPaths(paths);
  return { ok: true as const, options: paths.map((path, i) => ({ path, url: urls[i] ?? "" })), model: { model: model.model, version: model.version } };
}

const dnaSchema = z.object({ dna: z.string().min(20).max(700) });
/** Character Lock: from the chosen picture, build the reference sheet and the fixed Character DNA. Runs behind the scenes, no glow. */
export async function lockCharacter(userId: string, childId: string, input: { path: string; styleKey: string; hint: string }) {
  const a = await admin();
  const [chosen] = await signPaths([input.path]);
  const { data: style } = await a.from("art_styles").select("recipe").eq("key", input.styleKey).maybeSingle();
  const sheetModel = (await loadModel("sheet")) ?? (await loadModel("character"));
  const refs: string[] = [];
  const sheetJob = (async () => {
    if (!sheetModel || !chosen || !takesRefs(sheetModel, 1)) return;
    try {
      const src = await replicateRun(sheetModel, buildPrompt(style?.recipe ?? "", input.hint, "sheet"), [chosen]);
      if (await imageIsSafe(src)) refs.push(await store(src, userId, childId));
    } catch (e) { console.error("character sheet", e); }
  })();
  const dnaJob = chosen ? aiObject(dnaSchema,
    "Write a precise, fixed visual description (Character DNA) of the single character in this children's-book image, for an illustrator to reproduce exactly. Include: species/type, body shape and size, exact colors of every part (e.g. 'bright orange fur, cream belly'), outfit, their special item, eye color, and any markings. One paragraph, plain words, no names of real people or brands, no story.",
    `The child described them as: ${input.hint}`, chosen) : Promise.resolve(null);
  const [, dna] = await Promise.all([sheetJob, dnaJob]);
  if (!refs.length || !dna?.dna || !sheetModel) throw new Error('Your hero’s matching pictures aren’t ready. Please try again; your chosen portrait is safe.');
  return { refs, dna: dna.dna, model: { model: sheetModel.model, version: sheetModel.version } };
}
