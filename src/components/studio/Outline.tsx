// Bugley's story plan: shown once right after setup. The child approves it or asks for one change, then writes every page themselves.
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BugleyStep } from "./BugleyStep";
import { field } from "./Guided";
import type { BugleyChat, SidekickChild } from "./Sidekick";

export function OutlineScreen({ child, chat, outline, noun, busy, onChange, onGo }: {
  child: SidekickChild; chat: BugleyChat; outline: string[]; noun: string; busy: boolean;
  onChange: (note: string) => Promise<void>; onGo: () => void;
}) {
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState("");
  return <div className="space-y-5">
    <BugleyStep child={child} bare hideHeading question={`Here’s my plan for your ${noun}! We can change it — it’s your ${noun}.`} choices={[]} allowOwnIdea={false} onChoose={() => {}} />
    <ol className="space-y-2 rounded-3xl bg-card p-5 shadow-soft">
      {outline.map((line, i) => <li key={i} className="flex gap-3 text-lg"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span><span className="font-semibold leading-snug">{line}</span></li>)}
    </ol>
    {changing ? <div className="space-y-3">
      <textarea autoFocus rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should be different?" aria-label="What should be different?" className={field} />
      <div className="flex justify-center gap-3">
        <Button variant="ghost" onClick={() => setChanging(false)}>Never mind</Button>
        <Button variant="primary" disabled={!note.trim() || busy} onClick={() => { void onChange(note.trim()).then(() => { setNote(""); setChanging(false); }); }}><Sparkles />Change the plan</Button>
      </div>
    </div> : <div className="flex flex-wrap justify-center gap-3">
      <Button variant="secondary" size="lg" disabled={busy} onClick={() => setChanging(true)}>Change something</Button>
      <Button variant="primary" size="lg" disabled={busy} onClick={onGo}>{busy ? "Thinking…" : "Love it — let’s go!"}<ArrowRight /></Button>
    </div>}
  </div>;
}
