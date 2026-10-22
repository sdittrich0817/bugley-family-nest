import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Award, BookHeart, ChevronRight, Clock, CreditCard, Download, FileText, Gift, Play, Settings, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import { familyOptions } from "@/lib/family.functions";
import { controlsOptions, saveChildControls } from "@/lib/hub.functions";
import { DEFAULT_CONTROLS, STRANDS, THIS_WEEK, TIME_LIMITS, type ChildControls } from "@/lib/hub";
import type { ChildProfile } from "@/lib/family";
import { accountHead } from "@/lib/parent-auth";
import { ChildAvatar } from "@/components/site/ChildAvatar";
import { Bugley } from "@/components/brand/Bugley";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/hub")({
  head: () => accountHead("Parent Hub", "Your family’s home base: this week’s session, your kids’ progress, and controls."),
  loader: async ({ context }) => {
    const family = await context.queryClient.ensureQueryData(familyOptions);
    if (!family.completed) throw redirect({ to: "/setup" });
    await context.queryClient.ensureQueryData(controlsOptions);
  },
  errorComponent: ({ error }) => <div role="alert" className="container-page py-16 text-center">{error.message}</div>,
  component: Hub,
});

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6";

function Hub() {
  const { data: family } = useSuspenseQuery(familyOptions);
  const { data: controls } = useSuspenseQuery(controlsOptions);
  return <section className="container-page py-8 sm:py-12">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl sm:text-4xl">Parent Hub</h1><p className="text-muted-foreground">Everything for your family, in one calm place.</p></div>
        <Button asChild size="lg"><Link to="/kids"><Users />Go to Kid Zone</Link></Button>
      </div>

      <ThisWeek />

      <Section title="My kids">
        <div className="grid gap-4 md:grid-cols-2">{family.children.map((c) => <KidCard key={c.id} child={c} />)}</div>
      </Section>

      <Section title="Activity">
        <div className={`${card} flex flex-col items-center gap-3 py-10 text-center`}>
          <Bugley stage="scout" expression="sleepy" size={72} />
          <p className="text-muted-foreground">Your kids’ creations will show up here.</p>
        </div>
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
            <li className="flex items-center gap-3 px-5 py-4 text-muted-foreground"><CreditCard className="size-5" /><span className="flex-1">Billing</span><Badge variant="secondary">Coming soon</Badge></li>
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

function ThisWeek() {
  const [showScript, setShowScript] = useState(false);
  return <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-glow sm:p-7">
    <p className="text-sm font-semibold uppercase tracking-wide">This week · {THIS_WEEK.season}</p>
    <h2 className="mt-1 text-2xl sm:text-3xl">{THIS_WEEK.title}</h2>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl bg-card p-4 text-card-foreground"><p className="flex items-center gap-2 font-semibold"><Clock className="size-4" />5-minute parent primer</p><p className="mt-2 text-sm leading-relaxed">{THIS_WEEK.primer}</p></div>
      <div className="rounded-xl bg-card p-4 text-card-foreground">
        <button className="flex w-full items-center gap-2 font-semibold" onClick={() => setShowScript(!showScript)} aria-expanded={showScript}><FileText className="size-4" />Session script<ChevronRight className={`ml-auto size-4 transition ${showScript ? "rotate-90" : ""}`} /></button>
        {showScript ? <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{THIS_WEEK.script.map((s) => <li key={s}>{s}</li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">50 minutes, step by step. Tap to open.</p>}
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Download className="size-4" />Printables: coming soon</p>
      </div>
    </div>
    <Button size="lg" variant="secondary" className="mt-5" disabled><Play />Start family session</Button>
    <p className="mt-2 text-sm">Family Table mode is coming soon.</p>
  </div>;
}

function KidCard({ child }: { child: ChildProfile }) {
  return <div className={card}>
    <div className="flex items-center gap-3">
      <ChildAvatar avatar={child.avatar} className="size-14 shrink-0" />
      <div className="min-w-0"><h3 className="break-words text-lg">{child.nickname}</h3><p className="text-sm capitalize text-muted-foreground">{child.age_band} · Bugley {child.bugley_stage}</p></div>
      <Bugley stage={child.bugley_stage} size={44} className="ml-auto shrink-0" />
    </div>
    <p className="mt-4 flex items-center gap-2 text-sm"><Award className="size-4" />1 badge earned · Joined the crew</p>
    <div className="mt-4 space-y-2">{STRANDS.map((s) => <div key={s} className="flex items-center gap-3 text-sm"><span className="w-24">{s}</span><div className="h-2 flex-1 rounded-full bg-muted" role="progressbar" aria-label={`${s} progress`} aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} /></div>)}</div>
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
    <div className="flex items-center gap-3"><ChildAvatar avatar={child.avatar} className="size-10" /><h3 className="text-lg">{child.nickname}</h3></div>
    <label className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><Clock className="size-4" />Daily time limit</span>
      <select className="h-10 rounded-lg border border-input bg-background px-3" value={state.daily_minutes ?? ""} onChange={(e) => void update({ daily_minutes: e.target.value ? Number(e.target.value) : null })}>
        {TIME_LIMITS.map((m) => <option key={m ?? "none"} value={m ?? ""}>{m ? `${m} min` : "No limit"}</option>)}
      </select></label>
    <div className="mt-3 space-y-3">{toggles.map(([k, label]) => <label key={k} className="flex items-center justify-between text-sm"><span>{label}</span><Switch checked={state[k] as boolean} onCheckedChange={(v) => void update({ [k]: v })} /></label>)}</div>
    <Button variant="secondary" className="mt-5 w-full" onClick={() => toast("Gifting bonus glow is coming soon.")}><Gift />Gift bonus glow</Button>
  </div>;
}
