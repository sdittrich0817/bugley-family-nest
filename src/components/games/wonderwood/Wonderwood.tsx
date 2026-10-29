import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Flower2, Leaf, Pause, Play, RotateCcw, Sparkles, Star, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import world from "@/assets/wonderwood/world.jpg";
import sprig from "@/assets/wonderwood/sprig.png";
import redBerry from "@/assets/wonderwood/red-berry.png";
import blueBerry from "@/assets/wonderwood/blue-berry.png";
import redStone from "@/assets/wonderwood/red-stone.png";
import blueStone from "@/assets/wonderwood/blue-stone.png";
import { addExample, CHECKS, guess, REPAIR, ROUND_MS, SNACKS, SURPRISE, TRAINING, type Example, type Kind, type Sample } from "./learning";

type Stage = "welcome" | "teach" | "surprise" | "repair" | "check" | "rescue" | "complete";
const ART = { "red-berry": redBerry, "blue-berry": blueBerry, "red-stone": redStone, "blue-stone": blueStone };
function Item({ sample, className = "" }: { sample: Sample; className?: string }) {
  return <img src={ART[`${sample.color}-${sample.kind}`]} alt={`${sample.color} ${sample.kind}`} width={512} height={512} className={`ww-item ${className}`} draggable={false} />;
}
const CHAPTERS = ["Teach Sprig", "Test a guess", "Save snack time"];

