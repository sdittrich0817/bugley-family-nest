import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FamilyHistory } from "@/components/site/FamilyHistory";
import { FamilyNews } from "@/components/site/FamilyNews";
import { ChildReport } from "@/components/site/ChildReport";
import { studioActivityOptions, markNotificationRead } from "@/lib/studio.functions";
import { setPlayerPolicies } from "@/lib/kid-zone";
import { useServerFn } from "@tanstack/react-start";
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
import { Award, BookHeart, ChevronRight, Clock, CreditCard, Download, FileText, Gift, Heart, Lightbulb, MessageCircle, RefreshCw, Sparkles, Play, ShieldCheck, UserRound, Users } from "lucide-react";
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

const card = "rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6";

function Hub() {
  const { data: family } = useSuspenseQuery(familyOptions);
  const { data: controls } = useSuspenseQuery(controlsOptions);
  const { data: cur } = useSuspenseQuery(familyCurriculumOptions);
  const { data: isAdmin } = useSuspenseQuery(isAdminOptions);
  useEffect(() => { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz) void setFamilyTimezone({ data: { tz } }).catch(() => {}); }, []);
  return <section className="container-page py-8 sm:py-12">
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Sparkles className="size-4" />YOUR FAMILY’S NEXT LITTLE ADVENTURE</p><h1 className="text-3xl sm:text-4xl">Parent Hub</h1><p className="mt-2 text-muted-foreground">Less worry. More wonder. Together.</p></div>
        <div className="flex flex-wrap gap-2">{isAdmin && <Button asChild variant="secondary"><Link to="/admin">Admin</Link></Button>}<Button asChild><Link to="/kids"><Users />Kid Zone</Link></Button><Button asChild variant="outline"><Link to="/settings">Family settings</Link></Button></div>
      </div>
      <PlanNotice />
      <ImportantUpdates kids={family.children} />
      <FamilyNews />
      <Section title="Your crew"><div className="grid gap-4 md:grid-cols-2">{family.children.map(c=><div key={c.id} className={card}>
        <div className="flex items-center gap-3"><ChildAvatar avatar={c.bug??c.avatar} seed={c.id} className="size-16 shrink-0"/><div className="min-w-0 flex-1"><h3 className="break-words text-xl">{c.nickname}</h3><p className="mt-1 text-sm capitalize text-muted-foreground">{c.age_band} · {(cur.badges[c.id]??[]).length} badges</p></div><Bugley stage={c.bugley_stage} expression="happy" size={54}/></div>
        <ChildReport child={c}/>
        <details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer font-semibold">Time &amp; Studio controls</summary><ControlsCard child={c} value={controls[c.id]??DEFAULT_CONTROLS}/></details>
        <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Learning progress</summary><KidCard child={c} badges={cur.badges[c.id]??[]} skills={cur.skills[c.id]??{}} totals={cur.strandTotals}/></details>
      </div>)}</div></Section>
      <FamilyGuidance />
      <ThisWeek current={cur.current}/>
      <section className="border-y border-border py-6"><details><summary className="cursor-pointer font-display text-xl">Family activity history</summary><div className="mt-5"><FamilyHistory kids={family.children}/></div></details></section>
      <section className="space-y-4"><details><summary className="cursor-pointer font-display text-xl">Creations, books &amp; printing</summary><div className="mt-5 space-y-5"><ParentPrints kids={family.children}/><ParentBooks kids={family.children}/><ParentGames/></div></details><details><summary className="cursor-pointer font-semibold">Studio conversations &amp; recently deleted</summary><div className="mt-4"><StudioActivity kids={family.children}/></div></details></section>
      <section className="border-t border-border pt-6"><h2 className="mb-3 text-xl">Account &amp; family</h2><ul className="divide-y divide-border"><SettingRow to="/settings" icon={<Users/>} label="Children & trusted devices" hint="Profiles, secrets and device access"/><SettingRow to="/account" icon={<ShieldCheck/>} label="Your account & consent" hint="Parent details and privacy"/><BillingRow/></ul></section>
    </div>
  </section>;
}

