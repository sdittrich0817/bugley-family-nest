import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BugleyStep, type StepChoice } from "./BugleyStep";
import { HeroBuilder } from "./HeroBuilder";
import type { BugleyChat, SidekickChild } from "./Sidekick";
import { listCast, stylesOptions } from "@/lib/images.functions";
import { storySetupIdeas } from "@/lib/story.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import type { SetupResult } from "./MakerSetup";

const PLACES: StepChoice[] = [
  { key: "forest", label: "An enchanted forest", emoji: "🌳" },
  { key: "clouds", label: "A city in the clouds", emoji: "☁️" },
  { key: "sea", label: "An underwater village", emoji: "🐠" },
  { key: "space", label: "A cozy space station", emoji: "🚀" },
];

export function StorySetup({ child, chat, onCreate }: { child: SidekickChild; chat: BugleyChat; onCreate: (r: SetupResult) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState("storybook");
  const [hero, setHero] = useState<{ id: string; name: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [place, setPlace] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data: styles = [] } = useQuery(stylesOptions);
  const { data: cast = [], refetch } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const ideas = useServerFn(storySetupIdeas);
  useScrollTopOn(`${step}-${making}-${picking}`);
  async function choosePlace(text: string) {
    if (!hero || busy) return;
    setBusy(true);
    try {
      const result = await ideas({ data: { childId: child.id, heroId: hero.id, place: text, environment: getStripeEnvironment() } });
      setPlace(text); setProblems(result.problems); setStep(3);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Try another made-up place."); }
    finally { setBusy(false); }
  }
  async function start(problem: string) {
    if (!hero || busy) return;
    setBusy(true);
    try { await onCreate({ title: "My new story", genre: "Adventure", styleKey: style, characterIds: [hero.id], map: { hero: hero.name, place, problem, want: "Find a way to help", ending: "The child decides" } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Your idea is still here. Try again."); }
    finally { setBusy(false); }
  }
  if (busy) return <BugleyStep child={child} bare question="Thinking about your adventure…" choices={[]} allowOwnIdea={false} onChoose={() => {}} mood="painting" />;
  if (making) return <HeroBuilder child={child} chat={chat} styleKey={style} role="hero" onBack={() => setMaking(false)} onDone={async (id) => {
    const result = await refetch(); const found = result.data?.find((c) => c.id === id);
    if (!found) { toast.error("Your hero is saved. Choose them from My Heroes."); setMaking(false); setPicking(true); return; }
    setHero({ id, name: found.title }); setMaking(false); setStep(2);
  }} />;
  if (step === 0) return <BugleyStep child={child} bare question="Pick your story’s look!" choices={styles.map((s) => ({ key: s.key, label: s.name, image: STYLE_THUMBS[s.key] }))} allowOwnIdea={false} step={0} steps={4} onChoose={(c) => { setStyle(c.key); setStep(1); chat.say("Who’s your hero?", []); }} />;
  if (step === 1) return <BugleyStep child={child} bare question={picking ? "Which of your heroes?" : "Who’s your hero?"} choices={picking ? cast.map((c) => ({ key: c.id, label: c.title, image: c.url })) : [{ key: "new", label: "Build a new hero", emoji: "✨" }, ...(cast.length ? [{ key: "existing", label: "Use a hero I made", emoji: "📚" }] : [])]} allowOwnIdea={false} step={1} steps={4} onBack={() => picking ? setPicking(false) : setStep(0)} onChoose={(c) => {
    if (!picking) { if (c.key === "new") setMaking(true); else setPicking(true); }
    else { setHero({ id: c.key, name: c.label }); setStep(2); chat.say(`Where does ${c.label} live?`, []); }
  }} />;
  if (step === 2) return <BugleyStep child={child} bare question={`Where does ${hero?.name ?? "your hero"} live?`} choices={PLACES} ownIdeaBelow step={2} steps={4} onBack={() => setStep(1)} onChoose={(c) => void choosePlace(c.label)} onOwnIdea={(t) => void choosePlace(t)} />;
  return <BugleyStep child={child} bare question="Uh-oh! What goes wrong?" choices={problems.map((p, i) => ({ key: `${i}`, label: p, emoji: ["🌀", "🔎", "⛈️"][i] }))} step={3} steps={4} onBack={() => setStep(2)} onChoose={(c) => void start(c.label)} onOwnIdea={(t) => void start(t)} />;
}