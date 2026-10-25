import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BugleyStep, type StepChoice } from "./BugleyStep";
import { HeroBuilder, type HeroRole } from "./HeroBuilder";
import { useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { field } from "./Guided";
import { cn } from "@/lib/utils";
import { listCast, stylesOptions } from "@/lib/images.functions";
import { readStoryIdea, storySetupIdeas } from "@/lib/story.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import { COMIC_GENRES } from "@/lib/comic";
import { defaultLength, ideaGenre, matchCastByName, type StoryLength } from "@/lib/story";
import type { SetupResult } from "./MakerSetup";

import genre0 from "@/assets/illustrations/comic-genre-0.jpg";
import genre1 from "@/assets/illustrations/comic-genre-1.jpg";
import genre2 from "@/assets/illustrations/comic-genre-2.jpg";
import genre3 from "@/assets/illustrations/comic-genre-3.jpg";
import genre4 from "@/assets/illustrations/comic-genre-4.jpg";
import genre5 from "@/assets/illustrations/comic-genre-5.jpg";
import genre6 from "@/assets/illustrations/comic-genre-6.jpg";
import genre7 from "@/assets/illustrations/comic-genre-7.jpg";
const GENRE_ART = [genre0,genre1,genre2,genre3,genre4,genre5,genre6,genre7];

const PLACES: StepChoice[] = [
  { key: "forest", label: "An enchanted forest", emoji: "🌳" },
  { key: "clouds", label: "A city in the clouds", emoji: "☁️" },
  { key: "sea", label: "An underwater village", emoji: "🐠" },
  { key: "space", label: "A cozy space station", emoji: "🚀" },
];
const LENGTH_CHOICES: StepChoice[] = [
  { key: "short", label: "A little one", emoji: "🌱" },
  { key: "medium", label: "A middle one", emoji: "🌿" },
  { key: "long", label: "A big one", emoji: "🌳" },
];

export function StorySetup({ child, chat, onCreate, kind = "story" }: { child: SidekickChild; chat: BugleyChat; onCreate: (r: SetupResult) => Promise<void>; kind?: "story" | "comic" }) {
  const comic = kind === "comic";
  const noun = comic ? "comic" : "story";
  const total = comic ? 6 : 5;
  const [genre, setGenre] = useState<SetupResult["genre"] | null>(null);
  const [problem, setProblem] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [role, setRole] = useState<HeroRole>("hero");
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState(comic ? "classic_comic" : "storybook");
  const [hero, setHero] = useState<{ id: string; name: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [place, setPlace] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [length, setLength] = useState<StoryLength | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: styles = [] } = useQuery(stylesOptions);
  const { data: cast = [], refetch } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const ideas = useServerFn(storySetupIdeas);
  const readIdea = useServerFn(readStoryIdea);
  // Opening idea: the child says it once; anything Bugley can read from it is never asked again.
  const [opened, setOpened] = useState(false);
  const [idea, setIdea] = useState("");
  const [seed, setSeed] = useState<{ looks: string; name: string } | null>(null);
  const voice = useVoiceInput((t) => setIdea((v) => `${v} ${t}`.trim().slice(0, 600)));
  const sprouts = child.age_band === "sprouts", builders = child.age_band === "builders";
  useScrollTopOn(`${opened}-${step}-${making}-${picking}-${genre}`);
  useEffect(() => {
    if (making) return;
    if (!opened) { chat.say(busy ? "Ooh, let me read that…" : `Tell me your ${noun} idea! Or skip and pick.`, []); return; }
    chat.say(!genre ? `What kind of ${noun}?` : step === 5 ? "Add a sidekick or villain?" : busy ? "Thinking about your adventure…" : step === 0 ? `Pick your ${noun}’s look!` : step === 1 ? "Who’s your hero?" : step === 2 ? `Where does ${hero?.name ?? "your hero"} live?` : step === 3 ? "Uh-oh! What goes wrong?" : `How big should your ${noun} be?`, []);
  }, [step, making, busy, genre, opened]); // eslint-disable-line react-hooks/exhaustive-deps
  async function submitIdea() {
    const text = idea.trim(); if (text.length < 3 || busy) return;
    setBusy(true); const t0 = performance.now();
    try {
      const r = await readIdea({ data: { childId: child.id, idea: text, kind } });
      if (!r.ok) { chat.say(r.reply, r.chips); return; }
      const f = r.facts; const g = ideaGenre(f.genre);
      if (g) setGenre(g);
      if (f.place) setPlace(f.place);
      if (f.problem) setProblem(f.problem);
      const known = matchCastByName(cast, f.heroName);
      if (known) setHero({ id: known.id, name: known.title });
      else if (f.heroLooks || f.heroName) setSeed({ looks: f.heroLooks || f.heroName, name: f.heroName });
      setOpened(true);
    } catch { setOpened(true); }
    finally { setBusy(false); console.info(`[studio-timing] idea→setup ${Math.round(performance.now() - t0)}ms`); }
  }
  // After the hero is set, jump past anything the opening idea already answered.
  function afterHero(h: { id: string; name: string }) {
    if (place && problem) setStep(4);
    else if (place) void choosePlace(place, h);
    else setStep(2);
  }
  async function choosePlace(text: string, h = hero) {
    if (!h || busy) return;
    if (problem) { setPlace(text); setStep(4); return; }
    setBusy(true);
    try {
      const result = await ideas({ data: { childId: child.id, heroId: h.id, place: text, genre: genre ?? "Adventure", environment: getStripeEnvironment() } });
      setPlace(text); setProblems(result.problems); setStep(3);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Try another made-up place."); }
    finally { setBusy(false); }
  }
  async function start(selectedProblem: string, len: StoryLength | null = length) {
    if (!hero || busy) return;
    setBusy(true);
    try { await onCreate({ title: comic ? "My new comic" : "My new story", genre: genre ?? "Adventure", styleKey: style, characterIds: [hero.id, ...extra], length: len ?? defaultLength(child.age_band), map: { hero: hero.name, place, problem: selectedProblem, want: "Find a way to help", ending: "The child decides" } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Your idea is still here. Try again."); }
    finally { setBusy(false); }
  }
  if (!opened && !busy) return <div className="space-y-4">
    <h1 className={cn("text-center", sprouts ? "text-4xl" : "text-3xl sm:text-4xl")}>What’s your {noun} about?</h1>
    <div className="relative"><textarea autoFocus rows={sprouts ? 2 : 3} maxLength={600} value={idea} onChange={(e) => setIdea(e.target.value)} aria-label={`Your ${noun} idea`}
      placeholder={sprouts ? "A purple dragon named Pickles…" : builders ? "A funny comic about a purple dragon named Pickles who is afraid of flying" : "A purple dragon named Pickles who is afraid of flying"} className={cn(field, "pr-16", sprouts && "text-2xl")} />
      {voice.supported && <button type="button" onClick={voice.start} aria-label="Say your idea" className={cn("absolute bottom-3 right-3 flex size-12 items-center justify-center rounded-full bg-secondary", voice.listening && "animate-pulse bg-primary")}><Mic className="size-6" /></button>}</div>
    <div className="flex flex-wrap justify-center gap-3">
      <Button size="lg" disabled={idea.trim().length < 3} onClick={() => void submitIdea()}>Let’s go!</Button>
      <Button size="lg" variant="ghost" onClick={() => setOpened(true)}>Skip, show me choices</Button>
    </div>
  </div>;
  if (busy) return <BugleyStep child={child} bare question="Thinking about your adventure…" choices={[]} allowOwnIdea={false} onChoose={() => {}} mood="painting" />;
  if (making) return <HeroBuilder child={child} chat={chat} styleKey={style} role={role} initialIdea={role === "hero" ? seed?.looks : ""} initialName={role === "hero" ? seed?.name : ""} onBack={() => { setMaking(false); setSeed(null); setStep(1); }} onDone={async (id) => {
    const result = await refetch(); const found = result.data?.find((c) => c.id === id);
    if (!found) { toast.error("Your hero is saved. Choose them from My Heroes."); setMaking(false); setPicking(true); return; }
    if (role === "hero") { const h = { id, name: found.title }; setHero(h); setSeed(null); afterHero(h); } else { setExtra((ids) => [...new Set([...ids, id])].slice(0, 2)); setStep(4); } setMaking(false);
  }} />;
  if (!genre) return <BugleyStep child={child} bare question={`What kind of ${noun}?`} choices={COMIC_GENRES.map((g, i) => ({ key: g, label: g, image: GENRE_ART[i] }))} allowOwnIdea={false} onChoose={(c) => setGenre(c.key === "Animal Heroes" ? "Animal Tales" : c.key as SetupResult["genre"])} />;
  if (step === 4) return <BugleyStep child={child} bare question={`How big should your ${noun} be?`} allowOwnIdea={false} step={4} steps={total} onBack={() => setStep(3)} choices={LENGTH_CHOICES} onChoose={(c) => { const l = c.key as StoryLength; setLength(l); if (comic) setStep(5); else void start(problem, l); }} />;
  if (step === 5) return <BugleyStep child={child} bare question="Add a sidekick or villain?" allowOwnIdea={false} step={5} steps={total} onBack={() => setStep(4)} choices={extra.length >= 2 ? [{ key: "ready", label: "We’re ready!", emoji: "🚀" }] : [{ key: "sidekick", label: "Add a sidekick", emoji: "🤝" }, { key: "villain", label: "Add a villain", emoji: "😈" }, { key: "ready", label: extra.length ? "We’re ready!" : "No thanks", emoji: "🚀" }]} onChoose={(c) => { if (c.key === "ready") void start(problem); else { setRole(c.key as HeroRole); setMaking(true); } }} />;
  const orderedStyles = comic ? [...styles].sort((a, b) => Number(b.key === "classic_comic") - Number(a.key === "classic_comic")) : styles;
  const placeChoices: StepChoice[] = !comic ? PLACES : genre === "Space" ? [
    { key: "station", label: "A cozy space station", emoji: "🚀" }, { key: "moon", label: "A colorful moon village", emoji: "🌙" }, { key: "planet", label: "A planet of gardens", emoji: "🪐" }, { key: "comet", label: "A comet clubhouse", emoji: "☄️" },
  ] : genre === "Superhero" ? [
    { key: "city", label: "A rooftop city", emoji: "🏙️" }, { key: "hideout", label: "A secret hideout", emoji: "🦸" }, { key: "garden", label: "A giant garden", emoji: "🌻" }, { key: "cloud", label: "A floating neighborhood", emoji: "☁️" },
  ] : genre === "Mystery" || genre === "Spooky-Not-Scary" ? [
    { key: "library", label: "A secret-door library", emoji: "📚" }, { key: "tree", label: "A creaky tree house", emoji: "🌳" }, { key: "village", label: "A lantern-lit village", emoji: "🏮" }, { key: "garden", label: "An overgrown garden", emoji: "🌿" },
  ] : PLACES;
  if (step === 0) return <BugleyStep child={child} bare question={`Pick your ${noun}’s look!`} choices={orderedStyles.map((s) => ({ key: s.key, label: comic && s.key === "classic_comic" ? "Comic" : s.name, image: STYLE_THUMBS[s.key] }))} allowOwnIdea={false} step={0} steps={total} onChoose={(c) => { setStyle(c.key); if (hero) afterHero(hero); else if (seed) { setRole("hero"); setMaking(true); } else setStep(1); }} />;
  if (step === 1) return <BugleyStep child={child} bare question={picking ? "Which of your heroes?" : "Who’s your hero?"} choices={picking ? cast.map((c) => ({ key: c.id, label: c.title, image: c.url })) : [{ key: "new", label: "Build a new hero", emoji: "✨" }, ...(cast.length ? [{ key: "existing", label: "Use a hero I made", emoji: "📚" }] : [])]} allowOwnIdea={false} step={1} steps={total} onBack={() => picking ? setPicking(false) : setStep(0)} onChoose={(c) => {
    if (!picking) { if (c.key === "new") { setRole("hero"); setMaking(true); } else setPicking(true); }
    else { const h = { id: c.key, name: c.label }; setHero(h); afterHero(h); }
  }} />;
  if (step === 2) return <BugleyStep child={child} bare question={`Where does ${hero?.name ?? "your hero"} live?`} choices={placeChoices} ownIdeaBelow step={2} steps={total} onBack={() => setStep(1)} onChoose={(c) => void choosePlace(c.label)} onOwnIdea={(t) => void choosePlace(t)} />;
  return <BugleyStep child={child} bare question="Uh-oh! What goes wrong?" choices={problems.map((p, i) => ({ key: `${i}`, label: p, emoji: ["🌀", "🔎", "⛈️"][i] }))} step={3} steps={total} onBack={() => setStep(2)} onChoose={(c) => { setProblem(c.label); setStep(4); }} onOwnIdea={(t) => { setProblem(t); setStep(4); }} />;
}