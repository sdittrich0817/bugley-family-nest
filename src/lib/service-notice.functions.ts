// Temporary service notices (e.g. drawing service resting). Rows are toggled in the database; only active ones are readable.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

export const getDrawingNotice = createServerFn({ method: "GET" }).handler(async () => {
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
  const { data } = await client.from("service_notices").select("message").eq("key", "drawing").eq("active", true).maybeSingle();
  return { message: data?.message ?? null };
});

export const drawingNoticeOptions = queryOptions({ queryKey: ["service-notice", "drawing"], queryFn: () => getDrawingNotice(), staleTime: 60_000 });
