import { useScrollTopOn } from "@/lib/scroll";
import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountFrame, AccountField } from "@/components/site/AccountFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { parentSignupSchema, consentSchema, CONSENT_VERSION, accountHead } from "@/lib/parent-auth";
import { useParentSession } from "@/components/site/ParentSession";

export const Route = createFileRoute("/signup")({ head: () => accountHead("Create your parent account", "Join Bugley with a verified parent account and clear parental consent."), component: Signup });
function Signup() {
  const [details, setDetails] = useState<{ firstName: string; lastName: string; email: string; password: string; adultAttested: true } | null>(null);
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); useScrollTopOn(`${!!details}|${sent}`);
  const { user } = useParentSession();
  const navigate = useNavigate();
  function next(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = parentSignupSchema.safeParse({ firstName: fd.get("firstName"), lastName: fd.get("lastName"), email: fd.get("email"), password: fd.get("password"), adultAttested: adult });
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Check your details."); return; }
    setDetails(result.data); setError("");
  }
  async function createAccount() {
    if (!details || !consentSchema.safeParse({ agreed, version: CONSENT_VERSION }).success) { setError("Please actively agree before continuing."); return; }
    setBusy(true); setError("");
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email: details.email, password: details.password, options: { emailRedirectTo: `${window.location.origin}/login`, data: { first_name: details.firstName, last_name: details.lastName, adult_attested: true, parental_consent: true, consent_version: CONSENT_VERSION } } });
      if (authError) throw authError;
      setEmail(details.email); setDetails(null); setSent(true);
      if (data.session) await navigate({ to: "/setup" });
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn’t create your account. Please try again."); }
    finally { setBusy(false); }
  }
  if (user) return <AccountFrame title="You're already signed in" subtitle="Your parent account is ready."><Button asChild className="w-full"><Link to="/hub">Parent Hub</Link></Button></AccountFrame>;
  if (sent) return <AccountFrame title="Check your email" subtitle={`We sent a confirmation link to ${email}. Your account won't be active until you verify your email.`}><p className="mb-6 text-center text-sm text-muted-foreground">Check your spam folder, too. If you already have an account, log in instead.</p><Button asChild className="w-full"><Link to="/login">Go to log in</Link></Button></AccountFrame>;
  return <AccountFrame title={details ? "Your family. Your permission." : "Welcome to Bugley"} subtitle={details ? "Step 2 of 2 · Parental consent" : "Step 1 of 2 · Create your parent account"}>
    {details ? <div className="space-y-6">
      <div className="space-y-4 leading-relaxed"><h2 className="text-xl">What we collect about children</h2><p>Their <strong>first name or nickname, age, chosen avatar, and what they create</strong>.</p><h2 className="text-xl">Why we collect it</h2><p>To tailor age-appropriate activities, display their avatar, and save their creations to their own shelf.</p><h2 className="text-xl">You're in charge</h2><p>You can view or delete your children’s information and creations anytime. Children don’t need an email address.</p><p>No ads. We never sell your family’s data.</p><p className="text-sm text-muted-foreground">After verifying your email, you’ll set up your children’s profiles and choose a PIN or picture password for each. Studio play and sessions are coming soon.</p></div>
      <div className="flex items-start gap-3"><Checkbox id="consent" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} /><Label htmlFor="consent" className="leading-relaxed">I agree to Bugley collecting and using my child’s information for the purposes explained above.</Label></div>
      <p className="text-sm text-muted-foreground">Your agreement is saved with today’s date and this consent version. <Link to="/privacy" className="underline">Privacy policy</Link></p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={busy || !agreed} onClick={createAccount}>{busy ? "Creating your account…" : "Agree and create account"}</Button>
      <Button variant="ghost" className="w-full" disabled={busy} onClick={() => { setDetails(null); setError(""); }}>Back</Button>
    </div> : <form onSubmit={next} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2"><AccountField id="firstName" label="Parent first name"><Input id="firstName" name="firstName" autoComplete="given-name" maxLength={80} required /></AccountField><AccountField id="lastName" label="Parent last name"><Input id="lastName" name="lastName" autoComplete="family-name" maxLength={80} required /></AccountField></div>
      <AccountField id="email" label="Email"><Input id="email" name="email" type="email" autoComplete="email" maxLength={255} required /></AccountField>
      <AccountField id="password" label="Password"><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /><p className="text-sm text-muted-foreground">At least 8 characters.</p></AccountField>
      <div className="flex items-start gap-3"><Checkbox id="adult" checked={adult} onCheckedChange={(v) => setAdult(v === true)} /><Label htmlFor="adult" className="leading-relaxed">I am the parent or legal guardian and I'm 18 or older.</Label></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full">Continue to parental consent</Button>
      <p className="text-center text-sm">Already have an account? <Link to="/login" className="underline">Log in</Link></p>
    </form>}
  </AccountFrame>;
}