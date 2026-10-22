import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountFrame, AccountField } from "@/components/site/AccountFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, accountHead } from "@/lib/parent-auth";
import { useParentSession } from "@/components/site/ParentSession";
export const Route = createFileRoute("/login")({ head: () => accountHead("Parent log in", "Log in securely to your Bugley parent account."), component: Login });
function Login() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const navigate = useNavigate(); const { user } = useParentSession();
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    if (hash.get("error_description")) {
      setError("This confirmation link is invalid or expired. Please request a new confirmation by signing up again.");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    if (!access || !refresh) return;
    async function confirm() {
      const { error: authError } = await supabase.auth.setSession({ access_token: access ?? "", refresh_token: refresh ?? "" });
      window.history.replaceState(null, "", window.location.pathname);
      if (authError) { setError("This confirmation link is invalid or expired."); return; }
      await navigate({ to: "/hub", replace: true });
    }
    void confirm();
  }, [navigate]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { setError("Enter a valid email and password."); return; }
    setBusy(true); setError("");
    try { const { error: authError } = await supabase.auth.signInWithPassword(parsed.data); if (authError) throw authError; await navigate({ to: "/hub" }); }
    catch (err) { setError(err instanceof Error ? err.message : "We couldn’t log you in."); } finally { setBusy(false); }
  }
  return <AccountFrame title="Welcome back, parent" subtitle="Your family's next chapter starts here.">{user ? <Button asChild className="w-full"><Link to="/hub">Parent Hub</Link></Button> : <form onSubmit={submit} className="space-y-5"><AccountField id="email" label="Email"><Input id="email" name="email" type="email" autoComplete="email" maxLength={255} required /></AccountField><AccountField id="password" label="Password"><Input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required /></AccountField><Link to="/forgot-password" className="inline-block text-sm underline">Forgot password?</Link>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy} className="w-full">{busy ? "Logging in…" : "Log in"}</Button><p className="text-center text-sm">New to Bugley? <Link to="/signup" className="underline">Create a parent account</Link></p></form>}</AccountFrame>;
}