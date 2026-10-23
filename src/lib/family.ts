import { z } from "zod";
export const AVATARS = ["fox", "bunny", "bear", "cat", "frog", "owl"] as const;
export const PICTURES = ["sun", "moon", "flower", "fish", "apple", "star"] as const;
export const MAX_CHILDREN = 5;
export function agePlacement(age: number) {
  if (!Number.isInteger(age) || age < 5 || age > 12) throw new Error("Choose an age from 5 to 12.");
  return { age_band: age <= 6 ? "sprouts" : age <= 9 ? "explorers" : "builders", bugley_stage: age <= 6 ? "grub" : age <= 8 ? "hatchling" : age <= 10 ? "scout" : age === 11 ? "engineer" : "navigator" } as const;
}
export const credentialSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pin"), pin: z.string().regex(/^\d{4}$/, "Choose exactly 4 digits.") }),
  z.object({ kind: z.literal("pictures"), pictures: z.array(z.enum(PICTURES)).length(3, "Choose 3 pictures in order.") }),
]);
export const childDetailsSchema = z.object({
  nickname: z.string().trim().replace(/\s+/g, " ").min(1, "Enter a first name or nickname.").max(40).regex(/^\S+( \S+)?$/, "Use a first name or nickname of up to two words, like “Mary Kate”. No last names, please."),
  age: z.number().int().min(5).max(12),
  avatar: z.enum(AVATARS),
});
export const saveChildSchema = childDetailsSchema.extend({ id: z.string().uuid().optional(), credential: credentialSchema.optional() }).superRefine((value, ctx) => {
  if (!value.id && !value.credential) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a child login.", path: ["credential"] });
});
export type SaveChildInput = z.infer<typeof saveChildSchema>;
export type ChildProfile = { id: string; nickname: string; age: number; avatar: typeof AVATARS[number]; login_kind: "pin" | "pictures"; age_band: string; bugley_stage: "grub" | "hatchling" | "scout" | "engineer" | "navigator" };
export function credentialValue(credential: z.infer<typeof credentialSchema>) {
  return credential.kind === "pin" ? `pin:${credential.pin}` : `pictures:${credential.pictures.join(",")}`;
}