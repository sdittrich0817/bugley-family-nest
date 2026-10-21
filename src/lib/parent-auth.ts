import { z } from "zod";

export const CONSENT_VERSION = "2026-10-21";
export const CONSENT_TEXT = "Bugley collects each child’s first name or nickname, age, chosen avatar, and what they create. We use this information to tailor age-appropriate activities, display their avatar, and save their creations to their own shelf. Parents can view or delete their children’s information and creations anytime. Children do not need an email address. No ads. We never sell your family’s data. I agree to Bugley collecting and using my child’s information for these purposes. I am the parent or legal guardian and I am 18 or older.";
export const parentSignupSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  adultAttested: z.literal(true, { errorMap: () => ({ message: "Only parents or legal guardians aged 18 or older may create accounts." }) }),
});
export const consentSchema = z.object({ agreed: z.literal(true), version: z.literal(CONSENT_VERSION) });
export const loginSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(128) });
export const emailSchema = z.string().trim().email().max(255);
export const passwordSchema = z.string().min(8, "Use at least 8 characters.").max(128);
export function isActiveParent(user: { email_confirmed_at?: string; user_metadata: Record<string, unknown> } | null) {
  return Boolean(user?.email_confirmed_at && user.user_metadata['adult_attested'] === true && user.user_metadata['parental_consent'] === true);
}
export function accountHead(title: string, description: string) {
  return { meta: [{ title: `${title} — Bugley` }, { name: "description", content: description }, { property: "og:title", content: `${title} — Bugley` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] };
}