import { useState } from "react";
import { Shuffle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChildAvatar } from "./ChildAvatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BUG_ANTENNAE, BUG_COLORS, BUG_EXTRAS, BUG_EYES, BUG_KINDS, BUG_MOUTHS, BUG_PATTERNS, COLOR_KEYS, randomBug, type BugConfig } from "@/lib/bug-avatar";
import { generateBugPicture, getBugTries, saveBug } from "@/lib/bug-avatar.functions";
import { cn } from "@/lib/utils";

const PARTS = [
  { key: "kind", label: "Bug", options: BUG_KINDS },
  { key: "pattern", label: "Pattern", options: BUG_PATTERNS },
  { key: "eyes", label: "Eyes", options: BUG_EYES },
  { key: "mouth", label: "Mouth", options: BUG_MOUTHS },
  { key: "antennae", label: "Antennae", options: BUG_ANTENNAE },
  { key: "extra", label: "Gear", options: BUG_EXTRAS },
] as const;

export function BugBuilder({ childId, start, big, onSaved, onClose }: { childId: string; start: BugConfig; big?: boolean; onSaved: (b: BugConfig) => void; onClose: () => void }) {
  const [bug, setBug] = useState(start);
  const [words, setWords] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { data: tries } = useQuery({ queryKey: ["bug-tries", childId], queryFn: () => getBugTries({ data: { childId } }) });
  const set = (k: keyof BugConfig, v: string) => { const { imagePath: _path, imageUrl: _url, ...parts } = bug; setBug({ ...parts, [k]: v }); };
  async function describe() {
    if (busy || !tries || words.trim().length < 2) return;
    setBusy(true); setNote("");
    try { const r = await generateBugPicture({ data: { childId, words, bug, op: crypto.randomUUID() } }); if (r.ok) { setBug(r.bug); setNote("Your new bug picture is saved!"); qc.setQueryData(["bug-tries", childId], { completed: r.completed, nextCost: r.nextCost }); await Promise.all([qc.invalidateQueries({ queryKey: ["family"] }), qc.invalidateQueries({ queryKey: ["kid-family"] }), qc.invalidateQueries({ queryKey: ["glow", childId] })]); } else setNote(r.reply); }
    catch (e) { setNote(e instanceof Error ? e.message : "Couldn’t make your bug picture."); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true);
    try { if (bug.imagePath) { onSaved(bug); return; } const r = await saveBug({ data: { childId, bug } }); onSaved(r.bug); } catch { setNote("We couldn’t save your bug. Try again!"); } finally { setBusy(false); }
  }
  const chip = (on: boolean) => cn("rounded-full border-2 px-3 py-1.5 font-semibold capitalize transition", big && "px-4 py-2.5 text-lg", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary");
  return <section className="mx-auto max-w-5xl px-4 pb-16">
    <div className="flex items-center justify-between gap-3"><h1 className="text-3xl md:text-4xl">Build your bug</h1><Button variant="ghost" disabled={busy} onClick={() => bug.imagePath ? onSaved(bug) : onClose()}><X />Close</Button></div>
    <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
      <div className="flex flex-col items-center gap-4 md:sticky md:top-4 md:self-start">
        <div className="rounded-3xl bg-card p-4 shadow-soft"><ChildAvatar avatar={bug} className="size-60" /></div>
        <div className="flex gap-2"><Button disabled={busy} variant="secondary" onClick={() => setBug(randomBug())}><Shuffle />Surprise me</Button><Button disabled={busy} onClick={() => void save()}>{bug.imagePath ? "Use my bug" : "Save my bug"}</Button></div>
        <div className="w-full rounded-3xl border-2 border-border bg-card p-4">
          <p className="font-display text-lg">Tell Bugley your bug</p>
          <div className="mt-2"><Input disabled={busy} value={words} maxLength={200} placeholder="A purple spider with shades and a crown" onChange={(e) => setWords(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void describe()} /><Button className="mt-3 w-full" disabled={busy || !tries || words.trim().length < 2} onClick={() => void describe()}><Sparkles />{busy ? "Drawing your bug…" : !tries ? "Checking your tries…" : tries.nextCost === 0 ? "Draw my bug · Free" : "Draw my bug · 1 Glow"}</Button></div>
          {tries && <p className="mt-2 text-sm text-muted-foreground">{tries.completed < 2 ? `${2 - tries.completed} free ${tries.completed === 1 ? "try" : "tries"} left. Then 1 Glow each.` : "New AI bug pictures cost 1 Glow each."}</p>}
          {note && <p role="status" className="mt-2 text-sm">{note}</p>}
        </div>
      </div>
      <div className="space-y-5">
        {PARTS.map((p) => <fieldset disabled={busy} key={p.key}><legend className="mb-2 font-display text-lg">{p.label}</legend><div className="flex flex-wrap gap-2">{p.options.map((o) => <button key={o} type="button" aria-pressed={bug[p.key] === o} className={chip(bug[p.key] === o)} onClick={() => set(p.key, o)}>{o}</button>)}</div></fieldset>)}
        {(["body", "accent"] as const).map((k) => <fieldset disabled={busy} key={k}><legend className="mb-2 font-display text-lg">{k === "body" ? "Body color" : "Second color"}</legend><div className="flex flex-wrap gap-2">{COLOR_KEYS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={bug[k] === c} onClick={() => set(k, c)} className={cn("size-10 rounded-full border-4 transition", big && "size-12", bug[k] === c ? "border-foreground scale-110" : "border-border")} style={{ backgroundColor: BUG_COLORS[c] }} />)}</div></fieldset>)}
      </div>
    </div>
  </section>;
}
