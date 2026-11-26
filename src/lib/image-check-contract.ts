import { z } from "zod";
import { presenceRule } from "./cover-cast";

export const imageSafetySchema = z.object({ safe: z.boolean(), has_text: z.boolean() });
export const IMAGE_SAFETY_INSTRUCTIONS = "You review images made for a children's creative app (ages 5–12). safe=false if the image has anything violent, gory, scary beyond a picture book, sexual, suggestive, hateful, drug-related, a realistic photo of a real-looking person, or a famous copyrighted character or logo. has_text=true if it contains any words, letters, numbers, signs, captions, logos or speech bubbles, including tiny or partly readable writing.";
export const imageDriftSchema = z.object({ pass: z.boolean(), score: z.number().min(0).max(100), issues: z.string().max(300) });
export function imageDriftRequest(dna: string, style: string, request: string, mustShow: string[] = []) {
  return {
    instructions: "You check character consistency for a children's book. The FIRST image is a new scene; the others are the character reference set. Compare each locked character in the scene to its references and DNA: same colors, same outfit, same special item, same features and markings, same art style. Changes the request explicitly asks for are allowed. score 0-100 for match; pass=true only if every locked character clearly matches (score >= 70)." + presenceRule(mustShow),
    input: `Character DNA: ${dna}\nArt style: ${style}\nScene request: ${request}`,
  };
}