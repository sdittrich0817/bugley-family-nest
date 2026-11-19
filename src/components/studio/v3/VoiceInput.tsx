// A3.2: one microphone control for comic boxes. Uses only the browser's own speech recognition: Bugley's code never
// records, uploads or keeps audio, but the browser itself may send the sound to its maker's speech service (Chrome:
// Google; Safari: Apple) to turn it into words. Recognised words go into the child's box, where they can edit them,
// and are saved and safety-checked exactly like typed words.
import { useEffect, useRef, useState } from "react";
import { Check, Keyboard, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { speak } from "../Sidekick";
import { readResults, voiceProblem, VOICE_MESSAGES, type VoiceProblem } from "@/lib/kid-input";
import { bandOf } from "@/lib/comic-setup";

type Recognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
const recognizer = (): (new () => Recognizer) | undefined =>
  typeof window === "undefined" ? undefined : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Only one microphone listens at a time across the page.
let active: Recognizer | null = null;

/**
 * Pending founder approval of the A3.2 voice privacy review: boxes that had no microphone before A3.2 (character
 * "what to change", comic name, speech bubbles) stay without one until consent/disclosure decisions are made.
 * Boxes that already had a microphone keep it.
 */
export const VOICE_IN_NEW_BOXES = false;

export type VoiceState = "idle" | "listening" | "heard" | "problem";

export function useVoice(onFinal: (words: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [problem, setProblem] = useState<VoiceProblem | null>(null);
  const rec = useRef<Recognizer | null>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;
  useEffect(() => {
    setSupported(!!recognizer());
    return () => {
      if (rec.current) {
        rec.current.onend = rec.current.onerror = rec.current.onresult = null;
        rec.current.abort();
        if (active === rec.current) active = null;
      }
    };
  }, []);
  const start = () => {
    const SR = recognizer();
    if (!SR) {
      setSupported(false);
      return;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    active?.abort();
    const r = new SR();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    let got = false;
    let failed = false;
    const timer = setTimeout(() => r.stop(), 30000);
    r.onresult = (e) => {
      const { final, interim: live } = readResults(e.results, e.resultIndex ?? 0);
      if (final) {
        got = true;
        cb.current(final);
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      failed = true;
      const p = voiceProblem(e?.error);
      if (p === "stopped") setState(got ? "heard" : "idle");
      else if (!got) {
        setProblem(p);
        setState("problem");
      }
    };
    r.onend = () => {
      clearTimeout(timer);
      if (active === r) active = null;
      rec.current = null;
      setInterim("");
      if (got) setState("heard");
      else if (!failed) {
        setProblem("nothing");
        setState("problem");
      }
    };
    rec.current = r;
    active = r;
    setProblem(null);
    setInterim("");
    try {
      r.start();
      setState("listening");
    } catch {
      clearTimeout(timer);
      rec.current = active = null;
      setProblem("unavailable");
      setState("problem");
    }
  };
  const stop = () => rec.current?.stop();
  return { supported, state, interim, problem, start, stop };
}

/** "Say it" button with Listening…, Stop, "Got it!" and typing fallback. Sized by age band. */
export function VoiceButton({
  ageBand,
  onText,
  label = "Say it",
  what = "your words",
  disabled,
  className,
}: {
  ageBand: string;
  onText: (words: string) => void;
  label?: string;
  what?: string;
  disabled?: boolean;
  className?: string;
}) {
  const band = bandOf(ageBand);
  const v = useVoice(onText);
  const heardMsg = "Got it! Your words are in the box. You can change any word by typing.";
  const problemMsg = v.problem ? VOICE_MESSAGES[v.problem] : "";
  useEffect(() => {
    if (band !== "sprouts") return;
    if (v.state === "heard") speak("Got it!");
    else if (v.state === "problem" && problemMsg) speak(problemMsg);
  }, [v.state, problemMsg, band]);
  if (v.supported === null) return null;
  if (!v.supported)
    return band === "builders" ? null : (
      <p className={cn("flex items-center gap-2 text-sm font-semibold text-muted-foreground", className)}>
        <Keyboard className="size-4 shrink-0" />
        {band === "sprouts"
          ? "Talking to Bugley doesn’t work in this browser. Type in the box, or ask your grown-up to help."
          : "Talking to Bugley doesn’t work in this browser, so type in the box."}
      </p>
    );
  const listening = v.state === "listening";
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button
        type="button"
        size={band === "sprouts" ? "lg" : band === "builders" ? "sm" : "default"}
        variant={listening ? "default" : band === "builders" ? "outline" : "secondary"}
        disabled={disabled && !listening}
        aria-label={listening ? "Stop listening" : `${v.state === "heard" ? "Say more" : label}: speak ${what}`}
        aria-pressed={listening}
        onClick={listening ? v.stop : v.start}
        className={cn(
          band === "sprouts" && "h-16 min-w-40 rounded-2xl px-6 text-xl [&_svg]:size-7",
          listening && "shadow-glow",
        )}
      >
        {listening ? <Square /> : <Mic />}
        {listening ? "Stop" : v.state === "heard" ? "Say more" : label}
      </Button>
      <p role="status" aria-live="polite" className="min-w-0 flex-1 basis-48 text-base font-semibold">
        {listening ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-primary-foreground">
              <span aria-hidden className="size-2 animate-ping rounded-full bg-primary-foreground" />
              Listening…
            </span>
            <span className="italic text-muted-foreground">{v.interim || "Say your words, then tap Stop."}</span>
          </span>
        ) : v.state === "heard" ? (
          <span className="flex items-start gap-2">
            <Check className="mt-0.5 size-5 shrink-0 text-primary" />
            {heardMsg}
          </span>
        ) : v.state === "problem" ? (
          <span className="text-muted-foreground">{problemMsg}</span>
        ) : null}
      </p>
    </div>
  );
}
