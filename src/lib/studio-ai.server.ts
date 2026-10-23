// Server-only: every Studio AI call goes through here. Never import from browser code.
import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const MODEL = "openai/gpt-6-astra";
const BASE = "https://ai.gateway.lovable.dev/v1";

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  let runId: string | undefined;
  return createOpenAI({
    baseURL: BASE,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID")?.trim() || undefined;
      return res;
    },
  });
}

/** Streams a structured answer and returns the parsed object, or null on any failure. */
export async function aiObject<T extends z.ZodTypeAny>(schema: T, instructions: string, input: string): Promise<z.infer<T> | null> {
  try {
    const result = streamText({
      model: provider().responses(MODEL),
      instructions,
      messages: [{ role: "user", content: input }],
      output: Output.object({ schema }),
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    return (await result.output) as z.infer<T>;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) console.error("studio ai: no object", e.text?.slice(0, 200));
    else console.error("studio ai failed", e);
    return null;
  }
}
