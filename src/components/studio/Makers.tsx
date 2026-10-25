import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Sparkles } from "lucide-react";
import { listCast, makePicture, upgradePicture, stylesOptions } from "@/lib/images.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import type { BugleyChat, SidekickChild } from "@/components/studio/Sidekick";
import { Button } from "@/components/ui/button";
import { BugleyStep } from "./BugleyStep";
import { cn } from "@/lib/utils";
import { SafeRetry } from './SafeRetry';

export function StylePicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const { data: styles = [] } = useQuery(stylesOptions);
  const [page,setPage]=useState(0);
  return <div className="flex gap-3 overflow-x-auto pb-2">
    {styles.slice(page*3,page*3+3).map((s) => <Button variant="outline" key={s.key} onClick={() => onChange(s.key)} aria-pressed={value === s.key}
      className={cn("w-28 shrink-0 overflow-hidden rounded-2xl border-2 bg-card text-left transition", value === s.key ? "border-primary shadow-glow" : "border-border hover:border-primary")}>
      {STYLE_THUMBS[s.key] && <img src={STYLE_THUMBS[s.key]} alt="" loading="lazy" width={112} height={112} className="aspect-square w-full object-cover" />}
      <span className="block px-2 py-1.5 text-sm font-semibold leading-tight">{s.name}</span>
    </Button>)}
    {styles.length>3&&<Button variant="outline" onClick={()=>setPage((page+1)%Math.ceil(styles.length/3))}>More looks</Button>}
  </div>;
}

function useGlowRefresh(childId: string) {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: ["glow", childId] }); void qc.invalidateQueries({ queryKey: ["album", childId] }); };
}

const PICTURE_IDEAS = [
  { key: "dragon", label: "A dragon", emoji: "🐉" },
  { key: "sea", label: "Under the sea", emoji: "🐠" },
  { key: "castle", label: "A candy castle", emoji: "🍭" },
  { key: "space", label: "A space party", emoji: "🚀" },
];

export function PictureMaker({ child, chat }: { child: SidekickChild; chat: BugleyChat }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [text, setText] = useState("");
  const [style, setStyle] = useState("cartoon");
  const [hero, setHero] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ id: string; url: string; final: boolean } | null>(null);
  const [ideas, setIdeas] = useState(PICTURE_IDEAS);
  useEffect(() => { setIdeas([...PICTURE_IDEAS].sort(() => Math.random() - 0.5)); }, []);
  const { data: cast = [], isPending: castPending } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const { data: styles = [], isPending: stylesPending } = useQuery(stylesOptions);
  const refresh = useGlowRefresh(child.id);
  useScrollTopOn(`${step}-${busy}-${result?.id}-${result?.final}`);
  useEffect(() => { chat.say(["What should I paint?", "Pick a look!", "Add one of your heroes?", "Mixing my colors!"][step] ?? "What should I paint?", []); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function paint(selectedHero: string | null, upgrade = false, selectedStyle = style) {
    if (busy) return;
    setHero(selectedHero); setStep(3); setBusy(true); setNote("");
    try {
      const r = upgrade && result
        ? await upgradePicture({ data: { childId: child.id, environment: getStripeEnvironment(), previewId: result.id } })
        : await makePicture({ data: { childId: child.id, environment: getStripeEnvironment(), styleKey: selectedStyle, description: text, characterIds: selectedHero ? [selectedHero] : [], mode: "sketch" } });
      if (r.ok) {
        setResult({ id: r.id, url: r.url, final: upgrade });
        chat.say(upgrade ? "Wow! Your awesome picture is saved in My Album." : "Ta-da! Your preview is saved in My Album. Want to make it awesome?", []);
      } else { setNote(r.reply); chat.say(r.reply, "chips" in r ? r.chips : []); }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Oops, my paintbrush slipped! Your preview is safe.";
      setNote(message); chat.say(message, []);
    } finally { setBusy(false); refresh(); }
  }
  const chooseIdea = (idea: string) => {
    if (idea.trim().length < 3) { setNote("Tell me a little more first!"); return; }
    setText(idea.trim()); setNote(""); setStep(1);
  };
  const retry = () => { setResult(null); setNote(""); setStep(0); setIdeas([...PICTURE_IDEAS].sort(() => Math.random() - 0.5)); };

  return <div className="space-y-5">
    {step === 0 && <BugleyStep child={child} bare question="What should I paint?" step={0} steps={cast.length ? 3 : 2} choices={ideas} ownIdeaBelow onOwnIdea={chooseIdea} onChoose={(c) => chooseIdea(c.label)} />}
    {step === 1 && (stylesPending ? <p role="status" className="text-center font-display text-xl">Getting the paints…</p> : styles.length ? <BugleyStep child={child} bare question="Pick a look!" step={1} steps={cast.length ? 3 : 2} onBack={() => setStep(0)} allowOwnIdea={false}
      choices={styles.map((s) => ({ key: s.key, label: s.name, image: STYLE_THUMBS[s.key] }))}
      onChoose={(c) => { setStyle(c.key); if (castPending || cast.length) setStep(2); else void paint(null, false, c.key); }} /> : <p role="alert">My paints aren’t ready yet. Ask a grown-up!</p>)}
    {step === 2 && (castPending ? <p role="status" className="text-center font-display text-xl">Finding your heroes…</p> : <>
      <BugleyStep child={child} bare question="Add one of your heroes?" step={2} steps={3} onBack={() => setStep(1)} allowOwnIdea={false}
        choices={cast.map((c) => ({ key: c.id, label: c.title, image: c.url }))} onChoose={(c) => void paint(c.key)} />
      <Button variant="secondary" className="mx-auto flex h-14 text-xl" onClick={() => void paint(null)}>No thanks</Button>
    </>)}
    {step === 3 && <>
      {busy ? <BugleyStep child={child} bare question="Painting your picture…" choices={[]} onChoose={() => {}} mood="painting" allowOwnIdea={false} />
        : result ? <img src={result.url} alt={text} className="mx-auto max-h-[70vh] w-full rounded-2xl object-contain shadow-lift" /> : null}
      {!busy && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button size="lg" className="h-16 flex-col gap-0 whitespace-normal text-xl" disabled={!result || result.final} onClick={() => void paint(hero, true)}><span><Sparkles className="mr-2 inline" />Make it awesome!</span><span className="text-sm">{result?.final ? "Saved to My Album" : "2 more glow"}</span></Button>
        <Button variant="secondary" size="lg" className="h-16 text-xl" onClick={retry}><RefreshCw />Try again</Button>
      </div>}
    </>}
    {note && <p role="alert" className="text-center font-semibold">{note}</p>}
    {note&&<SafeRetry message={note} onChoose={idea=>{setResult(null);chooseIdea(idea);chat.say('Pick a look for your new idea!',[]);}}/>}
  </div>;
}

