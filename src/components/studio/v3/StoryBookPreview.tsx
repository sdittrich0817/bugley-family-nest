import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Pencil, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { speak } from "../Sidekick";
import { cn } from "@/lib/utils";
import type { StoryLayout } from "@/lib/story-presentation";

type Page = { id: string; text: string; image: string | null; chapter?: string | undefined; description?: string | undefined; layout?: StoryLayout | undefined };
export function StoryPageCanvas({ page, url, layout }: { page: Page; url?: string | undefined; layout?: StoryLayout | undefined }) {
  const chosen = layout ?? page.layout ?? "picture-top";
  return <article className={cn("min-w-0 space-y-4", chosen === "picture-side" && "sm:grid sm:grid-cols-2 sm:items-start sm:gap-6 sm:space-y-0")}>
    <div className={cn(chosen === "small-picture" && "mx-auto w-1/3 min-w-24")}>
      {url ? <img src={url} alt={page.description || "Page illustration"} className="max-h-96 w-full object-contain" /> : <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground"><BookOpen className="size-12" /></div>}
    </div>
    <div className="min-w-0 space-y-3">{page.chapter && <h3 className="break-words text-xl">{page.chapter}</h3>}<p className="whitespace-pre-wrap break-words text-lg leading-relaxed">{page.text}</p></div>
  </article>;
}

export function StoryBookPreview({ title, author, cover, pages, urls, onClose, onEdit }: { title: string; author: string; cover?: string | undefined; pages: Page[]; urls: Record<string, string>; onClose: () => void; onEdit?: ((index: number) => void) | undefined }) {
  const [at, setAt] = useState(-2);
  const page = pages[at];
  const words = at < 0 ? `${title}. By ${author}.` : page ? `${page.chapter ? page.chapter + ". " : ""}${page.text}` : "The End";
  useEffect(() => { window.speechSynthesis?.cancel(); return () => window.speechSynthesis?.cancel(); }, [at]);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent aria-describedby={undefined} className="max-h-[90dvh] max-w-3xl overflow-y-auto">
    <DialogTitle className="break-words pr-8">{title}</DialogTitle>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-muted-foreground">{at === -2 ? "Cover" : at === -1 ? "Title page" : page ? `Page ${at + 1} of ${pages.length}` : "The End"}</span><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Read this book page aloud" title="Read aloud" onClick={() => speak(words)}><Volume2 /></Button>{page && onEdit && <Button variant="outline" onClick={() => { onEdit(at); onClose(); }}><Pencil />Edit this page</Button>}</div></div>
    <div key={at} className="step-enter min-h-64 border-y border-border py-6">
      {at === -2 ? <div className="space-y-4">{cover ? <img src={cover} alt="Book cover" className="max-h-96 w-full object-contain" /> : <BookOpen className="mx-auto size-24 text-primary" />}<h2 className="break-words text-center text-3xl">{title}</h2></div> : at === -1 ? <div className="flex min-h-64 flex-col items-center justify-center gap-5 text-center"><h2 className="break-words text-3xl">{title}</h2><p className="break-words text-lg">Written by {author}</p></div> : page ? <StoryPageCanvas page={page} url={page.image ? urls[page.image] : undefined} /> : <h2 className="py-16 text-center text-3xl">The End ✦</h2>}
    </div>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" size="icon" aria-label="Previous book page" disabled={at === -2} onClick={() => setAt(at - 1)}><ArrowLeft /></Button><Button variant="ghost" onClick={onClose}>Back to my story</Button><Button variant="outline" size="icon" aria-label="Next book page" disabled={at === pages.length} onClick={() => setAt(at + 1)}><ArrowRight /></Button></div>
  </DialogContent></Dialog>;
}