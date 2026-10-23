import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Send } from "lucide-react";
import { Bugley, type BugleyStage } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { askBugley } from "@/lib/studio.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export type SidekickChild = { id: string; nickname: string; age_band: string; bugley_stage: BugleyStage };
type Msg = { from: "bugley" | "kid"; text: string };

export function speak(text: string) {
  const s = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text); u.rate = 0.9; u.pitch = 1.2; s.speak(u);
}

/** Shared Bugley conversation used by the prompt bar and the sidekick panel. */
export function useBugleyChat(child: SidekickChild, context: string, opening: string, openingChips: string[]) {
  const [messages, setMessages] = useState<Msg[]>([{ from: "bugley", text: opening }]);
  const [chips, setChips] = useState(openingChips);
  const [busy, setBusy] = useState(false);
  const readAloud = child.age_band === "sprouts";
  const send = useCallback(async (text: string, source: "prompt_bar" | "sidekick" | "chip" = "sidekick") => {
    const t = text.trim();
    if (!t || busy) return;
    setMessages((m) => [...m, { from: "kid", text: t }]);
    setChips([]); setBusy(true);
    try {
      const r = await askBugley({ data: { childId: child.id, text: t, source, context, environment: getStripeEnvironment() } });
      setMessages((m) => [...m, { from: "bugley", text: r.reply }]);
      setChips(r.chips);
      if (readAloud) speak(r.reply);
    } catch {
      setMessages((m) => [...m, { from: "bugley", text: "Hmm, my glow flickered! Let’s try that again." }]);
    } finally { setBusy(false); }
  }, [busy, child.id, context, readAloud]);
  const say = useCallback((text: string, next?: string[]) => {
    setMessages((m) => [...m, { from: "bugley", text }]);
    if (next) setChips(next);
    if (readAloud) speak(text);
  }, [readAloud]);
  return { messages, chips, busy, send, say, readAloud };
}
export type BugleyChat = ReturnType<typeof useBugleyChat>;

/** Browser speech-to-text for Sprouts. Kids speak; nothing is uploaded or stored. */
export function useVoiceInput(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const rec = useRef<any>(null);
  useEffect(() => { setSupported(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)); }, []);
  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e: any) => onText(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  };
  return { supported, listening, start };
}

function BugleyFace({ child, size, thinking }: { child: SidekickChild; size: number; thinking?: boolean }) {
  return child.age_band === "builders"
    ? <BugleyMature variant="headphones" size={size} />
    : <Bugley stage={child.bugley_stage} expression={thinking ? "thinking" : "curious"} glow size={size} />;
}

function Panel({ child, chat }: { child: SidekickChild; chat: BugleyChat }) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput((t) => void chat.send(t));
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [chat.messages.length, chat.busy]);
  const sprouts = child.age_band === "sprouts";
  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex items-center gap-3 border-b border-border pb-3">
      <BugleyFace child={child} size={56} thinking={chat.busy} />
      <div><p className="font-display text-lg leading-tight">Bugley</p><p className="text-xs text-muted-foreground">Your AI helper (not a person!)</p></div>
    </div>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite">
      {chat.messages.map((m, i) => <div key={i} className={cn("max-w-[88%] rounded-2xl px-4 py-2.5 leading-snug animate-in fade-in slide-in-from-bottom-1 duration-300", m.from === "bugley" ? "rounded-tl-sm bg-primary/20" : "ml-auto rounded-tr-sm bg-muted", sprouts && "text-lg")}>{m.text}</div>)}
      {chat.busy && <div className="flex w-16 gap-1 rounded-2xl bg-primary/20 px-4 py-3" aria-label="Bugley is thinking">{[0, 1, 2].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: `${d * 120}ms` }} />)}</div>}
      <div ref={end} />
    </div>
    {chat.chips.length > 0 && <div className="flex flex-wrap gap-2 pb-3">{chat.chips.map((c) => <button key={c} onClick={() => void chat.send(c, "chip")} className={cn("rounded-full border-2 border-primary bg-card px-3 py-1.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground", sprouts && "px-4 py-2.5 text-base")}>{c}</button>)}</div>}
    <form onSubmit={(e) => { e.preventDefault(); void chat.send(text); setText(""); }} className="flex items-center gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="Ask Bugley…" aria-label="Ask Bugley something" className="h-11 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 outline-none focus:border-primary" />
      {sprouts && voice.supported && <button type="button" onClick={voice.start} aria-label="Talk to Bugley" className={cn("flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary", voice.listening && "animate-pulse bg-primary")}><Mic className="size-5" /></button>}
      <button type="submit" disabled={chat.busy || !text.trim()} aria-label="Send" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow disabled:opacity-50"><Send className="size-5" /></button>
    </form>
  </div>;
}

/** Bugley the sidekick: a side panel on larger screens, a floating Bugley button on phones. */
export function Sidekick({ child, chat, className }: { child: SidekickChild; chat: BugleyChat; className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <aside className={cn("hidden h-[calc(100vh-7rem)] w-80 shrink-0 rounded-3xl border border-border bg-card p-4 shadow-soft lg:sticky lg:top-24 lg:flex lg:flex-col", className)}><Panel child={child} chat={chat} /></aside>
    <button onClick={() => setOpen(true)} aria-label="Talk to Bugley" className="fixed bottom-5 right-5 z-40 flex size-20 items-center justify-center rounded-full bg-card shadow-glow ring-4 ring-primary/40 transition hover:scale-105 lg:hidden">
      <BugleyFace child={child} size={64} />
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="flex h-[85vh] flex-col rounded-t-3xl">
        <SheetHeader className="sr-only"><SheetTitle>Bugley</SheetTitle></SheetHeader>
        <Panel child={child} chat={chat} />
      </SheetContent>
    </Sheet>
  </>;
}