export function Wonderwood() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [index, setIndex] = useState(0);
  const [examples, setExamples] = useState<Example[]>([]);
  const [feedback, setFeedback] = useState("");
  const [paused, setPaused] = useState(false);
  const [voice, setVoice] = useState(false);
  const [fed, setFed] = useState<string[]>([]);
  const [expired, setExpired] = useState(false);
  const start = useRef(0);
  const chapter = stage === "teach" ? 0 : stage === "surprise" || stage === "repair" || stage === "check" ? 1 : 2;
  const sample = stage === "teach" ? TRAINING[index] : stage === "surprise" ? SURPRISE : stage === "repair" ? REPAIR : stage === "check" ? CHECKS[index] : null;
  const prediction = sample ? guess(examples, sample) : null;
  const line = stage === "welcome" ? "Sprig is an AI learner. It needs your help finding berries for the woodland picnic!" :
    stage === "teach" ? "Sprig learns from examples. Is this a berry or a stone?" :
    stage === "surprise" ? "Uh-oh! Sprig thinks this red stone is a berry. Its examples made color look like the clue!" :
    stage === "repair" ? "Now show Sprig a blue berry. Different examples help AI make better guesses." :
    stage === "check" ? `A new ${sample?.color} ${sample?.kind}! Sprig guesses “${prediction}.” Check its guess.` :
    stage === "rescue" ? "Picnic time! Tap two berries for Sprig. Check its guesses before you choose." :
    expired ? "Our adventure is resting. You can start a fresh round whenever you like." : "You did it! Sprig learned from your examples. AI can make mistakes — and you can help it improve.";

  useEffect(() => {
    if (stage === "welcome" || stage === "complete") return;
    const timer = window.setInterval(() => {
      if (Date.now() - start.current >= ROUND_MS) { setExpired(true); setPaused(false); setStage("complete"); }
    }, 500);
    return () => clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    if (!voice || paused || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(feedback || line);
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
    return () => window.speechSynthesis.cancel();
  }, [line, voice, feedback, paused]);
  function begin() { start.current = Date.now(); setExamples([]); setIndex(0); setFed([]); setFeedback(""); setExpired(false); setPaused(false); setStage("teach"); }
  function label(kind: Kind) {
    if (!sample) return;
    if (kind !== sample.kind) { setFeedback(kind === "berry" ? "Look closely: no leaves or seeds. This one is a stone. Try again!" : "See the little leaves and seeds? This one is a berry. Try again!"); return; }
    setExamples(previous => addExample(previous, sample, kind)); setFeedback("");
    if (stage === "teach") { if (index < TRAINING.length - 1) setIndex(index + 1); else { setIndex(0); setStage("surprise"); } }
    else if (stage === "surprise") setStage("repair");
    else if (stage === "repair") { setIndex(0); setStage("check"); }
    else if (stage === "check") { if (index < CHECKS.length - 1) setIndex(index + 1); else { setIndex(0); setStage("rescue"); } }
  }
  function feed(item: Sample) {
    if (item.kind !== "berry") { setFeedback("That's a stone, not a snack! You checked before Sprig ate it. Find a berry."); return; }
    const next = [...fed, item.id]; setFed(next); setFeedback("A tasty berry! Sprig gives you a happy little wiggle.");
    if (next.length === 2) { setFeedback(""); setStage("complete"); }
  }
  return <div className="wonderwood text-foreground">
    <img src={world} alt="Wonderwood's sunlit woodland, treehouse, stone bridge and waterfall" width={1536} height={1024} className="ww-world" />
    <header className="ww-header">
      <Button variant="ghost" size="icon" asChild title="Leave the playground"><Link to="/kids/studio/games" aria-label="Leave the playground"><ArrowLeft /></Link></Button>
      <div className="ww-wordmark"><span className="flex items-center gap-2"><Leaf className="size-5" /> WONDERWOOD</span><span className="ww-edition">BUGLEY’S GAME PLAYGROUND</span></div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" title={voice ? "Turn off read aloud" : "Read aloud"} aria-label={voice ? "Turn off read aloud" : "Read aloud"} onClick={() => setVoice(!voice)}>{voice ? <Volume2 /> : <VolumeX />}</Button>
        {stage !== "welcome" && stage !== "complete" && <Button variant="ghost" size="icon" title="Pause game" aria-label="Pause game" onClick={() => setPaused(true)}><Pause /></Button>}
        <span className="ww-lab-label">PLAYTEST 01</span>
      </div>
    </header>

    {stage === "welcome" ? <>
      <div className="ww-intro">
        <span className="ww-eyebrow"><Flower2 className="size-4" /> THE BERRY MIX-UP</span>
        <h1>A little creature.<br />A big adventure.</h1>
        <p>Meet Sprig. Teach it, test its guesses,<br className="hidden sm:block" /> and rescue the woodland picnic.</p>
        <Button size="lg" onClick={begin} className="ww-start"><Play /> Let’s play <ArrowRight /></Button>
        <span className="ww-intro-note">One little adventure · No Glow needed</span>
      </div>
      <div className="ww-sprig ww-sprig-welcome"><img src={sprig} alt="Sprig, your friendly leaf-eared AI learner" width={816} height={816} /><span className="ww-name">Hello, I’m Sprig!</span></div>
      <div className="ww-welcome-guide"><Bugley stage="scout" size={110} expression="curious" /><p>{line}</p></div>
    </> : <>
      <nav className="ww-chapters" aria-label="Adventure progress">{CHAPTERS.map((name, i) => <div key={name} className={`ww-chapter ${chapter === i ? "ww-chapter-active" : ""}`}><span>{chapter > i || stage === "complete" && !expired ? <Check className="size-4" /> : i + 1}</span><b>{name}</b></div>)}</nav>
      <aside className="ww-journal">
        <span className="ww-eyebrow"><Leaf className="size-4" /> FIELD NOTES</span>
        <h2>{stage === "complete" ? "Adventure complete" : CHAPTERS[chapter]}</h2>
        <p>{stage === "teach" ? "Show Sprig what berries and stones look like." : stage === "surprise" || stage === "repair" ? "Even AI gets things mixed up. Let's help." : stage === "check" ? "New examples. Better guesses. You’re the checker!" : "A little learning. A very happy picnic."}</p>
        <div className="ww-examples"><span>{examples.length} examples taught</span><div className="flex flex-wrap gap-1">{examples.map(e => <Item key={e.sample.id} sample={e.sample} className="ww-mini" />)}</div></div>
        <span className="ww-journal-bottom">CHAPTER {chapter + 1} OF 3</span>
      </aside>
      <div className={`ww-sprig ${stage === "complete" ? "ww-sprig-celebrate" : ""}`}><img src={sprig} alt="Sprig" width={816} height={816} /><span className="ww-name">{stage === "complete" ? "You’re my AI buddy!" : stage === "teach" ? "Teach me!" : "Sprig · AI learner"}</span></div>
      {sample && <div className="ww-discovery" key={sample.id}>
        {(stage === "surprise" || stage === "check") && <div className="ww-guess"><Sparkles className="size-4" /> Sprig guesses: <b>{prediction}</b></div>}
        <Item sample={sample} /><span className="ww-discovery-label">{stage === "teach" ? `EXAMPLE ${index + 1} / 4` : stage === "repair" ? "A DIFFERENT EXAMPLE" : "CHECK THE GUESS"}</span>
      </div>}
      {stage === "rescue" && <div className="ww-snacks" aria-label="Picnic snacks">{SNACKS.map(item => <Button key={item.id} variant="secondary" disabled={fed.includes(item.id) || paused} onClick={() => feed(item)} aria-label={`Choose ${item.color} ${item.kind}`} className="ww-snack"><Item sample={item} /><span>Sprig: {guess(examples, item)}</span>{fed.includes(item.id) && <Check className="ww-snack-check" />}</Button>)}</div>}
      {stage === "complete" && <div className="ww-award"><div className="ww-award-stars"><Star /><Star /><Star /></div><h1>{expired ? "Time for a rest" : "Picnic saved!"}</h1><p>{expired ? "A fresh adventure is waiting." : "You’re a Wonderwood AI helper."}</p>{!expired && <span><Leaf className="size-4" /> Teach · Test · Check</span>}</div>}
      <section className="ww-guide" aria-label="Bugley's guidance">
        <Bugley stage="scout" expression={stage === "complete" ? "celebrating" : feedback ? "thinking" : "happy"} size={112} className="ww-bugley" />
        <div className="ww-guide-content"><span className="ww-guide-name">BUGLEY’S HERE TO HELP</span><p role="status" aria-live="polite">{feedback || line}</p>
          <div className="ww-actions">
            {(stage === "teach" || stage === "repair") && <><Button onClick={() => label("berry")} disabled={paused}><Leaf /> Berry</Button><Button variant="secondary" onClick={() => label("stone")} disabled={paused}>Stone</Button></>}
            {stage === "surprise" && <Button onClick={() => label("stone")} disabled={paused}><Check /> That’s a stone! <ArrowRight /></Button>}
            {stage === "check" && <><Button onClick={() => label(prediction ?? "stone")} disabled={paused}><Check /> Good guess!</Button><Button variant="secondary" onClick={() => setFeedback("Look for seeds and leaves, then teach Sprig the right answer.")} disabled={paused}>Help me check</Button></>}
            {stage === "rescue" && <span className="ww-basket"><Leaf className="size-4" /> {fed.length} / 2 picnic berries</span>}
            {stage === "complete" && <Button onClick={begin}><RotateCcw /> Play again</Button>}
          </div>
        </div>
      </section>
    </>}
    {paused && <div className="ww-pause" role="dialog" aria-modal="true" aria-labelledby="ww-pause-title"><div><Bugley size={120} expression="sleepy" /><h2 id="ww-pause-title">Taking a little breather</h2><p>Sprig will be right here.</p><Button size="lg" onClick={() => setPaused(false)}><Play /> Keep playing</Button><Button variant="ghost" onClick={begin}><RotateCcw /> Start over</Button><Button variant="ghost" aria-label="Close pause" onClick={() => setPaused(false)}><X /></Button></div></div>}
  </div>;
}