import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Mic, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { listCast, makeCharacterPortrait, makePicture, saveCharacter, stylesOptions } from "@/lib/images.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { getStripeEnvironment } from "@/lib/stripe";
import { useVoiceInput, type BugleyChat, type SidekickChild } from "@/components/studio/Sidekick";
import { Bugley } from "@/components/brand/Bugley";
import { cn } from "@/lib/utils";

const chip = "rounded-full border-2 border-border bg-card px-4 py-2 font-semibold transition hover:border-primary";
const chipOn = "border-primary bg-primary text-primary-foreground";

export function StylePicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const { data: styles = [] } = useQuery(stylesOptions);
  return <div className="flex gap-3 overflow-x-auto pb-2">
    {styles.map((s) => <button key={s.key} onClick={() => onChange(s.key)} aria-pressed={value === s.key}
      className={cn("w-28 shrink-0 overflow-hidden rounded-2xl border-2 bg-card text-left transition", value === s.key ? "border-primary shadow-glow" : "border-border hover:border-primary")}>
      {STYLE_THUMBS[s.key] && <img src={STYLE_THUMBS[s.key]} alt="" loading="lazy" width={112} height={112} className="aspect-square w-full object-cover" />}
      <span className="block px-2 py-1.5 text-sm font-semibold leading-tight">{s.name}</span>
    </button>)}
  </div>;
}

function Working({ child, label }: { child: SidekickChild; label: string }) {
  return <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl bg-muted">
    <Bugley stage={child.bugley_stage} expression="thinking" glow size={110} />
    <p className="animate-pulse font-display text-lg">{label}</p>
  </div>;
}

function useGlowRefresh(childId: string) {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: ["glow", childId] }); void qc.invalidateQueries({ queryKey: ["album", childId] }); };
}

export function PictureMaker({ child, chat }: { child: SidekickChild; chat: BugleyChat }) {
  const sprouts = child.age_band === "sprouts";
  const [text, setText] = useState("");
  const [style, setStyle] = useState("cartoon");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<"sketch" | "final" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const voice = useVoiceInput((t) => setText((v) => (v ? `${v} ${t}` : t)));
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const refresh = useGlowRefresh(child.id);
  const ideas = ["a dragon", "under the sea", "in space", "a treehouse", "a rainy day", "a giant cupcake"];

  async function go(mode: "sketch" | "final") {
    if (text.trim().length < 3) { toast("Tell me a little more first!"); return; }
    setBusy(mode); setResult(null);
    try {
      const r = await makePicture({ data: { childId: child.id, environment: getStripeEnvironment(), styleKey: style, description: text, characterIds: picked, mode } });
      if (r.ok) { setResult(r.url); toast.success(mode === "final" ? "Your final picture is in your album!" : "Sketch saved to your album!"); }
      else chat.say(r.reply, "chips" in r ? r.chips : undefined);
    } catch { chat.say("Oops, my paintbrush slipped! Try again?"); }
    finally { setBusy(null); refresh(); }
  }

  return <div className="space-y-6">
    <h1 className="text-3xl sm:text-4xl">Picture Maker</h1>
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <label htmlFor="pic" className="font-display text-xl">What should Bugley draw?</label>
      <div className="relative">
        <textarea id="pic" value={text} onChange={(e) => setText(e.target.value)} maxLength={600} rows={sprouts ? 3 : 4}
          placeholder="A friendly dragon having a picnic on a cloud..." className={cn("w-full rounded-2xl border-2 border-border bg-background p-4 outline-none focus:border-primary", sprouts ? "text-xl" : "text-lg")} />
        {sprouts && voice.supported && <button type="button" onClick={voice.start} aria-label="Say your idea" className={cn("absolute bottom-3 right-3 flex size-12 items-center justify-center rounded-full bg-secondary", voice.listening && "animate-pulse bg-primary")}><Mic className="size-6" /></button>}
      </div>
      <div className="flex flex-wrap gap-2">{ideas.map((i) => <button key={i} onClick={() => setText((v) => (v ? `${v}, ${i}` : i))} className={chip}>+ {i}</button>)}</div>
      <button onClick={() => text.trim() && void chat.send(`Help me make my picture better: ${text}`, "chip")} disabled={chat.busy || !text.trim()} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"><Sparkles className="size-4" />Ask Bugley for ideas</button>
    </section>
    <section className="space-y-3"><h2 className="text-xl">Pick a style</h2><StylePicker value={style} onChange={setStyle} /></section>
    {cast.length > 0 && <section className="space-y-3"><h2 className="text-xl">Add characters from My Cast</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">{cast.map((c) => { const on = picked.includes(c.id); return <button key={c.id} onClick={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id].slice(0, 4))} aria-pressed={on}
        className={cn("relative w-24 shrink-0 overflow-hidden rounded-2xl border-2 bg-card", on ? "border-primary shadow-glow" : "border-border")}>
        <img src={c.url} alt={c.title} className="aspect-square w-full object-cover" /><span className="block truncate px-2 py-1 text-sm font-semibold">{c.title}</span>
        {on && <Check className="absolute right-1 top-1 size-6 rounded-full bg-primary p-1" />}</button>; })}</div></section>}
    <div className="grid gap-3 sm:grid-cols-2">
      <button onClick={() => void go("sketch")} disabled={!!busy} className={cn("rounded-full border-2 border-primary bg-card font-display shadow-soft disabled:opacity-50", sprouts ? "h-16 text-xl" : "h-14 text-lg")}>✏️ Sketch it · 1 glow</button>
      <button onClick={() => void go("final")} disabled={!!busy} className={cn("rounded-full bg-primary font-display text-primary-foreground shadow-glow disabled:opacity-50", sprouts ? "h-16 text-xl" : "h-14 text-lg")}>✨ Make it final · 3 glow</button>
    </div>
    {busy ? <Working child={child} label={busy === "final" ? "Painting your masterpiece…" : "Sketching…"} />
      : result && <img src={result} alt={text} className="w-full rounded-3xl shadow-lift animate-in fade-in zoom-in-95" />}
  </div>;
}

