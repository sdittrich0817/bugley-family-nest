import { z } from "zod";

export const AGE_RANGES = ["6–8", "9–11", "12–15", "Mixed 6–15"] as const;

export const demoSchema = z.object({
  leaderName: z.string().trim().min(1, "Please share your name").max(100),
  email: z.string().trim().email("That email doesn't look quite right").max(255),
  groupName: z.string().trim().min(1, "What's your co-op or group called?").max(150),
  cityState: z.string().trim().min(1, "Where are you based?").max(120),
  familiesCount: z.coerce.number({ message: "How many families?" }).int().min(1, "At least 1 family").max(1000),
  ageRange: z.enum(AGE_RANGES, { message: "Pick an age range" }),
  notes: z.string().trim().max(1000).optional(),
});

export type DemoInput = z.infer<typeof demoSchema>;
