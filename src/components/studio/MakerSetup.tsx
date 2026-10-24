// One-question-per-screen setup shared by the Story Maker and Comic Maker.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBuilder, type HeroRole } from "./HeroBuilder";
import { BugleyStep, type StepChoice } from "./BugleyStep";
import { ChoiceTile, GENRE_EMOJI, StepDots, StepNav, field } from "./Guided";
import { useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast, stylesOptions } from "@/lib/images.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { GENRES, EMPTY_MAP } from "@/lib/story";
import { useScrollTopOn } from "@/lib/scroll";
import { cn } from "@/lib/utils";

type MapKey = keyof typeof EMPTY_MAP;
export type SetupResult = { title: string; genre: (typeof GENRES)[number]; styleKey: string; characterIds: string[]; map: typeof EMPTY_MAP };

const STYLE_ORDER = ["cartoon", "storybook", "classic_comic", "watercolor", "crayon", "clay", "pixel_art", "paper_cutout"];
function castChoices(count: number, canPick: boolean): StepChoice[] {
  if (count >= 3) return [{ key: "ready", label: "We’re ready!", emoji: "🚀" }];
  const out: StepChoice[] = count === 0
    ? [{ key: "hero", label: "Build a new hero", emoji: "✨" }]
    : [{ key: "sidekick", label: "Add a sidekick", emoji: "🤝" }, { key: "villain", label: "Add a villain", emoji: "😈" }];
  if (canPick) out.push({ key: "pick", label: "Use a hero I made", emoji: "📚" });
  out.push({ key: "ready", label: count ? "We’re ready!" : "No hero today", emoji: count ? "🚀" : "➡️" });
  return out;
}

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
  const [making, setMaking] = useState<HeroRole | null>(null);
  const [castMode, setCastMode] = useState<"menu" | "pick">("menu");
  const [busy, setBusy] = useState(false);
  const { data: styles = [] } = useQuery(stylesOptions);
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const total = 4 + mapKeys.length;
  const mapKey = step >= 4 ? mapKeys[step - 4] : undefined;
  const voice = useVoiceInput((t) => { if (mapKey) setMap((m) => ({ ...m, [mapKey]: `${m[mapKey]} ${t}`.trim() })); else if (step === 3) setTitle(t.slice(0, 80)); });
  useScrollTopOn(`${step}-${making}-${castMode}`);

  const lines = [
    kind === "story" ? "Let’s write a story! What kind of story is it?" : "Let’s make a comic! What kind of comic is it?",
    kind === "story" ? "What should the pictures look like?" : "Pick your comic’s look. It stays the same on every page.",
    kind === "story" ? "Who’s in your story? Pick friends from My Cast, make a new one, or skip." : "Who’s in your comic? Pick them now so they look the same in every panel.",
    `Give your ${noun} a made-up title. You can change it later!`,
  ];
  useEffect(() => { if (!making) chat.say(mapKey ? `${mapLabels[mapKey]} Your call!` : lines[step] ?? ""); }, [step, making]); // eslint-disable-line react-hooks/exhaustive-deps

  if (making) return <HeroBuilder child={child} chat={chat} styleKey={styleKey} role={making} onBack={() => setMaking(null)} onDone={(id) => { setPicked((p) => [...p, id].slice(0, 3)); setMaking(null); setCastMode("menu"); }} />;
  const next = () => setStep(step + 1), back = step > 0 ? () => setStep(step - 1) : undefined;

  return <div className="space-y-5">
    <StepDots count={total} at={step} />
    {step === 0 && <BugleyStep child={child} bare question={`What kind of ${noun}?`} allowOwnIdea={false}
      choices={GENRES.map(g => ({key:g,label:g,emoji:GENRE_EMOJI[g]}))}
      onChoose={c => { const selected=GENRES.find(g=>g===c.key);if(selected){setGenre(selected);next();} }} />}
    {step === 1 && <BugleyStep child={child} bare question={kind === "story" ? "How should our book look?" : "How should our comic look?"} allowOwnIdea={false} onBack={back}
      choices={STYLE_ORDER.map((k) => styles.find((x) => x.key === k)).filter((x): x is NonNullable<typeof x> => !!x).concat(styles.filter((x) => !STYLE_ORDER.includes(x.key))).map((x) => ({ key: x.key, label: x.key === "classic_comic" ? "Comic" : x.name, image: STYLE_THUMBS[x.key] }))}
      onChoose={(c) => { setStyle(c.key); next(); }} />}
    {step === 2 && castMode === "pick" && <BugleyStep child={child} bare question="Which hero should join?" allowOwnIdea={false} onBack={() => setCastMode("menu")}
      choices={cast.filter((c) => !picked.includes(c.id)).map((c) => ({ key: c.id, label: c.title, image: c.url }))}
      onChoose={(c) => { setPicked((p) => [...p, c.key].slice(0, 3)); setCastMode("menu"); }} />}
    {step === 2 && castMode === "menu" && <>
      {picked.length > 0 && <div className="flex flex-wrap justify-center gap-3">{picked.map((id) => { const c = cast.find((x) => x.id === id); return c ? <button key={id} onClick={() => setPicked(picked.filter((x) => x !== id))} className="w-24 overflow-hidden rounded-2xl border-2 border-primary bg-card text-center shadow-glow" aria-label={`Remove ${c.title}`}><img src={c.url} alt="" className="aspect-square w-full object-cover" /><span className="block truncate px-1 py-1 text-sm font-semibold">{c.title}</span></button> : null; })}</div>}
      <BugleyStep child={child} bare allowOwnIdea={false} onBack={back} question={picked.length ? (picked.length >= 3 ? "Your cast is full! Ready?" : "Add a sidekick or villain?") : "Who’s our hero?"}
        choices={castChoices(picked.length, cast.length > picked.length)}
        onChoose={(c) => { if (c.key === "ready") next(); else if (c.key === "pick") setCastMode("pick"); else setMaking(c.key as HeroRole); }} />
    </>}
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
