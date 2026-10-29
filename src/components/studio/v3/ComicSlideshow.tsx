import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelCanvas } from "../ComicMaker";
import type { Panel } from "@/lib/comic";

/** Full-screen digital slideshow of a finished creation: cover, then every panel or page. */
export function ComicSlideshow({ title, cover, pages, onClose }: { title: string; cover?: string | undefined; pages: { url: string; caption?: string; panel?: Panel; aspect?: number }[]; onClose: () => void }) {
  const slides = [...(cover ? [{ url: cover, caption: title, panel: undefined, aspect: undefined }] : []), ...pages];
  const [at, setAt] = useState(0); const [playing, setPlaying] = useState(true);
  const [loaded, setLoaded] = useState<string | null>(null);
  const s = slides[at];
  const slideKey = `${at}:${s?.url ?? ""}`;
  useEffect(() => {
    if (!playing || loaded !== slideKey || !slides.length) return;
    const timer = setTimeout(() => {
      if (at >= slides.length - 1) setPlaying(false);
      else setAt(a => a + 1);
    }, 3500);
    return () => clearTimeout(timer);
  }, [playing, loaded, slideKey, at, slides.length]);
  function move(delta: number) { setPlaying(false); setAt(a => Math.max(0, Math.min(slides.length - 1, a + delta))); }
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); setPlaying(false); setAt(a => Math.max(0, Math.min(slides.length - 1, a + (e.key === "ArrowRight" ? 1 : -1)))); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [slides.length, onClose]);
  return <div role="dialog" aria-modal="true" aria-label={`${title} slideshow`} className="fixed inset-0 z-50 flex h-dvh flex-col items-center justify-center gap-3 overflow-hidden bg-background p-4">
    <Button variant="ghost" size="icon" aria-label="Close slideshow" className="absolute right-3 top-3" onClick={onClose}><X /></Button>
    <h2 className="w-full shrink-0 break-words px-10 text-center font-display text-xl">{title}</h2>
    {s && <figure key={slideKey} className="step-enter flex min-h-0 w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3" onLoadCapture={() => setLoaded(slideKey)} onErrorCapture={() => { setPlaying(false); }}>
      {s.panel ? <div className="max-h-[58dvh] max-w-full overflow-hidden rounded-lg shadow-glow" style={{ aspectRatio: String(s.aspect ?? .75), width: `min(100%, ${58 * (s.aspect ?? .75)}dvh)` }}><PanelCanvas panel={s.panel} url={s.url} /></div> : <img src={s.url} alt={s.caption || `Slide ${at + 1}`} className="min-h-0 max-h-[58dvh] w-full rounded-lg object-contain shadow-glow" />}
      {!s.panel && s.caption && <figcaption className="max-h-[15dvh] max-w-xl overflow-y-auto text-center font-display text-lg">{s.caption}</figcaption>}
    </figure>}
    <div className="flex shrink-0 items-center gap-3">
      <Button variant="outline" size="icon" aria-label="Previous" disabled={at === 0} onClick={() => move(-1)}><ArrowLeft /></Button>
      <Button variant="secondary" disabled={!slides.length} onClick={() => { if (!playing && at === slides.length - 1) setAt(0); setPlaying(p => !p); }}>{playing ? <Pause /> : <Play />}{playing ? "Pause" : "Play"}</Button>
      <Button variant="outline" size="icon" aria-label="Next" disabled={at >= slides.length - 1} onClick={() => move(1)}><ArrowRight /></Button>
    </div>
    <p role="status" className="shrink-0 text-sm text-muted-foreground">{slides.length ? at + 1 : 0} of {slides.length}</p>
  </div>;
}
