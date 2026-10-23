import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { StudioActivity } from "@/components/site/StudioActivity";
import { ParentBooks } from "@/components/site/ParentBooks";
import { ParentPrints } from "@/components/site/ParentPrints";
import { ParentGames } from "@/components/site/ParentGames";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { giftGlow, setFamilyTimezone } from "@/lib/glow.functions";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, BookHeart, ChevronRight, Clock, CreditCard, Download, FileText, Gift, Play, ShieldCheck, UserRound, Users } from "lucide-react";
import { familyOptions } from "@/lib/family.functions";
import { controlsOptions, saveChildControls } from "@/lib/hub.functions";
import { DEFAULT_CONTROLS, STRANDS, TIME_LIMITS, type ChildControls } from "@/lib/hub";
import { familyCurriculumOptions } from "@/lib/curriculum.functions";
import { isAdminOptions } from "@/lib/admin.functions";
import type { ChildProfile } from "@/lib/family";
import { accountHead } from "@/lib/parent-auth";
import { ChildAvatar } from "@/components/site/ChildAvatar";
import { Bugley } from "@/components/brand/Bugley";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { billingOptions, createPortalSession } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/hub")({
  head: () => accountHead("Parent Hub", "Your family’s home base: this week’s session, your kids’ progress, and controls."),
  loader: async ({ context }) => {
    const family = await context.queryClient.ensureQueryData(familyOptions);
    if (!family.completed) throw redirect({ to: "/setup" });
    await Promise.all([context.queryClient.ensureQueryData(controlsOptions), context.queryClient.ensureQueryData(familyCurriculumOptions), context.queryClient.ensureQueryData(isAdminOptions)]);
  },
  errorComponent: ({ error }) => <div role="alert" className="container-page py-16 text-center">{error instanceof Error ? error.message : "Something went wrong."}</div>,
  component: Hub,
});

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6";

function Hub() {
  const { data: family } = useSuspenseQuery(familyOptions);
  const { data: controls } = useSuspenseQuery(controlsOptions);
  const { data: cur } = useSuspenseQuery(familyCurriculumOptions);
  const { data: isAdmin } = useSuspenseQuery(isAdminOptions);
  useEffect(() => { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz) void setFamilyTimezone({ data: { tz } }).catch(() => {}); }, []);
  return <section className="container-page py-8 sm:py-12">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl sm:text-4xl">Parent Hub</h1><p className="text-muted-foreground">Everything for your family, in one calm place.</p></div>
        <div className="flex flex-wrap gap-2">{isAdmin && <Button asChild variant="secondary"><Link to="/admin">Curriculum admin</Link></Button>}<Button asChild size="lg"><Link to="/kids"><Users />Go to Kid Zone</Link></Button></div>
      </div>

      <PlanNotice />
      <ThisWeek current={cur.current} />

      <Section title="My kids">
        <div className="grid gap-4 md:grid-cols-2">{family.children.map((c) => <KidCard key={c.id} child={c} badges={cur.badges[c.id] ?? []} skills={cur.skills[c.id] ?? {}} totals={cur.strandTotals} />)}</div>
      </Section>

      <Section title="Activity">
        <StudioActivity kids={family.children} />
        <ParentPrints kids={family.children} />
        <ParentBooks kids={family.children} />
        <ParentGames />
      </Section>

      <Section title="Controls">
        <div className="grid gap-4 md:grid-cols-2">{family.children.map((c) => <ControlsCard key={c.id} child={c} value={controls[c.id] ?? DEFAULT_CONTROLS} />)}</div>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Family portfolio">
          <div className={card}>
            <div className="flex items-start gap-3"><BookHeart className="mt-1 size-6 shrink-0" /><div><h3 className="text-lg">Family Story Book</h3><p className="text-sm text-muted-foreground">Collect your kids’ stories and comics into a printed book, shipped home.</p><Badge variant="secondary" className="mt-2">Coming soon</Badge></div></div>
            <div className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">Saved work will appear here once your kids start creating.</div>
          </div>
        </Section>
        <Section title="Settings">
          <ul className={`${card} divide-y divide-border p-0 sm:p-0`}>
            <SettingRow to="/settings" icon={<Users />} label="Manage children" hint="Names, avatars, logins" />
            <SettingRow to="/account" icon={<UserRound />} label="Account" hint="Your parent profile" />
            <SettingRow to="/account" icon={<ShieldCheck />} label="Consent" hint="Your recorded agreement" />
            <BillingRow />
          </ul>
        </Section>
      </div>
    </div>
  </section>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="mb-3 text-xl">{title}</h2>{children}</div>;
}
function SettingRow({ to, icon, label, hint }: { to: "/settings" | "/account"; icon: React.ReactNode; label: string; hint: string }) {
  return <li><Link to={to} className="flex items-center gap-3 px-5 py-4 hover:bg-muted [&_svg]:size-5">{icon}<span className="flex-1"><span className="block font-medium">{label}</span><span className="text-sm text-muted-foreground">{hint}</span></span><ChevronRight /></Link></li>;
}

