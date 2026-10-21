import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { demoSchema } from "./demo";

export const requestDemo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => demoSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { error } = await client.from("demo_requests").insert({
      leader_name: data.leaderName,
      email: data.email.toLowerCase(),
      group_name: data.groupName,
      city_state: data.cityState,
      families_count: data.familiesCount,
      age_range: data.ageRange,
      notes: data.notes || null,
    });
    if (error) {
      console.error("demo request insert failed", error);
      return { ok: false as const };
    }
    return { ok: true as const };
  });