const TYPES = ["kid", "animal", "creature", "robot", "alien", "monster"];
const PERSONALITIES = ["brave", "silly", "shy", "curious", "grumpy", "kind"];
const LOOKS = ["tall", "tiny", "fluffy", "spotty", "sparkly", "stripy", "big eyes", "long tail"];
const CLOTHES = ["a cape", "a hoodie", "rain boots", "a crown", "goggles", "a backpack", "a tutu", "a scarf"];
const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "rainbow"];

function Own({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) { const [v, setV] = useState(""); const add = () => { const t = v.trim().replace(/\s+/g, " "); if (t) { onAdd(t.slice(0, 40)); setV(""); } };
    return <div className="flex gap-2"><input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} maxLength={40} placeholder={placeholder} aria-label={placeholder} className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-border bg-background px-4 outline-none focus:border-primary" /><button onClick={add} className="rounded-full border-2 border-primary px-5 font-semibold">Add</button></div>;
}

export function CharacterCreator({ child, chat, onDone }: { child: SidekickChild; chat: BugleyChat; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState("");
  const [looks, setLooks] = useState<string[]>([]);
  const [clothes, setClothes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [special, setSpecial] = useState("");
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [style, setStyle] = useState("cartoon");
  const [portrait, setPortrait] = useState<{ path: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const refresh = useGlowRefresh(child.id);
  const qc = useQueryClient();
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const summary = [`a ${personality} ${type}`, looks.length && `looks: ${looks.join(", ")}`, clothes.length && `wearing ${clothes.join(", ")}`, colors.length && `colors: ${colors.join(", ")}`, special && `special detail: ${special}`].filter(Boolean).join("; ");
  const steps = ["Type", "Looks", "Special", "Name", "Style", "Portrait"];
  const canNext = [!!type, looks.length + clothes.length + colors.length > 0, true, !!name.trim() && !!personality, !!style][step] ?? true;
  const Chips = ({ list, value, onPick }: { list: string[]; value: string[]; onPick: (v: string) => void }) => <div className="flex flex-wrap gap-2">{[...list, ...value.filter((x) => x && !list.includes(x))].map((v) => <button key={v} onClick={() => onPick(v)} aria-pressed={value.includes(v)} className={cn(chip, "capitalize", value.includes(v) && chipOn)}>{v}</button>)}</div>;

  const addTo = (list: string[], set: (v: string[]) => void) => (v: string) => { if (!list.includes(v)) set([...list, v]); };

  async function generate() {
    setBusy(true);
    try {
      const r = await makeCharacterPortrait({ data: { childId: child.id, environment: getStripeEnvironment(), styleKey: style, description: `${name}, ${summary}` } });
      setNote("");
      if (r.ok) setPortrait({ path: r.path, url: r.url }); else { setNote(r.reply); chat.say(r.reply, "chips" in r ? r.chips : undefined); }
    } catch { setNote("Oops, my paintbrush slipped! Try again?"); chat.say("Oops, my paintbrush slipped! Try again?"); }
    finally { setBusy(false); refresh(); }
  }
  async function save() {
    if (!portrait) return;
    setBusy(true);
    try {
      const r = await saveCharacter({ data: { childId: child.id, path: portrait.path, name, styleKey: style, type, personality, summary } });
      if (r.ok) { toast.success(`${name} joined My Cast!`); await qc.invalidateQueries({ queryKey: ["cast", child.id] }); refresh(); onDone(); }
      else { chat.say(r.reply, r.chips); setStep(3); }
    } catch { toast("Oops! Try again."); } finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <h1 className="text-3xl sm:text-4xl">Character Creator</h1>
    <ol className="flex gap-1">{steps.map((s, i) => <li key={s} className={cn("h-2 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} aria-label={s} />)}</ol>
    <section className="space-y-4 rounded-3xl bg-card p-5 shadow-soft">
      {step === 0 && <><h2 className="text-2xl">What kind of character?</h2><Chips list={TYPES} value={[type]} onPick={setType} /><Own placeholder="Or type your own (like “dragon chef”)" onAdd={setType} /></>}
      {step === 1 && <><h2 className="text-2xl">What do they look like?</h2><Chips list={LOOKS} value={looks} onPick={(v) => toggle(looks, setLooks, v)} /><Own placeholder="Type your own (like “three horns”)" onAdd={addTo(looks, setLooks)} />
        <h3 className="text-xl">What do they wear?</h3><Chips list={CLOTHES} value={clothes} onPick={(v) => toggle(clothes, setClothes, v)} /><Own placeholder="Type your own (like “a pizza hat”)" onAdd={addTo(clothes, setClothes)} />
        <h3 className="text-xl">Favorite colors</h3><Chips list={COLORS} value={colors} onPick={(v) => toggle(colors, setColors, v)} /><Own placeholder="Type your own (like “lime green”)" onAdd={addTo(colors, setColors)} /></>}
      {step === 2 && <><h2 className="text-2xl">What’s one thing everyone notices?</h2>
        <input value={special} onChange={(e) => setSpecial(e.target.value)} maxLength={120} placeholder="Glowing purple shoes that squeak" className="h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-lg outline-none focus:border-primary" />
        <button onClick={() => void chat.send(`Help me think of a special detail for my ${type}`, "chip")} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Sparkles className="size-4" />Ask Bugley</button></>}
      {step === 3 && <><h2 className="text-2xl">Give them a made-up name</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Captain Noodle" className="h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-lg outline-none focus:border-primary" />
        <h3 className="text-xl">Personality</h3><Chips list={PERSONALITIES} value={[personality]} onPick={setPersonality} /><Own placeholder="Or type your own (like “sneaky”)" onAdd={setPersonality} /></>}
      {step === 4 && <><h2 className="text-2xl">Pick a style</h2><StylePicker value={style} onChange={setStyle} /></>}
      {step === 5 && <>
        <h2 className="text-2xl">Meet {name}!</h2>
        {busy ? <Working child={child} label={`Drawing ${name}…`} /> : portrait ? <img src={portrait.url} alt={name} className="mx-auto w-full max-w-md rounded-3xl bg-background shadow-lift" />
          : <p className="text-muted-foreground">Bugley will draw {name} from head to toe. Each try uses 1 glow.</p>}
        {note && !busy && <p role="alert" className="rounded-2xl bg-muted p-4 font-medium">{note}</p>}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void generate()} disabled={busy} className={cn("inline-flex h-14 items-center gap-2 rounded-full px-6 font-display text-lg shadow-glow disabled:opacity-50", portrait ? "border-2 border-primary bg-card" : "bg-primary text-primary-foreground")}>{portrait ? <><RefreshCw className="size-5" />Try again · 1 glow</> : <><Wand2 className="size-5" />Draw {name} · 1 glow</>}</button>
          {portrait && <button onClick={() => void save()} disabled={busy} className="inline-flex h-14 items-center gap-2 rounded-full bg-primary px-6 font-display text-lg text-primary-foreground shadow-glow disabled:opacity-50"><Check className="size-5" />I love it! Save to My Cast</button>}
        </div></>}
    </section>
    <div className="flex justify-between">
      <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || busy} className="rounded-full px-5 py-3 font-semibold hover:bg-muted disabled:opacity-40">Back</button>
      {step < 5 && <button onClick={() => setStep(step + 1)} disabled={!canNext} className="rounded-full bg-primary px-8 py-3 font-display text-primary-foreground shadow-glow disabled:opacity-40">Next</button>}
    </div>
  </div>;
}
