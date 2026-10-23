import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, BookOpen, Delete, Lock, Sparkles, Users, Volume2 } from "lucide-react";
import { familyOptions } from "@/lib/family.functions";
import { verifyChildLogin } from "@/lib/kid.functions";
import { completeActivity, getChildMission } from "@/lib/curriculum.functions";
import { getChildGlow } from "@/lib/glow.functions";
import { isGlowLow } from "@/lib/glow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { BAND_COPY, setKidZoneLocked, type Band } from "@/lib/kid-zone";
import { PICTURES, type ChildProfile } from "@/lib/family";
import { ChildAvatar, PictureIcon } from "@/components/site/ChildAvatar";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useParentSession } from "@/components/site/ParentSession";
import { cn } from "@/lib/utils";
import { billingOptions } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/kids")({
  head: () => ({ meta: [
    { title: "Kid Zone · Bugley" }, { name: "description", content: "Your family’s Kid Zone: pick a player and play with Bugley." },
    { property: "og:title", content: "Kid Zone · Bugley" }, { property: "og:description", content: "Pick a player and play with Bugley." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: KidZone,
});

function KidZone() {
  const { data } = useSuspenseQuery(familyOptions);
  const [picking, setPicking] = useState<ChildProfile | null>(null);
  const [player, setPlayer] = useState<ChildProfile | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  useEffect(() => { setKidZoneLocked(true); }, []);
  const band = (player?.age_band ?? "explorers") as Band;
  const { data: billing } = useQuery(billingOptions(getStripeEnvironment()));
  if (billing && !billing.active) return <div className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl justify-end px-4 py-4"><Button variant="ghost" size="sm" onClick={() => setExitOpen(true)}><Lock />Exit to Parent Hub</Button></header>
    <section className="mx-auto max-w-lg px-4 py-10 text-center">
      <Bugley stage="scout" expression="sleepy" size={130} className="mx-auto" />
      <h1 className="mt-6 text-3xl">Bugley is taking a little nap</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">Grown-ups: the Kid Zone is paused until your family has an active plan. Every story, picture and badge is saved safely. Exit to the Parent Hub to start or restart your plan.</p>
    </section>
    <ExitDialog open={exitOpen} onOpenChange={setExitOpen} />
  </div>;
  return <div className={cn("min-h-screen bg-background text-foreground", player && `skin-${band}`)}>
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
      {player ? <Button variant="secondary" onClick={() => { window.speechSynthesis?.cancel(); setPlayer(null); }}><Users />Switch player</Button> : <span className="font-display text-lg">Kid Zone</span>}
      <Button variant="ghost" size="sm" onClick={() => setExitOpen(true)}><Lock />Exit to Parent Hub</Button>
    </header>
    {player ? <KidHome child={player} /> : picking ? <ChildLogin child={picking} onBack={() => setPicking(null)} onSuccess={() => { setPlayer(picking); setPicking(null); }} /> : <WhosPlaying children={data.children} onPick={setPicking} />}
    <ExitDialog open={exitOpen} onOpenChange={setExitOpen} />
  </div>;
}

function WhosPlaying({ children, onPick }: { children: ChildProfile[]; onPick: (c: ChildProfile) => void }) {
  return <section className="mx-auto max-w-4xl px-4 pb-16 pt-6 text-center">
    <div className="mb-4 flex justify-center"><Bugley stage="scout" expression="curious" glow size={110} /></div>
    <h1 className="text-4xl md:text-5xl">Who’s playing?</h1>
    {!children.length && <p className="mt-6 text-muted-foreground">No players yet. Ask a grown-up to add you in the Parent Hub.</p>}
    <ul className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3">{children.map((c) => <li key={c.id}>
      <button onClick={() => onPick(c)} className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
        <ChildAvatar avatar={c.avatar} className="size-24 md:size-28" />
        <span className="break-all font-display text-2xl">{c.nickname}</span>
      </button></li>)}</ul>
  </section>;
}

