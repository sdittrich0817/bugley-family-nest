import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BugleyStep, type StepChoice } from "./BugleyStep";
import { HeroBuilder, type HeroRole } from "./HeroBuilder";
import type { BugleyChat, SidekickChild } from "./Sidekick";
import { listCast, stylesOptions } from "@/lib/images.functions";
import { storySetupIdeas } from "@/lib/story.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import { COMIC_GENRES } from "@/lib/comic";
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

export function StorySetup({ child, chat, onCreate, kind = "story" }: { child: SidekickChild; chat: BugleyChat; onCreate: (r: SetupResult) => Promise<void>; kind?: "story" | "comic" }) {
  const comic = kind === "comic";
  const [genre, setGenre] = useState<SetupResult["genre"] | null>(comic ? null : "Adventure");
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
  const [busy, setBusy] = useState(false);
  const { data: styles = [] } = useQuery(stylesOptions);
  const { data: cast = [], refetch } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const ideas = useServerFn(storySetupIdeas);
  useScrollTopOn(`${step}-${making}-${picking}-${genre}`);
  useEffect(() => {
    if (making) return;
    chat.say(!genre ? "What kind of comic?" : step === 4 ? "Add a sidekick or villain?" : busy ? "Thinking about your adventure…" : step === 0 ? (comic ? "Pick your comic’s look!" : "Pick your story’s look!") : step === 1 ? "Who’s your hero?" : step === 2 ? `Where does ${hero?.name ?? "your hero"} live?` : "Uh-oh! What goes wrong?", []);
  }, [step, making, busy, genre]);
  async function choosePlace(text: string) {
    if (!hero || busy) return;
    setBusy(true);
    try {
      const result = await ideas({ data: { childId: child.id, heroId: hero.id, place: text, genre: genre ?? "Adventure", environment: getStripeEnvironment() } });
      setPlace(text); setProblems(result.problems); setStep(3);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Try another made-up place."); }
    finally { setBusy(false); }
  }
  async function start(selectedProblem: string) {
    if (!hero || busy) return;
    setBusy(true);
    try { await onCreate({ title: comic ? "My new comic" : "My new story", genre: genre ?? "Adventure", styleKey: style, characterIds: [hero.id, ...extra], map: { hero: hero.name, place, problem: selectedProblem, want: "Find a way to help", ending: "The child decides" } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Your idea is still here. Try again."); }
    finally { setBusy(false); }
  }
  if (busy) return <BugleyStep child={child} bare question="Thinking about your adventure…" choices={[]} allowOwnIdea={false} onChoose={() => {}} mood="painting" />;
  if (making) return <HeroBuilder child={child} chat={chat} styleKey={style} role={role} onBack={() => setMaking(false)} onDone={async (id) => {
    const result = await refetch(); const found = result.data?.find((c) => c.id === id);
    if (!found) { toast.error("Your hero is saved. Choose them from My Heroes."); setMaking(false); setPicking(true); return; }
    if (role === "hero") { setHero({ id, name: found.title }); setStep(2); } else { setExtra((ids) => [...new Set([...ids, id])].slice(0, 2)); setStep(4); } setMaking(false);
  }} />;
  if (!genre) return <BugleyStep child={child} bare question="What kind of comic?" choices={COMIC_GENRES.map((g, i) => ({ key: g, label: g, image: GENRE_ART[i] }))} allowOwnIdea={false} onChoose={(c) => setGenre(c.key === "Animal Heroes" ? "Animal Tales" : c.key as SetupResult["genre"])} />;
  if (step === 4) return <BugleyStep child={child} bare question="Add a sidekick or villain?" allowOwnIdea={false} onBack={() => setStep(3)} choices={extra.length >= 2 ? [{ key: "ready", label: "We’re ready!", emoji: "🚀" }] : [{ key: "sidekick", label: "Add a sidekick", emoji: "🤝" }, { key: "villain", label: "Add a villain", emoji: "😈" }, { key: "ready", label: extra.length ? "We’re ready!" : "No thanks", emoji: "🚀" }]} onChoose={(c) => { if (c.key === "ready") void start(problem); else { setRole(c.key as HeroRole); setMaking(true); } }} />;
  const orderedStyles = comic ? [...styles].sort((a, b) => Number(b.key === "classic_comic") - Number(a.key === "classic_comic")) : styles;
  const placeChoices: StepChoice[] = !comic ? PLACES : genre === "Space" ? [
    { key: "station", label: "A cozy space station", emoji: "🚀" }, { key: "moon", label: "A colorful moon village", emoji: "🌙" }, { key: "planet", label: "A planet of gardens", emoji: "🪐" }, { key: "comet", label: "A comet clubhouse", emoji: "☄️" },
  ] : genre === "Superhero" ? [
    { key: "city", label: "A rooftop city", emoji: "🏙️" }, { key: "hideout", label: "A secret hideout", emoji: "🦸" }, { key: "garden", label: "A giant garden", emoji: "🌻" }, { key: "cloud", label: "A floating neighborhood", emoji: "☁️" },
  ] : genre === "Mystery" || genre === "Spooky-Not-Scary" ? [
    { key: "library", label: "A secret-door library", emoji: "📚" }, { key: "tree", label: "A creaky tree house", emoji: "🌳" }, { key: "village", label: "A lantern-lit village", emoji: "🏮" }, { key: "garden", label: "An overgrown garden", emoji: "🌿" },
  ] : PLACES;
  if (step === 0) return <BugleyStep child={child} bare question={comic ? "Pick your comic’s look!" : "Pick your story’s look!"} choices={orderedStyles.map((s) => ({ key: s.key, label: comic && s.key === "classic_comic" ? "Comic" : s.name, image: STYLE_THUMBS[s.key] }))} allowOwnIdea={false} step={0} steps={4} onChoose={(c) => { setStyle(c.key); setStep(1); chat.say("Who’s your hero?", []); }} />;
  if (step === 1) return <BugleyStep child={child} bare question={picking ? "Which of your heroes?" : "Who’s your hero?"} choices={picking ? cast.map((c) => ({ key: c.id, label: c.title, image: c.url })) : [{ key: "new", label: "Build a new hero", emoji: "✨" }, ...(cast.length ? [{ key: "existing", label: "Use a hero I made", emoji: "📚" }] : [])]} allowOwnIdea={false} step={1} steps={4} onBack={() => picking ? setPicking(false) : setStep(0)} onChoose={(c) => {
    if (!picking) { if (c.key === "new") { setRole("hero"); setMaking(true); } else setPicking(true); }
    else { setHero({ id: c.key, name: c.label }); setStep(2); chat.say(`Where does ${c.label} live?`, []); }
  }} />;
  if (step === 2) return <BugleyStep child={child} bare question={`Where does ${hero?.name ?? "your hero"} live?`} choices={placeChoices} ownIdeaBelow step={2} steps={4} onBack={() => setStep(1)} onChoose={(c) => void choosePlace(c.label)} onOwnIdea={(t) => void choosePlace(t)} />;
  return <BugleyStep child={child} bare question="Uh-oh! What goes wrong?" choices={problems.map((p, i) => ({ key: `${i}`, label: p, emoji: ["🌀", "🔎", "⛈️"][i] }))} step={3} steps={4} onBack={() => setStep(2)} onChoose={(c) => { if (comic) { setProblem(c.label); setStep(4); } else void start(c.label); }} onOwnIdea={(t) => { if (comic) { setProblem(t); setStep(4); } else void start(t); }} />;
}