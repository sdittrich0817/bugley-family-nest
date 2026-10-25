import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { heroIdeaCheck, makeHeroOptions, saveHero } from "@/lib/images.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import type { WorkspaceProject } from "@/lib/workspace";
import type { SidekickChild } from "./Sidekick";

export function WorkspaceCharacter({ child, project, onSave, onAttach }: { child: SidekickChild; project: WorkspaceProject; onSave: (draft: any) => Promise<WorkspaceProject | undefined>; onAttach: (id: string) => Promise<void> }) {
  const seed = project.workspace.characterDraft;
  const [name, setName] = useState(seed?.name ?? project.workspace.facts?.heroName ?? "");
  const [kind, setKind] = useState(seed?.kind ?? project.workspace.facts?.heroLooks ?? "");
  const [special, setSpecial] = useState(seed?.special ?? "");
  const [personality, setPersonality] = useState(seed?.personality ?? "");
  const [options, setOptions] = useState(seed?.options.map(o => ({ path: o.path, url: project.urls[o.path] ?? "" })) ?? []);
  const [busy, setBusy] = useState(false); const [note, setNote] = useState(""); const [checked, setChecked] = useState(false);
  const check = useServerFn(heroIdeaCheck), paint = useServerFn(makeHeroOptions), approve = useServerFn(saveHero);
  const draft = () => ({ name, kind, special, personality, options: options.map(o => ({ path: o.path })) });
  async function preview() {
    setBusy(true); setNote("");
    try {
      const saved = await onSave(draft()); if (!saved) return;
      if (!checked) {
        const result = await check({ data: { childId: child.id, idea: [kind, special].filter(Boolean).join("; "), extra: [] } });
        if (!result.ok) { setNote(result.reply); return; }
        setChecked(true);
        if (!result.ready) { setNote(result.question); return; }
      }
      const result = await paint({ data: { childId: child.id, styleKey: project.styleKey, name, kind, special, personality, color: "", environment: getStripeEnvironment(), op: crypto.randomUUID() } });
      if (!result.ok) { setNote(result.reply); return; }
      setOptions(result.options);
      await onSave({ name, kind, special, personality, options: result.options.map(o => ({ path: o.path })) });
    } catch (e) { setNote(e instanceof Error ? e.message : "Your character idea is still here. Try again."); }
    finally { setBusy(false); }
  }
  async function choose(path: string) {
    setBusy(true); setNote("");
    try {
      const result = await approve({ data: { childId: child.id, path, styleKey: project.styleKey, name, kind, special, personality, color: "" } });
      if (!result.ok) { setNote(result.reply); return; }
      await onAttach(result.id);
    } catch(e) { setNote(e instanceof Error ? e.message : "Your preview is safe. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <label className="block space-y-2 font-semibold">Name<Input aria-label="Character name" value={name} maxLength={40} onChange={e => setName(e.target.value)} /></label>
    <label className="block space-y-2 font-semibold">What do they look like?<Textarea aria-label="Character appearance" value={kind} maxLength={160} onChange={e => setKind(e.target.value)} /></label>
    <details><summary className="cursor-pointer font-semibold text-muted-foreground">Extra details</summary><div className="mt-3 space-y-3">
      <label className="block space-y-2">Personality<Input aria-label="Character personality" value={personality} maxLength={80} onChange={e => setPersonality(e.target.value)} /></label>
      <label className="block space-y-2">Special detail<Input aria-label="Character special detail" value={special} maxLength={160} onChange={e => setSpecial(e.target.value)} /></label>
    </div></details>
    {note && <p role="alert" className="font-semibold text-destructive">{note}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !name.trim() || kind.trim().length < 2} onClick={() => void preview()}>{busy ? "Meeting your character…" : options.length ? "New previews · 1 Glow" : "See previews · 1 Glow"}</Button><Button variant="ghost" disabled={busy} onClick={() => void onSave(draft())}>Save these details</Button></div>
    <div className="grid grid-cols-3 gap-2">{options.map((o, i) => <Button variant="outline" key={o.path} disabled={busy} onClick={() => void choose(o.path)} className="h-auto flex-col whitespace-normal p-2"><img src={o.url} alt={`${name} preview ${i + 1}`} className="aspect-square w-full object-contain" /><span>That’s {name}!</span></Button>)}</div>
  </div>;
}