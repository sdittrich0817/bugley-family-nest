import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { credentialSchema, credentialValue } from "@/lib/family";

export const verifyChildLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ childId: z.string().uuid(), credential: credentialSchema }).parse(input))
  .handler(async ({ data, context }) => {
    // Confirm the child belongs to this verified parent (RLS) before reading the secret.
    const { data: owned } = await context.supabase.from("children").select("id,login_kind").eq("id", data.childId).eq("parent_id", context.userId).maybeSingle();
    if (!owned) throw new Error("We couldn’t find that player.");
    if (owned.login_kind !== data.credential.kind) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: secret } = await supabaseAdmin.from("children").select("credential_hash,credential_salt").eq("id", data.childId).single();
    if (!secret) return { ok: false };
    const salt = new Uint8Array(secret.credential_salt.match(/../g)!.map((h: string) => parseInt(h, 16)));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(credentialValue(data.credential)), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
    const hex = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
    let diff = hex.length ^ secret.credential_hash.length;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ (secret.credential_hash.charCodeAt(i) || 0);
    return { ok: diff === 0 };
  });
