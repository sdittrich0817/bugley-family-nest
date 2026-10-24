// Server-only Studio core: the safety guard every piece of child text passes through, plus album writes.
import { comicCoachingInstructions } from "./comic";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { aiObject } from "@/lib/studio-ai.server";
import { BLOCK_REPLY, DEFAULT_CHIPS, findFamilyName, quickPersonalCheck, type GuardDecision } from "@/lib/studio-guard";
import { storyCoachingInstructions } from "./story";

type Sb = SupabaseClient<any>;
async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

export async function loadChild(sb: Sb, userId: string, childId: string) {
  const { data } = await sb.from("children").select("id,nickname,age,age_band,bugley_stage").eq("id", childId).eq("parent_id", userId).maybeSingle();
  if (!data) throw new Error("We couldn’t find that player.");
  return data as { id: string; nickname: string; age: number; age_band: string; bugley_stage: string };
}

async function familyNames(sb: Sb, userId: string) {
  const [{ data: kids, error: kidError }, { data: prof, error: profileError }] = await Promise.all([
    sb.from("children").select("nickname").eq("parent_id", userId),
    sb.from("profiles").select("first_name,last_name").eq("id", userId).maybeSingle(),
  ]);
  if (kidError || profileError) throw new Error('Bugley needs a moment to check privacy safely.');
  return [...(kids ?? []).flatMap((k: any) => [k.nickname, ...k.nickname.split(/\s+/)]), prof?.first_name, prof?.last_name].filter(Boolean) as string[];
}

const guardSchema = z.object({
  category: z.enum(["ok", "personal_info", "unsafe", "copyright"]),
  suggestions: z.array(z.string()),
});

const GUARD_INSTRUCTIONS = (age: number) => `You are a strict safety checker for a creative studio used by a child aged ${age}. Classify the child's text.
- "personal_info": the text reveals something real about the child or people they know: a real school, street, address, their own hometown or neighborhood, phone, email, birthday, or a real person's full name. Made-up character names (like "Max") and famous faraway places (Paris, the Moon, Mount Everest) are fine.
- "unsafe": violent, gory, sexual, hateful, bullying, profanity, rude insults, grown-up content, self-harm, drugs, weapons used to hurt, or scarier than a picture book for that age.
- "copyright": asks for a famous existing character, franchise, brand, celebrity, or "in the style of" a specific studio or artist.
- "ok": everything else.
If more than one applies, prefer personal_info, then unsafe, then copyright.
Also give exactly 2 short (max 7 words), playful, original, kid-safe idea suggestions related to what they seemed to want.`;

export type GuardResult = { decision: GuardDecision; reply?: string | undefined; chips?: string[] | undefined; eventId?: string };

/** Every piece of child text must pass this before reaching any AI model. Logs every decision. */
export async function guardChildText(sb: Sb, userId: string, child: { id: string; nickname: string; age: number }, text: string, source: string): Promise<GuardResult> {
  const names = await familyNames(sb, userId);
  let decision: GuardDecision | "error";
  let chips: string[] | undefined;
  const nameHit = findFamilyName(text, names);
  if (quickPersonalCheck(text, names)) decision = "personal_info";
  else {
    const verdict = await aiObject(guardSchema, GUARD_INSTRUCTIONS(child.age), text);
    if (!verdict) decision = "error";
    else {
      decision = verdict.category === "ok" ? "allowed" : verdict.category;
      chips = undefined; // Only audited fixed alternatives are shown after a rejection.
    }
  }
  const blocked = decision === "error" ? "unsafe" : decision;
  const reply = blocked === "allowed" ? undefined : BLOCK_REPLY[blocked];
  if (blocked !== "allowed" && (!chips || chips.length < 2)) chips = DEFAULT_CHIPS[blocked];
  const a = await admin();
  const { data: event, error: eventError } = await a.from("studio_events").insert({ parent_id: userId, child_id: child.id, source, input: text.slice(0, 2000), decision, reply: reply ?? null }).select('id').single();
  if (eventError || !event) throw new Error('Bugley couldn’t save this safety check. Please try again.');
  if (decision === "personal_info") {
    const starter = nameHit
      ? `${child.nickname} tried to use a real family name in the Studio today. It’s a great moment to talk about why we keep personal details private online.`
      : `${child.nickname} tried to share a real personal detail in the Studio today. It’s a great moment to talk about why we keep names, places and other personal details private online.`;
    const { error } = await a.from("parent_notifications").insert({ parent_id: userId, child_id: child.id, typed: text.slice(0, 2000), starter });
    if (error) throw new Error('Bugley couldn’t notify your grown-up. Please try a made-up idea later.');
  }
  return blocked === "allowed" ? { decision: "allowed", eventId: event.id } : { decision: blocked, reply, chips, eventId: event.id };
}

const BAND_VOICE: Record<string, string> = {
  sprouts: "The child is 5–6. Use very short, simple words. One or two tiny sentences.",
  explorers: "The child is 7–9. Use adventure words like missions and quests. Two or three short sentences.",
  builders: "The child is 10–12. Be a bit cooler and calmer, talk about projects. Two or three short sentences.",
};

const replySchema = z.object({ reply: z.string(), chips: z.array(z.string()) });

export async function bugleyReply(child: { nickname: string; age_band: string }, text: string, context: string) {
  const instructions = `You are Bugley, a friendly firefly sidekick in a kids' creative studio. Personality: curious, warm, encouraging, a little funny. Short sentences. You ask questions more than you give answers. You are a helper, never the author: never write the child's story or decide for them; help them think and choose. You are an AI helper, not a person and not a real friend; if asked, say so kindly. Never ask for personal details. ${BAND_VOICE[child.age_band] ?? BAND_VOICE['explorers']}
Where the child is: ${context}. Picture Maker, Character Creator, Story Maker and Comic Maker are ready; Games are still being built. ${storyCoachingInstructions(child.age_band)} In the Comic Maker: ${comicCoachingInstructions()} In the Picture Maker, coach the description with ONE question that makes it richer (time of day, what's in the background, colors, weather, feelings). In the Character Creator, ask about looks, clothes, colors or one special detail. Never describe the picture for them.
Also give exactly 3 short (max 6 words) reply chips the child could tap next.`;
  const out = await aiObject(replySchema, instructions, text);
  if (!out) return { reply: "Hmm, my glow flickered! Can you tell me that again?", chips: ["Tell me a fun fact", "Give me an idea"] };
  return { reply: out.reply.slice(0, 500), chips: out.chips.map((c) => c.slice(0, 50)).filter(Boolean).slice(0, 3) };
}

/** For future makers: save a creation after its text has passed the guard. */
export async function saveCreation(userId: string, row: { child_id: string; kind: string; title: string; project?: string | null; position?: number; body?: string | null; images?: string[] }) {
  const { data, error } = await (await admin()).from("studio_creations").insert({ parent_id: userId, ...row }).select("id").single();
  if (error) throw new Error("We couldn’t save that creation.");
  return data.id as string;
}
