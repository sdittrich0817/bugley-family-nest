import { z } from "zod";

export const waitlistSchema = z.object({
  firstName: z.string().trim().min(1, "Please share your first name").max(80),
  email: z.string().trim().email("That email doesn't look quite right").max(255),
  kidsCount: z.coerce.number().int().min(0).max(20),
  source: z.enum(["start_free", "log_in"]).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
