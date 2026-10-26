import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Full-screen digital slideshow of a finished creation: cover, then every panel or page. */
export function ComicSlideshow({ title, cover, images, captions, onClose }: { title: string; cover?: string | undefined; images: string[]; captions: string[]; onClose: () => void }) {
  const slides = [...(cover ? [{ url: cover, caption: title }] : []), ...images.map((url, i) => ({ url, caption: captions[i] ?? "" }))];
  const [at, setAt] = useState(0); const [playing, setPlaying] = useState(true);
  useEffect(() => { if (!playing) return; const t = setInterval(() => setAt(a => (a + 1) % slides.length), 3500); return () => clearInterval(t); }, [playing, slides.length]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") setAt(a => (a + 1) % slides.length); if (e.key === "ArrowLeft") setAt(a => (a - 1 + slides.length) % slides.length); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [slides.length, onClose]);
  const s = slides[at];
  return <div role="dialog" aria-label={`${title} slideshow`} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-4">
    <Button variant="ghost" size="icon" aria-label="Close slideshow" className="absolute right-3 top-3" onClick={onClose}><X /></Button>
    <h2 className="font-display text-2xl">{title}</h2>
    {s && <figure key={at} className="step-enter flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3">
      <img src={s.url} alt={s.caption || `Slide ${at + 1}`} className="max-h-[65vh] w-full rounded-2xl object-contain shadow-glow" />
      {s.caption && <figcaption className="max-w-xl text-center font-display text-xl">{s.caption}</figcaption>}
    </figure>}
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" aria-label="Previous" onClick={() => setAt(a => (a - 1 + slides.length) % slides.length)}><ArrowLeft /></Button>
      <Button variant="secondary" onClick={() => setPlaying(p => !p)}>{playing ? <Pause /> : <Play />}{playing ? "Pause" : "Play"}</Button>
      <Button variant="outline" size="icon" aria-label="Next" onClick={() => setAt(a => (a + 1) % slides.length)}><ArrowRight /></Button>
    </div>
    <p className="text-sm text-muted-foreground">{at + 1} of {slides.length}</p>
  </div>;
}
