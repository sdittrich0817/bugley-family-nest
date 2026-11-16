import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { demoSchema } from "./demo";

/** Public co-op demo request: validated, rate-limited per IP and email, inserted server-side only. */
export const requestDemo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => demoSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { submitDemoRequest } = await import("./demo.server");
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    return submitDemoRequest(supabaseAdmin as never, ip, data);
  });
