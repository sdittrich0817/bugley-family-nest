// One-question-per-screen setup shared by the Story Maker and Comic Maker.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Mic, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCreator } from "./Makers";
import { ChoiceTile, GENRE_EMOJI, StepDots, StepNav, field } from "./Guided";
import { useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast, stylesOptions } from "@/lib/images.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { GENRES, EMPTY_MAP } from "@/lib/story";
import { useScrollTopOn } from "@/lib/scroll";
import { cn } from "@/lib/utils";

type MapKey = keyof typeof EMPTY_MAP;
export type SetupResult = { title: string; genre: (typeof GENRES)[number]; styleKey: string; characterIds: string[]; map: typeof EMPTY_MAP };

export function MakerSetup({ child, chat, kind, mapLabels, defaultStyle, onCreate }: {
  child: SidekickChild; chat: BugleyChat; kind: "story" | "comic"; mapLabels: Record<MapKey, string>; defaultStyle: string;
  onCreate: (r: SetupResult) => Promise<void>;
}) {
  const noun = kind === "story" ? "story" : "comic";
  const mapKeys = Object.keys(mapLabels) as MapKey[];
  const [step, setStep] = useState(0);
  const [genre, setGenre] = useState<SetupResult["genre"] | null>(null);
  const [styleKey, setStyle] = useState(defaultStyle);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [map, setMap] = useState({ ...EMPTY_MAP });
  const [making, setMaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: styles = [] } = useQuery(stylesOptions);
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const total = 4 + mapKeys.length;
  const mapKey = step >= 4 ? mapKeys[step - 4] : undefined;
  const voice = useVoiceInput((t) => { if (mapKey) setMap((m) => ({ ...m, [mapKey]: `${m[mapKey]} ${t}`.trim() })); else if (step === 3) setTitle(t.slice(0, 80)); });
  useScrollTopOn(`${step}-${making}`);

  const lines = [
    kind === "story" ? "Let’s write a story! What kind of story is it?" : "Let’s make a comic! What kind of comic is it?",
    kind === "story" ? "What should the pictures look like?" : "Pick your comic’s look. It stays the same on every page.",
    kind === "story" ? "Who’s in your story? Pick friends from My Cast, make a new one, or skip." : "Who’s in your comic? Pick them now so they look the same in every panel.",
    `Give your ${noun} a made-up title. You can change it later!`,
  ];
  useEffect(() => { if (!making) chat.say(mapKey ? `${mapLabels[mapKey]} Your call!` : lines[step] ?? ""); }, [step, making]); // eslint-disable-line react-hooks/exhaustive-deps

  if (making) return <div className="space-y-4"><Button variant="ghost" onClick={() => setMaking(false)}>← Back to my {noun}</Button><CharacterCreator child={child} chat={chat} onDone={() => setMaking(false)} /></div>;
  const next = () => setStep(step + 1), back = step > 0 ? () => setStep(step - 1) : undefined;

  return <div className="space-y-5">
    <StepDots count={total} at={step} />
    {step === 0 && <><h1 className="text-center text-3xl sm:text-4xl">What kind of {noun}?</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{GENRES.map((g) => <ChoiceTile key={g} emoji={GENRE_EMOJI[g]} label={g} selected={genre === g} onClick={() => { setGenre(g); next(); }} />)}</div></>}
    {step === 1 && <><h1 className="text-center text-3xl sm:text-4xl">{kind === "story" ? "What kind of pictures?" : "Pick a comic style"}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{styles.map((s) => <ChoiceTile key={s.key} image={STYLE_THUMBS[s.key]} label={s.name} selected={styleKey === s.key} onClick={() => { setStyle(s.key); next(); }} />)}</div>
      <StepNav onBack={back} /></>}
    {step === 2 && <><h1 className="text-center text-3xl sm:text-4xl">Who’s in it?</h1>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {cast.map((c) => { const on = picked.includes(c.id); return <button key={c.id} onClick={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])} aria-pressed={on} className={cn("relative overflow-hidden rounded-3xl border-2 bg-card shadow-soft", on ? "border-primary shadow-glow" : "border-border")}>
          <img src={c.url} alt="" className="aspect-square w-full object-cover" /><span className="block truncate px-2 py-1.5 font-semibold">{c.title}</span>{on && <Check className="absolute right-2 top-2 size-7 rounded-full bg-primary p-1" />}</button>; })}
        <button onClick={() => setMaking(true)} className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary bg-card font-display"><Plus className="size-8" />Make a new one</button>
      </div>
      <StepNav onBack={back} onNext={next} nextLabel={picked.length ? "Next" : "Skip for now"} /></>}
    {step === 3 && <><h1 className="text-center text-3xl sm:text-4xl">What’s it called?</h1>
      <input autoFocus className={cn(field, "text-center text-2xl")} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && title.trim() && next()} placeholder="The Great Pancake Rescue" aria-label={`Title of your ${noun}`} />
      <StepNav onBack={back} onNext={next} canNext={!!title.trim()} /></>}
    {mapKey && <><h1 className="text-center text-3xl sm:text-4xl">{mapLabels[mapKey]}</h1>
      <div className="relative"><textarea autoFocus rows={3} maxLength={600} className={cn(field, "pr-16")} value={map[mapKey]} onChange={(e) => setMap({ ...map, [mapKey]: e.target.value })} aria-label={mapLabels[mapKey]} />
        {voice.supported && <button type="button" onClick={voice.start} aria-label="Say your answer" className={cn("absolute bottom-3 right-3 flex size-12 items-center justify-center rounded-full bg-secondary", voice.listening && "animate-pulse bg-primary")}><Mic className="size-6" /></button>}</div>
      <button onClick={() => void chat.send(`I'm making a ${genre ?? ""} ${noun}. Help me think about: ${mapLabels[mapKey]}`, "chip")} disabled={chat.busy} className="mx-auto flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"><Sparkles className="size-4" />I’m stuck. Ask me a question, Bugley!</button>
      <StepNav onBack={back} busy={busy} canNext={!!map[mapKey].trim()} nextLabel={step === total - 1 ? (busy ? "Starting…" : `Start my ${noun}!`) : "Next"}
        onNext={step < total - 1 ? next : async () => { if (!genre) { setStep(0); return; } setBusy(true); try { await onCreate({ title, genre, styleKey, characterIds: picked, map }); } finally { setBusy(false); } }} /></>}
  </div>;
}
