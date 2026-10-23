import { useScrollTopOn } from "@/lib/scroll";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, X } from "lucide-react";
import { familyOptions } from "@/lib/family.functions";
import { completeFamilySession, familyCurriculumOptions } from "@/lib/curriculum.functions";
import { BANDS, stepMinutes, TABLE_STEPS, type Band } from "@/lib/curriculum";
import type { ChildProfile } from "@/lib/family";
import { accountHead } from "@/lib/parent-auth";
import { ChildAvatar } from "@/components/site/ChildAvatar";
import { Bugley } from "@/components/brand/Bugley";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/table")({
  head: () => accountHead("Family Table", "Run this week’s Bugley session together on the big screen."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(familyOptions), context.queryClient.ensureQueryData(familyCurriculumOptions)]),
  errorComponent: ({ error }) => <div role="alert" className="p-16 text-center text-2xl">{error instanceof Error ? error.message : "Something went wrong."}</div>,
  component: FamilyTable,
});

const BAND_LABEL: Record<Band, string> = { sprouts: "Sprouts", explorers: "Explorers", builders: "Builders" };

function FamilyTable() {
  const { data: family } = useSuspenseQuery(familyOptions);
  const { data: cur } = useSuspenseQuery(familyCurriculumOptions);
  const s = cur.current as any;
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(false); useScrollTopOn(`${i}|${finished}`);
  if (!s) return <Shell><div className="flex flex-1 flex-col items-center justify-center gap-6 text-center"><Bugley stage="scout" expression="sleepy" size={200} /><p className="text-4xl">No session is ready yet.</p><Button asChild size="lg"><Link to="/hub">Back to Parent Hub</Link></Button></div></Shell>;
  if (finished) return <EndScreen session={s} kids={family.children} />;
  const step = TABLE_STEPS[i]!;
  const minutes = stepMinutes(step.key, s.activities);
  return <Shell>
    <header className="flex items-center gap-4 px-6 pt-5 md:px-10">
      <Button asChild variant="ghost" size="sm"><Link to="/hub"><X />Exit</Link></Button>
      <div className="flex flex-1 gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={i + 1} aria-label="Session progress">
        {TABLE_STEPS.map((t, j) => <div key={t.key} className="flex-1"><div className={cn("h-3 rounded-full", j <= i ? "bg-primary" : "bg-muted")} /><p className={cn("mt-1 hidden text-sm md:block", j === i ? "font-semibold" : "text-muted-foreground")}>{t.label}</p></div>)}
      </div>
      <Timer key={step.key} minutes={minutes} />
    </header>
    <main className="flex flex-1 flex-col px-6 py-8 md:px-10">
      <p className="text-xl font-semibold uppercase tracking-wide text-muted-foreground">Step {i + 1} of 5</p>
      <h1 className="mt-1 text-5xl md:text-7xl">{step.label}</h1>
      <div className="mt-8 flex-1">
        {step.key === "hello" ? <Hello s={s} /> : step.key === "think" ? <Think s={s} kids={family.children} onDone={() => setFinished(true)} /> : <>
          {step.unplugged && <ScreensDown />}
          <ActivityStep acts={s.activities.filter((a: any) => a.step === step.key)} kids={family.children} />
        </>}
      </div>
    </main>
    <footer className="flex items-center justify-between gap-4 px-6 pb-6 md:px-10">
      <Button size="lg" variant="secondary" className="h-16 px-10 text-2xl" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft className="size-7" />Back</Button>
      {i < 4 && <Button size="lg" className="h-16 px-10 text-2xl" onClick={() => setI(i + 1)}>Next<ArrowRight className="size-7" /></Button>}
    </footer>
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-background text-foreground">{children}</div>;
}

function Timer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => { if (!running || left <= 0) return; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [running, left]);
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
  return <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-soft">
    <span className={cn("font-display text-3xl tabular-nums", left === 0 && "text-destructive")} aria-label={`${mm} minutes ${ss} seconds left`}>{mm}:{ss}</span>
    <Button size="sm" variant="ghost" aria-label={running ? "Pause timer" : "Start timer"} onClick={() => setRunning(!running)}>{running ? <Pause /> : <Play />}</Button>
    <Button size="sm" variant="ghost" aria-label="Reset timer" onClick={() => { setRunning(false); setLeft(minutes * 60); }}><RotateCcw /></Button>
  </div>;
}

function Hello({ s }: { s: any }) {
  return <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
    <Bugley stage="scout" expression="happy" glow size={240} />
    <div>
      <p className="text-2xl text-muted-foreground">{s.season.title} · Unit {s.unit.number}: {s.unit.title}</p>
      <p className="mt-4 text-4xl leading-tight md:text-5xl">“{s.unit.family_question}”</p>
      <p className="mt-6 text-xl text-muted-foreground">Parent: read the question out loud. Ask everyone for one quick guess. No wrong answers!</p>
    </div>
  </div>;
}

