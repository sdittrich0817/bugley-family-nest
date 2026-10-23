import { useState } from "react";
import { Shuffle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BugAvatar } from "./BugAvatar";
import { BUG_ANTENNAE, BUG_COLORS, BUG_EXTRAS, BUG_EYES, BUG_KINDS, BUG_MOUTHS, BUG_PATTERNS, COLOR_KEYS, randomBug, type BugConfig } from "@/lib/bug-avatar";
import { designBugFromWords, saveBug } from "@/lib/bug-avatar.functions";
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
  const set = (k: keyof BugConfig, v: string) => setBug({ ...bug, [k]: v });
  async function describe() {
    if (words.trim().length < 2) return;
    setBusy(true); setNote("");
    try { const r = await designBugFromWords({ data: { childId, words } }); if (r.ok) { setBug(r.bug); setNote("Here’s my try! Change anything you like."); } else setNote(r.reply); }
    catch { setNote("Oops! Try again."); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true);
    try { const r = await saveBug({ data: { childId, bug } }); onSaved(r.bug); } catch { setNote("We couldn’t save your bug. Try again!"); } finally { setBusy(false); }
  }
  const chip = (on: boolean) => cn("rounded-full border-2 px-3 py-1.5 font-semibold capitalize transition", big && "px-4 py-2.5 text-lg", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary");
  return <section className="mx-auto max-w-5xl px-4 pb-16">
    <div className="flex items-center justify-between gap-3"><h1 className="text-3xl md:text-4xl">Build your bug</h1><Button variant="ghost" onClick={onClose}><X />Close</Button></div>
    <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
      <div className="flex flex-col items-center gap-4 md:sticky md:top-4 md:self-start">
        <div className="rounded-3xl bg-card p-4 shadow-soft"><BugAvatar bug={bug} className="size-60" /></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setBug(randomBug())}><Shuffle />Surprise me</Button><Button disabled={busy} onClick={() => void save()}>Save my bug</Button></div>
        <div className="w-full rounded-3xl border-2 border-border bg-card p-4">
          <p className="font-display text-lg">Tell Bugley your bug</p>
          <div className="mt-2 flex gap-2"><Input value={words} maxLength={200} placeholder="A purple spider with shades and a crown" onChange={(e) => setWords(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void describe()} /><Button size="icon" aria-label="Ask Bugley" disabled={busy} onClick={() => void describe()}><Sparkles /></Button></div>
          {note && <p role="status" className="mt-2 text-sm">{note}</p>}
        </div>
      </div>
      <div className="space-y-5">
        {PARTS.map((p) => <fieldset key={p.key}><legend className="mb-2 font-display text-lg">{p.label}</legend><div className="flex flex-wrap gap-2">{p.options.map((o) => <button key={o} type="button" aria-pressed={bug[p.key] === o} className={chip(bug[p.key] === o)} onClick={() => set(p.key, o)}>{o}</button>)}</div></fieldset>)}
        {(["body", "accent"] as const).map((k) => <fieldset key={k}><legend className="mb-2 font-display text-lg">{k === "body" ? "Body color" : "Second color"}</legend><div className="flex flex-wrap gap-2">{COLOR_KEYS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={bug[k] === c} onClick={() => set(k, c)} className={cn("size-10 rounded-full border-4 transition", big && "size-12", bug[k] === c ? "border-foreground scale-110" : "border-border")} style={{ backgroundColor: BUG_COLORS[c] }} />)}</div></fieldset>)}
      </div>
    </div>
  </section>;
}