function ChildLogin({ child, onBack, onSuccess }: { child: ChildProfile; onBack: () => void; onSuccess: () => void }) {
  const [entry, setEntry] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isPin = child.login_kind === "pin";
  const need = isPin ? 4 : 3;
  useEffect(() => {
    if (entry.length !== need) return;
    setBusy(true);
    const credential = isPin ? { kind: "pin" as const, pin: entry.join("") } : { kind: "pictures" as const, pictures: entry as (typeof PICTURES)[number][] };
    verifyChildLogin({ data: { childId: child.id, credential, environment: getStripeEnvironment() } })
      .then((r) => { if ("paused" in r && r.paused) { setError("The Kid Zone is paused. Ask a grown-up!"); setEntry([]); } else if (r.ok) onSuccess(); else { setError("Oops! Not quite. Try again."); setEntry([]); } })
      .catch(() => { setError("Something went wrong. Try again."); setEntry([]); })
      .finally(() => setBusy(false));
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = (v: string) => { if (!busy && entry.length < need) { setError(""); setEntry([...entry, v]); } };
  return <section className="mx-auto max-w-md px-4 pb-16 pt-4 text-center">
    <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft />Back</Button>
    <div className="mt-4 flex justify-center"><ChildAvatar avatar={child.avatar} className="size-24" /></div>
    <h1 className="mt-3 text-3xl">Hi, {child.nickname}!</h1>
    <p className="mt-2 text-muted-foreground">{isPin ? "Tap your 4 secret numbers." : "Tap your 3 secret pictures in order."}</p>
    <div className="my-6 flex justify-center gap-3" aria-live="polite">{Array.from({ length: need }, (_, i) => <span key={i} className={cn("size-5 rounded-full border-2 border-foreground", i < entry.length && "bg-primary")} />)}</div>
    {error && <p role="alert" className="mb-4 font-medium text-destructive">{error}</p>}
    <div className="grid grid-cols-3 gap-3">
      {isPin ? <>{["1","2","3","4","5","6","7","8","9"].map((d) => <PadKey key={d} onClick={() => add(d)} label={d}>{d}</PadKey>)}
        <span /><PadKey onClick={() => add("0")} label="0">0</PadKey><PadKey onClick={() => setEntry(entry.slice(0, -1))} label="Delete"><Delete /></PadKey></>
        : PICTURES.map((p) => <PadKey key={p} onClick={() => add(p)} label={p}><PictureIcon picture={p} /></PadKey>)}
    </div>
    {!isPin && entry.length > 0 && <Button variant="ghost" className="mt-4" onClick={() => setEntry([])}>Start over</Button>}
  </section>;
}
function PadKey({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return <button aria-label={label} onClick={onClick} className="flex h-20 items-center justify-center rounded-2xl border-2 border-border bg-card font-display text-3xl shadow-soft active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">{children}</button>;
}

function KidHome({ child }: { child: ChildProfile }) {
  const band = child.age_band as Band;
  const copy = BAND_COPY[band];
  const greeting = copy.greeting(child.nickname);
  const speak = () => { const s = window.speechSynthesis; if (!s) return; s.cancel(); const u = new SpeechSynthesisUtterance(greeting); u.rate = 0.9; u.pitch = 1.2; s.speak(u); };
  useEffect(() => { if (band === "sprouts") speak(); return () => window.speechSynthesis?.cancel(); }, [child.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sprouts = band === "sprouts", builders = band === "builders";
  const qc = useQueryClient();
  const { data: m } = useQuery({ queryKey: ["curriculum", "child", child.id], queryFn: () => getChildMission({ data: { childId: child.id } }) });
  const { data: glow } = useQuery({ queryKey: ["glow", child.id], queryFn: () => getChildGlow({ data: { childId: child.id } }) });
  async function done(activityId: string) {
    try { const r = await completeActivity({ data: { childId: child.id, activityId } }); if (r.badge) toast.success(`You earned the ${r.badge} badge!`); else toast.success(sprouts ? "Yay! You did it!" : "Nice work!"); await qc.invalidateQueries({ queryKey: ["curriculum"] }); }
    catch { toast.error("Oops! Try again."); }
  }
  return <section className="mx-auto max-w-5xl px-4 pb-16">
    <div className={cn("flex items-center gap-5 rounded-3xl bg-card p-6 shadow-soft", sprouts && "flex-col text-center")}>
      {builders ? <BugleyMature variant="headphones" size={72} /> : <Bugley stage={child.bugley_stage} expression="happy" glow size={sprouts ? 160 : 120} />}
      <div className="min-w-0 flex-1">
        <p className={cn("font-display", sprouts ? "text-4xl" : builders ? "text-2xl" : "text-3xl")}>{greeting}</p>
        {sprouts && <Button size="lg" className="mt-4" onClick={speak}><Volume2 />Hear Bugley</Button>}
        {!sprouts && <p className="mt-1 text-sm capitalize text-muted-foreground">Bugley stage: {child.bugley_stage}</p>}
      </div>
    </div>
    {glow && <GlowMeter total={glow.total} allowance={glow.allowance} stage={child.bugley_stage} big={sprouts} />}
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <div className="rounded-3xl border-2 border-border bg-card p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{copy.mission}</p>
        {!m ? <p className="mt-2 text-muted-foreground">Loading…</p> : !m.mission ? <p className={cn("mt-2 font-display", sprouts ? "text-3xl" : "text-2xl")}>Coming soon!</p> : <>
          <p className={cn("mt-1 font-display", sprouts ? "text-3xl" : "text-2xl")}>{m.mission.unitTitle}</p>
          <ul className="mt-4 space-y-3">{m.mission.activities.map((a: any) => <li key={a.id} className="rounded-2xl bg-muted p-4">
            <div className="flex items-start justify-between gap-3"><p className={cn("font-display", sprouts ? "text-2xl" : "text-lg")}>{a.title}</p>{!sprouts && <span className="shrink-0 text-xs text-muted-foreground">{a.minutes} min</span>}</div>
            {!sprouts && <p className="mt-1 text-sm leading-relaxed">{a.instructions}</p>}
            {sprouts && <p className="mt-1">{a.instructions}</p>}
            {a.done ? <p className="mt-3 flex items-center gap-2 font-semibold"><Check className="size-5" />Done!</p> : <Button size={sprouts ? "lg" : "sm"} className="mt-3" onClick={() => void done(a.id)}>{sprouts ? "I did it!" : "Mark done"}</Button>}
          </li>)}</ul>
          {m.mission.storyPrompt && <p className="mt-4 text-sm text-muted-foreground">Story idea: {m.mission.storyPrompt}</p>}
        </>}
      </div>
      <button disabled className={cn("flex flex-col items-start justify-center gap-2 rounded-3xl bg-primary p-6 text-left text-primary-foreground shadow-glow", sprouts && "min-h-44 items-center text-center")}>
        <Sparkles className={sprouts ? "size-12" : "size-8"} />
        <span className={cn("font-display", sprouts ? "text-4xl" : "text-3xl")}>{copy.studio}</span>
        <span className="rounded-full bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">Coming soon</span>
      </button>
    </div>
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <div className="rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-xl"><Award className="size-5" />{copy.badges}</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {(m?.badges ?? []).map((b: string) => <li key={b} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"><Sparkles className="size-4" />{b}</li>)}
          {[1, 2, 3].map((i) => <li key={i} aria-label="Badge still to earn" className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground"><Lock className="size-4" /></li>)}
        </ul>
      </div>
      <div className="rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-xl"><BookOpen className="size-5" />{copy.shelf}</h2>
        <p className="mt-4 text-muted-foreground">{sprouts ? "Nothing here yet. Soon!" : builders ? "Your stories, comics and games will live here." : "Your stories and comics will land here after your first adventure."}</p>
      </div>
    </div>
  </section>;
}

function ExitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useParentSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return setError("Please try again in a moment.");
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    setBusy(false);
    if (error) { setPassword(""); return setError("That password didn’t match."); }
    window.speechSynthesis?.cancel();
    setKidZoneLocked(false);
    onOpenChange(false);
    await navigate({ to: "/hub", replace: true });
  }
  return <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setPassword(""); setError(""); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Grown-ups only</DialogTitle><DialogDescription>Enter your parent account password to leave the Kid Zone.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <Input type="password" autoComplete="current-password" aria-label="Parent password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Checking…" : "Exit to Parent Hub"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

function GlowMeter({ total, allowance, stage, big }: { total: number; allowance: number; stage: ChildProfile["bugley_stage"]; big: boolean }) {
  const pct = Math.min(100, Math.round((total / Math.max(allowance, 1)) * 100));
  const low = isGlowLow(total);
  return <div className="mt-6 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-soft" role="meter" aria-valuemin={0} aria-valuemax={allowance} aria-valuenow={total} aria-label="Glow">
    <Bugley stage={stage} expression={low ? "sleepy" : "happy"} glow={!low} size={big ? 84 : 64} className="shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2"><p className={cn("font-display", big ? "text-2xl" : "text-lg")}>Glow</p><p className="font-display text-lg">{total}</p></div>
      <div className="mt-2 h-4 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary shadow-glow transition-all" style={{ width: `${pct}%` }} /></div>
      {low && <p className="mt-2 text-sm font-medium">I’m almost out of glow! Let’s write the next page and I’ll draw it tomorrow.</p>}
    </div>
  </div>;
}
