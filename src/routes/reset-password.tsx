import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountFrame, AccountField } from "@/components/site/AccountFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passwordSchema, accountHead } from "@/lib/parent-auth";
export const Route = createFileRoute("/reset-password")({ head: () => accountHead("Reset password", "Set a new password using your secure Bugley recovery link."), component: Reset });
function Reset() {
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    async function recover() {
      if (hash.get("type") !== "recovery") { setError("Open the password reset link from your email to continue."); return; }
      const access = hash.get("access_token"); const refresh = hash.get("refresh_token");
      if (!access || !refresh) { setError("This reset link is invalid. Please request a new one."); return; }
      const { data, error: authError } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
      if (mounted) { setReady(Boolean(data.session) && !authError); if (authError) setError("This reset link has expired. Please request a new one."); }
      window.history.replaceState(null, "", window.location.pathname);
    }
    void recover(); return () => { mounted = false; };
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!ready) return;
    const fd = new FormData(e.currentTarget); const parsed = passwordSchema.safeParse(fd.get("password"));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your password."); return; }
    if (parsed.data !== fd.get("confirm")) { setError("Your passwords don’t match."); return; }
    setBusy(true); setError("");
    try { const { error: authError } = await supabase.auth.updateUser({ password: parsed.data }); if (authError) throw authError; setDone(true); }
    catch (err) { setError(err instanceof Error ? err.message : "We couldn’t update your password."); } finally { setBusy(false); }
  }
  return <AccountFrame title={done ? "Password updated" : "Choose a new password"} subtitle={done ? "Your new password is ready to use." : "A fresh start for your parent account."}>{ready && !done && <form onSubmit={submit} className="space-y-5"><AccountField id="password" label="New password"><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></AccountField><AccountField id="confirm" label="Confirm new password"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required maxLength={128} /></AccountField><Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button></form>}{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<Button asChild variant="ghost" className="mt-4 w-full"><Link to={done ? "/hub" : "/forgot-password"}>{done ? "Parent Hub" : "Request a new reset link"}</Link></Button></AccountFrame>;
}