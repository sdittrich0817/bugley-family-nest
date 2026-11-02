import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flame, Lock, Newspaper, Sparkles, Star, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { kidFamilyOptions as familyOptions, useStudioPlayer } from "@/lib/kid-family";
import { setKidZoneLocked } from "@/lib/kid-zone";
import { answerQuest, getQuestChapter, getQuestMap } from "@/lib/curriculum.functions";
import { useScrollTopOn } from "@/lib/scroll";
import type { ChildProfile } from "@/lib/family";
import { Bugley } from "@/components/brand/Bugley";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import mapArt from "@/assets/illustrations/glimmerwood-map.jpg";

export const Route = createFileRoute("/_kid/kids_/quest")({
  head: () => ({ meta: [
    { title: "Bugley’s Quest · Kid Zone" }, { name: "description", content: "Help Bugley light up the Glimmerwood and learn how AI works, one chapter at a time." },
    { property: "og:title", content: "Bugley’s Quest · Kid Zone" }, { property: "og:description", content: "Light up the Glimmerwood with Bugley." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: QuestPage,
});

// Spots on the Glimmerwood map art, bottom to top: cave, meadow, bridge, tree, studio, lanterns.
const SPOTS = [[24, 84], [52, 66], [56, 46], [24, 32], [80, 27], [76, 7]] as const;

function QuestPage() {
  const { data } = useSuspenseQuery(familyOptions);
  const navigate = useNavigate();
  const missing = useCallback(() => { void navigate({ to: "/kids", replace: true }); }, [navigate]);
  useEffect(() => { setKidZoneLocked(true); }, []);
  const { childId, error } = useStudioPlayer(data.children, missing);
  const child = data.children.find((c) => c.id === childId);
  const [open, setOpen] = useState<string | null>(null); useScrollTopOn(open ?? "map");
  if (!child) return <p className="p-6" role={error ? "alert" : "status"}>{error || "Opening the quest…"}</p>;
  return <div className={cn("min-h-screen bg-background text-foreground", `skin-${child.age_band}`)}>
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
      {open ? <Button variant="ghost" onClick={() => setOpen(null)}><ArrowLeft />Map</Button> : <Button asChild variant="ghost"><Link to="/kids"><ArrowLeft />Home</Link></Button>}
      <p className="font-display text-xl">Bugley’s Quest</p>
    </div></header>
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">{open ? <Chapter child={child} sessionId={open} onExit={() => setOpen(null)} /> : <QuestMap child={child} onOpen={setOpen} />}</main>
  </div>;
}

function QuestMap({ child, onOpen }: { child: ChildProfile; onOpen: (id: string) => void }) {
  const { data, error } = useQuery({ queryKey: ["quest", "map", child.id], queryFn: () => getQuestMap({ data: { childId: child.id } }) });
  if (error) return <p role="alert" className="p-6">Bugley couldn’t find the map. Try again soon.</p>;
  if (!data) return <p role="status" className="p-6">Unrolling the map…</p>;
  if (!data.chapters.length && !data.bonus.length) return <div className="flex flex-col items-center gap-4 p-10 text-center"><Bugley stage={child.bugley_stage as any} expression="sleepy" size={140} /><p className="font-display text-2xl">New adventures are coming soon!</p></div>;
  const lit = data.chapters.filter((c) => c.state === "done").length;
  const current = data.chapters.find((c) => c.state === "current");
  return <>
    <div className="mb-4 flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
      <Bugley stage={child.bugley_stage as any} expression={current ? "curious" : "celebrating"} glow size={80} />
      <div><p className="font-display text-xl">{current ? `Next stop: ${current.title}` : "You lit the whole forest!"}</p><p className="text-sm text-muted-foreground">{lit} of {data.chapters.length} lights glowing</p></div>
    </div>
    <div className="relative overflow-hidden rounded-3xl shadow-soft">
      <img src={mapArt} alt="The Glimmerwood map with a glowing path" width={1024} height={1536} className="block h-auto w-full" />
      {data.chapters.slice(0, SPOTS.length).map((c, i) => { const [x, y] = SPOTS[i]!;
        return <button key={c.sessionId} disabled={c.state === "locked"} onClick={() => onOpen(c.sessionId)} style={{ left: `${x}%`, top: `${y}%` }}
          aria-label={`${c.title}${c.state === "locked" ? " (locked)" : c.state === "done" ? " (lit)" : ""}`}
          className={cn("absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus-visible:outline-none")}>
          <span className={cn("flex size-14 items-center justify-center rounded-full border-4 text-lg font-display transition", c.state === "done" && "border-glow bg-glow text-foreground shadow-glow", c.state === "current" && "quest-pulse border-glow bg-card text-foreground shadow-glow", c.state === "locked" && "border-border bg-muted/80 text-muted-foreground")}>
            {c.state === "done" ? <Star className="size-6" /> : c.state === "locked" ? <Lock className="size-5" /> : i + 1}</span>
          <span className="max-w-32 rounded-full bg-background/90 px-2 py-0.5 text-center text-xs font-semibold">{c.title}</span>
        </button>; })}
    </div>
    {data.chapters.length > SPOTS.length && <ul className="mt-4 space-y-2">{data.chapters.slice(SPOTS.length).map((c) => <li key={c.sessionId}><Button variant="secondary" disabled={c.state === "locked"} onClick={() => onOpen(c.sessionId)}>{c.title}</Button></li>)}</ul>}
    {data.bonus.length > 0 && <section className="mt-6 rounded-3xl border-2 border-border bg-card p-5">
      <p className="flex items-center gap-2 font-display text-xl"><Newspaper className="size-5" />Fresh from the news</p>
      <p className="text-sm text-muted-foreground">Bonus quests about AI in the world right now.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{data.bonus.map((b) => <li key={b.sessionId}><button onClick={() => onOpen(b.sessionId)} className="flex w-full items-center justify-between gap-2 rounded-2xl bg-muted p-3 text-left font-semibold hover:bg-accent">{b.title}{b.done && <Check className="size-5" />}</button></li>)}</ul>
    </section>}
  </>;
}

const STEP_LABEL: Record<string, string> = { story: "Story", try: "Try it", idea: "My idea", campfire: "Campfire" };

function Chapter({ child, sessionId, onExit }: { child: ChildProfile; sessionId: string; onExit: () => void }) {
  const qc = useQueryClient();
  const key = ["quest", "chapter", child.id, sessionId];
  const { data, error } = useQuery({ queryKey: key, queryFn: () => getQuestChapter({ data: { childId: child.id, sessionId } }) });
  const [i, setI] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [idea, setIdea] = useState("");
  useScrollTopOn(String(i));
  const sprouts = child.age_band === "sprouts";
  if (error) return <p role="alert" className="p-6">{error instanceof Error ? error.message : "Bugley got lost."}</p>;
  if (!data) return <p role="status" className="p-6">Flying there…</p>;
  const steps = data.steps;
  const at = i ?? Math.max(0, steps.findIndex((s) => !s.done && s.step !== "campfire"));
  const s = steps[at] ?? steps[steps.length - 1]!;
  const speak = () => { const sy = window.speechSynthesis; if (!sy) return; sy.cancel(); const u = new SpeechSynthesisUtterance(s.text); u.rate = 0.9; sy.speak(u); };
  const go = (n: number) => { setFeedback(null); setIdea(""); setI(n); };
  async function send(payload: { choice?: number; text?: string }) {
    setBusy(true);
    try {
      const r: any = await answerQuest({ data: { childId: child.id, sessionId, activityId: s.id, ...payload } });
      setI(at); setFeedback({ ok: r.correct, text: r.message });
      if (r.correct) { await qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["quest", "map", child.id] }); void qc.invalidateQueries({ queryKey: ["curriculum"] }); }
      if (r.finished) toast.success(r.badge ? `You lit a new light: ${r.badge}!` : "Chapter complete!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Oops! Try again."); }
    finally { setBusy(false); }
  }
  const canNext = s.done || feedback?.ok;
  return <article className="space-y-5">
    <div><p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{data.title}</p>
      <ol className="mt-2 flex gap-2" aria-label="Chapter steps">{steps.map((st, j) => <li key={st.id} className="flex-1"><div className={cn("h-2 rounded-full", st.done ? "bg-glow" : j === at ? "bg-primary" : "bg-muted")} /><p className="mt-1 hidden text-xs sm:block">{STEP_LABEL[st.step] ?? st.title}</p></li>)}</ol></div>
    <div className={cn("rounded-3xl p-6 shadow-soft", s.step === "campfire" ? "bg-accent" : "bg-card")}>
      <div className="flex items-start gap-4">
        {s.step === "campfire" ? <Flame className="size-12 shrink-0 text-primary" /> : <Bugley stage={child.bugley_stage as any} expression={s.step === "try" ? "thinking" : s.step === "idea" ? "curious" : "happy"} glow size={sprouts ? 110 : 84} />}
        <div className="min-w-0 flex-1">
          <h1 className={cn("font-display", sprouts ? "text-3xl" : "text-2xl")}>{s.step === "campfire" ? "Campfire with your grown-up" : STEP_LABEL[s.step] ?? s.title}</h1>
          <p className={cn("mt-2 leading-relaxed", sprouts ? "text-xl" : "text-lg")}>{s.text}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={speak}><Volume2 />Read it to me</Button>
        </div>
      </div>
      {s.kind === "choice" && <div className="mt-5 grid gap-3">{s.choices.map((c, j) => <Button key={j} size="lg" variant={s.answer === c && (s.done || feedback?.ok) ? "default" : "secondary"} disabled={busy || s.done} className="h-auto min-h-14 justify-start whitespace-normal py-3 text-left text-lg" onClick={() => void send({ choice: j })}>{c}</Button>)}</div>}
      {s.kind === "free" && (s.done ? <p className="mt-5 rounded-2xl bg-muted p-4">“{s.answer}”</p> : <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); if (idea.trim()) void send({ text: idea.trim() }); }}>
        <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={300} rows={3} placeholder="Type your idea…" aria-label="Your idea" className="text-lg" />
        <p className="text-xs text-muted-foreground">Use made-up names — no real names or places.</p>
        <Button type="submit" size="lg" disabled={busy || !idea.trim()}><Sparkles />Tell Bugley</Button>
      </form>)}
      {s.kind === "done" && s.step !== "campfire" && !s.done && <Button size="lg" className="mt-5" disabled={busy} onClick={() => void send({})}>{sprouts ? "I got it!" : "Got it"}</Button>}
      {s.step === "campfire" && <p className="mt-4 text-sm font-semibold">Show this to your grown-up and do it together — no screens needed!</p>}
      {feedback && <p role="status" className={cn("mt-4 rounded-2xl p-3 font-semibold", feedback.ok ? "bg-glow/40" : "bg-muted")}>{feedback.text}</p>}
    </div>
    <div className="flex justify-between gap-3">
      <Button variant="secondary" disabled={at === 0} onClick={() => go(at - 1)}><ArrowLeft />Back</Button>
      {at < steps.length - 1 ? <Button disabled={!canNext} onClick={() => go(at + 1)}>Next<ArrowRight /></Button> : <Button onClick={onExit}><Star />Back to the map</Button>}
    </div>
  </article>;
}