function ThisWeek({ current }: { current: any }) {
  const [showScript, setShowScript] = useState(false);
  if (!current) return <div className={card}><h2 className="text-xl">This week</h2><p className="mt-2 text-muted-foreground">Your first session is on its way.</p></div>;
  const steps = String(current.script).split("\n").map((x: string) => x.trim()).filter(Boolean);
  return <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-glow sm:p-7">
    <p className="text-sm font-semibold uppercase tracking-wide">This week · {current.season.title} · Unit {current.unit.number} · Week {current.week_number}</p>
    <h2 className="mt-1 text-2xl sm:text-3xl">{current.title}</h2>
    {current.unit.family_question && <p className="mt-2 font-medium">Family question: {current.unit.family_question}</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl bg-card p-4 text-card-foreground"><p className="flex items-center gap-2 font-semibold"><Clock className="size-4" />5-minute parent primer</p><p className="mt-2 text-sm leading-relaxed">{current.parent_primer}</p>
        {current.unit.dinner_question && <p className="mt-3 text-sm"><span className="font-semibold">Dinner question:</span> {current.unit.dinner_question}</p>}</div>
      <div className="rounded-xl bg-card p-4 text-card-foreground">
        <button className="flex w-full items-center gap-2 font-semibold" onClick={() => setShowScript(!showScript)} aria-expanded={showScript}><FileText className="size-4" />Session script<ChevronRight className={`ml-auto size-4 transition ${showScript ? "rotate-90" : ""}`} /></button>
        {showScript ? <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{steps.map((x: string) => <li key={x}>{x}</li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">{steps.length} steps. Tap to open.</p>}
        <div className="mt-3 space-y-1 text-sm">{current.printables.length ? current.printables.map((p: any) => p.url && <a key={p.id} href={p.url} className="flex items-center gap-2 underline"><Download className="size-4" />{p.title}</a>) : <p className="flex items-center gap-2 text-muted-foreground"><Download className="size-4" />No printables this week</p>}</div>
      </div>
    </div>
    <Button asChild size="lg" variant="secondary" className="mt-5"><Link to="/table"><Play />Start family session</Link></Button>
  </div>;
}

function KidCard({ child, badges, skills, totals }: { child: ChildProfile; badges: string[]; skills: Record<string, number>; totals: Record<string, number> }) {
  return <div className={card}>
    <div className="flex items-center gap-3">
      <ChildAvatar avatar={child.bug ?? child.avatar} seed={child.id} className="size-14 shrink-0" />
      <div className="min-w-0"><h3 className="break-words text-lg">{child.nickname}</h3><p className="text-sm capitalize text-muted-foreground">{child.age_band} · Bugley {child.bugley_stage}</p></div>
      <Bugley stage={child.bugley_stage} size={44} className="ml-auto shrink-0" />
    </div>
    <p className="mt-4 flex items-center gap-2 text-sm"><Award className="size-4" />{badges.length ? `${badges.length} badge${badges.length > 1 ? "s" : ""}: ${badges.join(", ")}` : "No badges yet"}</p>
    <div className="mt-4 space-y-2">{STRANDS.map((s) => <div key={s} className="flex items-center gap-3 text-sm"><span className="w-24">{s}</span>{(() => { const k = s.toLowerCase(); const pct = totals[k] ? Math.round(((skills[k] ?? 0) / totals[k]) * 100) : 0; return <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${s} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>; })()}</div>)}</div>
    <p className="mt-2 text-xs text-muted-foreground">Skills fill in as {child.nickname} completes sessions.</p>
  </div>;
}

function ControlsCard({ child, value }: { child: ChildProfile; value: ChildControls }) {
  const qc = useQueryClient();
  const [state, setState] = useState(value);
  async function update(patch: Partial<ChildControls>) {
    const next = { ...state, ...patch }; const prev = state; setState(next);
    try { await saveChildControls({ data: { childId: child.id, ...next } }); void qc.invalidateQueries({ queryKey: ["child-controls"] }); }
    catch { setState(prev); toast.error("We couldn’t save that change."); }
  }
  const toggles: [keyof ChildControls, string][] = [["studio_stories", "Studio: Stories"], ["studio_games", "Studio: Games"], ["read_aloud", "Bugley reads aloud"]];
  return <div className={card}>
    <div className="flex items-center gap-3"><ChildAvatar avatar={child.bug ?? child.avatar} seed={child.id} className="size-10" /><h3 className="text-lg">{child.nickname}</h3></div>
    <label className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><Clock className="size-4" />Daily time limit</span>
      <select className="h-10 rounded-lg border border-input bg-background px-3" value={state.daily_minutes ?? ""} onChange={(e) => void update({ daily_minutes: e.target.value ? Number(e.target.value) : null })}>
        {TIME_LIMITS.map((m) => <option key={m ?? "none"} value={m ?? ""}>{m ? `${m} min` : "No limit"}</option>)}
      </select></label>
    <div className="mt-3 space-y-3">{toggles.map(([k, label]) => <label key={k} className="flex items-center justify-between text-sm"><span>{label}</span><Switch checked={state[k] as boolean} onCheckedChange={(v) => void update({ [k]: v })} /></label>)}</div>
    <GiftGlow child={child} />
  </div>;
}

function GiftGlow({ child }: { child: ChildProfile }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(3);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const r = await giftGlow({ data: { childId: child.id, amount, reason } }); toast.success(`Sent ${amount} glow to ${child.nickname}. They now have ${r.total}.`); setOpen(false); setReason(""); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Couldn’t gift glow."); } finally { setBusy(false); }
  }
  return <>
    <Button variant="secondary" className="mt-5 w-full" onClick={() => setOpen(true)}><Gift />Gift bonus glow</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Gift glow to {child.nickname}</DialogTitle><DialogDescription>Bonus glow is used after today’s glow and stays until it’s spent.</DialogDescription></DialogHeader>
      <form onSubmit={send} className="space-y-4">
        <div className="flex flex-wrap gap-2">{[1, 3, 5, 10].map((n) => <Button key={n} type="button" variant={amount === n ? "default" : "secondary"} onClick={() => setAmount(n)}>{n} glow</Button>)}</div>
        <label className="block text-sm"><span className="mb-1 block font-medium">Reason (optional)</span><Input value={reason} maxLength={120} placeholder="Finished a mission!" onChange={(e) => setReason(e.target.value)} /></label>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : `Gift ${amount} glow`}</Button>
      </form>
    </DialogContent></Dialog>
  </>;
}

function useBilling() { const env = getStripeEnvironment(); return { env, ...useQuery(billingOptions(env)) }; }

function PlanNotice() {
  const { data } = useBilling();
  if (!data || (data.active && data.status !== "past_due")) return null;
  const pastDue = data.status === "past_due";
  return <div role="status" className={`${card} flex flex-wrap items-center gap-4 border-primary`}>
    <Bugley stage="scout" expression={pastDue ? "oops" : "sleepy"} size={56} />
    <div className="min-w-0 flex-1"><h2 className="text-lg">{pastDue ? "Your last payment didn’t go through" : data.status ? "The Kid Zone is paused" : "Start your free trial"}</h2>
      <p className="text-sm text-muted-foreground">{pastDue ? "Please update your payment method to keep the Kid Zone open." : data.status ? "Your family’s work and creations are safe. Restart a plan to open the Kid Zone again." : "Pick a plan to open the Kid Zone. Every plan starts with 14 days free."}</p></div>
    {pastDue ? <PortalButton label="Update payment" /> : <Button asChild><Link to="/plan">Choose a plan</Link></Button>}
  </div>;
}

function PortalButton({ label, variant }: { label: string; variant?: "secondary" }) {
  const { env } = useBilling(); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { const r = await createPortalSession({ data: { environment: env, returnUrl: `${window.location.origin}/hub` } }); if ("error" in r) throw new Error(r.error); window.open(r.url, "_blank"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t open billing."); } finally { setBusy(false); }
  }
  return <Button variant={variant} disabled={busy} onClick={() => void go()}>{busy ? "Opening…" : label}</Button>;
}

function BillingRow() {
  const { data } = useBilling();
  const planName = data?.plan === "family_plus" ? "Family Plus" : data?.plan === "family" ? "Family" : null;
  const yearly = data?.priceId?.endsWith("yearly");
  const end = data?.periodEnd ? new Date(data.periodEnd).toLocaleDateString() : null;
  const hint = !data ? "Loading…" : !data.status ? "No plan yet" : `${planName ?? "Plan"}${yearly ? " (yearly)" : " (monthly)"} · ${data.status === "trialing" ? `free trial until ${end}` : data.cancelAtPeriodEnd ? `ends ${end}` : data.active ? `renews ${end}` : "paused"}`;
  return <li className="flex flex-wrap items-center gap-3 px-5 py-4"><CreditCard className="size-5" /><span className="flex-1"><span className="block font-medium">Billing</span><span className="text-sm text-muted-foreground">{hint}</span></span>
    {data?.hasCustomer ? <PortalButton label="Manage billing" variant="secondary" /> : <Button asChild variant="secondary" size="sm"><Link to="/plan">Choose a plan</Link></Button>}</li>;
}
