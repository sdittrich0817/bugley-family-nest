import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tmp-guard-check")({
  server: { handlers: { GET: async () => {
    const { aiObject } = await import("@/lib/studio-ai.server");
    const { z } = await import("zod");
    const schema = z.object({ category: z.enum(["ok", "personal_info", "unsafe", "copyright"]), suggestions: z.array(z.string()) });
    const ins = "Classify a child's creative studio text as ok, personal_info (real school/address/hometown), unsafe, or copyright (famous characters/brands). Give 2 short kid-safe suggestions.";
    const out = await Promise.all(["a dragon who loves pancakes", "draw Spider-Man fighting Batman", "I live in Overland Park near the big park"].map((t) => aiObject(schema, ins, t)));
    return Response.json(out);
  } } },
});
