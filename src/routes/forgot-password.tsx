import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountFrame, AccountField } from "@/components/site/AccountFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailSchema, accountHead } from "@/lib/parent-auth";
export const Route = createFileRoute("/forgot-password")({ head: () => accountHead("Forgot password", "Request a secure password reset for your Bugley parent account."), component: Forgot });
function Forgot() {
  const [status, setStatus] = useState("idle"); const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const parsed = emailSchema.safeParse(new FormData(e.currentTarget).get("email"));
    if (!parsed.success) { setError("Enter a valid email address."); return; } setStatus("sending"); setError("");
    try { const { error: authError } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${window.location.origin}/reset-password` }); if (authError) throw authError; setStatus("done"); } catch { setError("We couldn’t send a reset link. Please try again shortly."); setStatus("idle"); }
  }
  return <AccountFrame title={status === "done" ? "Check your email" : "Forgot your password?"} subtitle={status === "done" ? "If an account exists for that address, a reset link is on its way. Check your spam folder, too." : "We'll send you a secure link to choose a new one."}>{status !== "done" && <form onSubmit={submit} className="space-y-5"><AccountField id="email" label="Email"><Input id="email" name="email" type="email" autoComplete="email" maxLength={255} required /></AccountField>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send reset link"}</Button></form>}<Button asChild variant="ghost" className="mt-4 w-full"><Link to="/login">Back to log in</Link></Button></AccountFrame>;
}