function ScreensDown() {
  return <div className="mb-8 rounded-3xl bg-primary p-8 text-primary-foreground shadow-glow">
    <p className="font-display text-5xl md:text-6xl">Screens down!</p>
    <p className="mt-3 text-2xl">Parent: turn this screen away or dim it. Gather everyone, read each part below out loud, then start the timer.</p>
  </div>;
}

function bandsInFamily(kids: ChildProfile[]) { return BANDS.filter((b) => kids.some((k) => k.age_band === b)); }

function ActivityStep({ acts, kids }: { acts: any[]; kids: ChildProfile[] }) {
  if (!acts.length) return <p className="text-3xl text-muted-foreground">Nothing planned for this step this week. Tap Next.</p>;
  const bands = bandsInFamily(kids);
  return <div className="space-y-10">{acts.map((a) => <div key={a.id}>
    <h2 className="text-4xl">{a.title}</h2>
    <div className="mt-5 grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.max(bands.length, 1)}, minmax(0, 1fr))` }}>
      {bands.map((b) => { const v = a.activity_versions.find((x: any) => x.age_band === b); return <div key={b} className={cn(`skin-${b}`, "rounded-3xl bg-card p-6 text-card-foreground shadow-soft")}>
        <div className="flex flex-wrap items-center gap-3">{kids.filter((k) => k.age_band === b).map((k) => <span key={k.id} className="flex items-center gap-2"><ChildAvatar avatar={k.bug ?? k.avatar} seed={k.id} className="size-14" /><span className="font-display text-2xl">{k.nickname}</span></span>)}</div>
        <p className="mt-2 text-sm uppercase tracking-wide text-muted-foreground">{BAND_LABEL[b]}{v ? ` · ${v.minutes} min` : ""}</p>
        <p className="mt-3 font-display text-3xl">{v?.kid_title ?? a.title}</p>
        <p className="mt-3 text-xl leading-relaxed">{v?.instructions ?? "No version for this age yet."}</p>
      </div>; })}
    </div>
  </div>)}</div>;
}

function Think({ s, kids, onDone }: { s: any; kids: ChildProfile[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(kids.map((k) => k.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function finish() {
    setBusy(true); setError("");
    try { await completeFamilySession({ data: { sessionId: s.id, childIds: [...picked] } }); await qc.invalidateQueries({ queryKey: ["curriculum"] }); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "We couldn’t save. Try again."); } finally { setBusy(false); }
  }
  return <div className="space-y-8">
    <ScreensDown />
    <div className="rounded-3xl bg-card p-8 shadow-soft"><p className="text-xl uppercase tracking-wide text-muted-foreground">Dinner question</p><p className="mt-2 text-4xl leading-tight md:text-5xl">“{s.unit.dinner_question}”</p></div>
    <div>
      <p className="text-2xl font-semibold">Who took part today?</p>
      <div className="mt-4 flex flex-wrap gap-4">{kids.map((k) => { const on = picked.has(k.id); return <button key={k.id} aria-pressed={on} onClick={() => { const n = new Set(picked); on ? n.delete(k.id) : n.add(k.id); setPicked(n); }} className={cn("flex items-center gap-3 rounded-full border-4 px-5 py-3 text-2xl transition", on ? "border-primary bg-card" : "border-border opacity-60")}>
        <ChildAvatar avatar={k.bug ?? k.avatar} seed={k.id} className="size-14" /><span className="font-display">{k.nickname}</span>{on && <Check className="size-7" />}</button>; })}</div>
      {error && <p role="alert" className="mt-4 text-xl text-destructive">{error}</p>}
      <Button size="lg" className="mt-6 h-16 px-10 text-2xl" disabled={!picked.size || busy} onClick={() => void finish()}>{busy ? "Saving…" : "We did it! Finish session"}</Button>
    </div>
  </div>;
}

function EndScreen({ session, kids }: { session: any; kids: ChildProfile[] }) {
  return <Shell><main className="flex flex-1 flex-col items-center px-6 py-10 text-center">
    <Bugley stage="navigator" expression="celebrating" glow size={260} />
    <h1 className="mt-6 text-5xl md:text-7xl">Amazing work, crew!</h1>
    {session.unit.badge_name && <p className="mt-3 text-2xl text-muted-foreground">Progress saved. Kids who finish every week of this unit earn the {session.unit.badge_name} badge.</p>}
    {session.unit.journal_prompt && <div className="mt-10 w-full max-w-5xl">
      <p className="text-2xl font-semibold">Field journal</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{kids.map((k) => <div key={k.id} className={cn(`skin-${k.age_band}`, "rounded-3xl bg-card p-6 text-left text-card-foreground shadow-soft")}>
        <div className="flex items-center gap-3"><ChildAvatar avatar={k.bug ?? k.avatar} seed={k.id} className="size-14" /><span className="font-display text-2xl">{k.nickname}</span></div>
        <p className="mt-4 text-xl leading-relaxed">{session.unit.journal_prompt}</p></div>)}</div>
    </div>}
    <Button asChild size="lg" className="mt-10 h-16 px-10 text-2xl"><Link to="/hub">Back to Parent Hub</Link></Button>
  </main></Shell>;
}