function ImportantUpdates({ kids }: { kids: ChildProfile[] }) {
  const {data,isError,refetch} = useQuery({...studioActivityOptions,refetchInterval:60000});
  const qc = useQueryClient();
  const mark = useServerFn(markNotificationRead);
  const unread = data?.notifications.filter((n:any)=>!n.read)??[];
  const latest = data?.creations[0];
  return <section className="border-b border-border pb-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl">What matters today</h2><Button variant="ghost" size="icon" title="Refresh updates" aria-label="Refresh updates" onClick={()=>void refetch()}><RefreshCw/></Button></div>
    {isError ? <p role="alert">Updates couldn’t load. Refresh to try again.</p> : !data ? <p role="status">Checking your family’s latest…</p> : <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg bg-leaf p-5 text-leaf-foreground"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>{unread.length ? `${unread.length} updates need your attention` : 'You’re all caught up'}</p><p className="mt-2 text-sm">{unread.length ? 'Bugley kept personal information private. A little family conversation can help.' : 'No unread personal-information alerts. Your family sets the pace.'}</p></div>
      <div className="rounded-lg bg-accent p-5 text-accent-foreground"><p className="flex items-center gap-2 font-semibold"><BookHeart className="size-5"/>{latest ? 'A little spark worth celebrating' : 'Your next spark starts together'}</p><p className="mt-2 break-words text-sm">{latest ? `${kids.find(k=>k.id===latest.child_id)?.nickname??'Your child'} created “${latest.title}”. Ask what inspired it!` : 'Ask your child: “What would you love to create?” Their idea comes first.'}</p></div>
    </div>}
    {unread.map((n:any)=><details key={n.id} className="mt-4 border-l-4 border-primary pl-4"><summary className="cursor-pointer font-semibold">{kids.find(k=>k.id===n.child_id)?.nickname??'Your child'} · personal-information alert</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm">They shared: “{n.typed}”</p><p className="mt-2 text-sm text-muted-foreground">{n.starter}</p><Button variant="secondary" size="sm" className="mt-3" onClick={async()=>{try{await mark({data:{id:n.id}});await qc.invalidateQueries({queryKey:studioActivityOptions.queryKey});}catch{toast.error('Couldn’t mark this update as read.');}}}>Mark as read</Button></details>)}
  </section>;
}
function FamilyGuidance() {
  const [topic,setTopic]=useState(0);
  const guidance=[
    {label:'Why AI matters',title:'Not more screen time. More good judgment.',body:'AI is already part of the world your child will grow up in. Learning to question its guesses, notice mistakes and make their own choices helps them become a thoughtful user—not just a button-pusher.',question:'“How could we check whether that answer is true?”'},
    {label:'When you’re worried',title:'You don’t have to have all the answers.',body:'Concerns about privacy, mistakes and too much screen time are real. You can start small, set boundaries and stay curious together. Bugley is here to support that conversation, not replace you or your child’s judgment.',question:'“What should we keep private, even when a tool asks?”'},
    {label:'Try together',title:'Let their idea lead the way.',body:'Ask your child to explain a creation or show you an AI mistake they caught. Celebrate their imagination and the moment they disagree with a machine. Creating, checking and choosing together builds confidence.',question:'“What did you decide yourself, and what did AI help with?”'},
  ];
  const current=guidance[topic];
  if (!current) return null;
  return <section className="grid items-center gap-6 bg-accent/40 px-5 py-7 sm:grid-cols-[110px_1fr] sm:px-7"><Bugley stage="navigator" expression="curious" glow size={110} className="mx-auto"/><div><p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Heart className="size-4"/>IN YOUR CORNER</p><div role="tablist" aria-label="Family AI guidance" className="mb-4 flex flex-wrap gap-2">{guidance.map((g,i)=><Button key={g.label} role="tab" aria-selected={topic===i} variant={topic===i?'default':'ghost'} size="sm" onClick={()=>setTopic(i)}>{g.label}</Button>)}</div><div role="tabpanel"><h2 className="text-2xl">{current.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.body}</p><p className="mt-4 flex items-start gap-2 text-sm font-semibold"><MessageCircle className="mt-0.5 size-4 shrink-0"/>{current.question}</p></div></div></section>;
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
  return <section className="border-y border-border py-6">
    <p className="text-sm font-semibold uppercase tracking-wide">This week · {current.season.title} · Unit {current.unit.number} · Week {current.week_number}</p>
    <h2 className="mt-1 text-2xl sm:text-3xl">{current.title}</h2>
    {current.unit.family_question && <p className="mt-2 font-medium">Family question: {current.unit.family_question}</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="py-2"><p className="flex items-center gap-2 font-semibold"><Clock className="size-4" />5-minute parent primer</p><p className="mt-2 text-sm leading-relaxed">{current.parent_primer}</p>
        {current.unit.dinner_question && <p className="mt-3 text-sm"><span className="font-semibold">Dinner question:</span> {current.unit.dinner_question}</p>}</div>
      <div className="py-2">
        <Button variant="ghost" className="flex w-full items-center gap-2 px-0 font-semibold" onClick={() => setShowScript(!showScript)} aria-expanded={showScript}><FileText className="size-4" />Session script<ChevronRight className={`ml-auto size-4 transition ${showScript ? "rotate-90" : ""}`} /></Button>
        {showScript ? <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{steps.map((x: string) => <li key={x}>{x}</li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">{steps.length} steps. Tap to open.</p>}
        <div className="mt-3 space-y-1 text-sm">{current.printables.length ? current.printables.map((p: any) => p.url && <a key={p.id} href={p.url} className="flex items-center gap-2 underline"><Download className="size-4" />{p.title}</a>) : <p className="flex items-center gap-2 text-muted-foreground"><Download className="size-4" />No printables this week</p>}</div>
      </div>
    </div>
    <Button asChild size="lg" variant="secondary" className="mt-5"><Link to="/table"><Play />Start family session</Link></Button>
  </section>;
}

function KidCard({ child, badges, skills, totals }: { child: ChildProfile; badges: string[]; skills: Record<string, number>; totals: Record<string, number> }) {
  return <div className="pt-4">
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
  const [saving,setSaving]=useState(false);
  const save = useServerFn(saveChildControls);
  useEffect(()=>setState(value),[value]);
  async function update(patch: Partial<ChildControls>) {
    if(saving)return;
    const next = { ...state, ...patch }; const prev = state; setState(next); setSaving(true);
    try { await save({ data: { childId: child.id, ...next } }); await qc.invalidateQueries({ queryKey: ["child-controls"] }); const latest=qc.getQueryData<Record<string,ChildControls>>(["child-controls"]);if(latest)setPlayerPolicies(Object.fromEntries(Object.entries(latest).map(([id,c])=>[id,c.remember_login]))); toast.success("Saved"); }
    catch { setState(prev); toast.error("We couldn’t save that change."); } finally {setSaving(false);}
  }
  const toggles: [keyof ChildControls, string][] = [["studio_stories", "Studio: Stories"], ["studio_games", "Studio: Games"], ["read_aloud", "Bugley reads aloud"], ["spelling_help", "Story spelling help"]];
  return <fieldset disabled={saving} className="mt-4 min-w-0 space-y-4 disabled:opacity-60">
    <label className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><ShieldCheck className="size-4"/>Remember child login</span><select aria-label={`Remember login for ${child.nickname}`} className="h-11 rounded-lg border border-input bg-background px-3" value={state.remember_login} onChange={e=>void update({remember_login:e.target.value as ChildControls['remember_login']})}><option value="always">Always</option><option value="24_hours">24 hours</option></select></label>
    <p className="text-xs text-muted-foreground">{state.remember_login==='always'?'Stay signed in on this device until switching players or signing out.':'Re-enter the same PIN or picture password 24 hours after signing in.'} Daily time limits still apply.</p>
    <label className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><Clock className="size-4" />Daily time limit</span>
      <select aria-label={`Daily time limit for ${child.nickname}`} className="h-11 rounded-lg border border-input bg-background px-3" value={state.daily_minutes ?? ""} onChange={(e) => void update({ daily_minutes: e.target.value ? Number(e.target.value) : null })}>
        {TIME_LIMITS.map((m) => <option key={m ?? "none"} value={m ?? ""}>{m ? `${m} min` : "No limit"}</option>)}
      </select></label>
    <div className="mt-3 space-y-3">{toggles.map(([k, label]) => <label key={k} className="flex items-center justify-between text-sm"><span>{label}</span><Switch checked={state[k] as boolean} onCheckedChange={(v) => void update({ [k]: v })} /></label>)}</div>
    <GiftGlow child={child} />
  </fieldset>;
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
