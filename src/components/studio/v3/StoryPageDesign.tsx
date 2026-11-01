import { useState } from "react";
import { BookOpen, Check, Columns2, Image, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoryPageCanvas } from "./StoryBookPreview";
import { suggestStoryLayout, type StoryLayout } from "@/lib/story-presentation";

const layouts = [
  { id: "picture-top", label: "Big picture, words below", icon: Image },
  { id: "picture-side", label: "Picture beside words", icon: Columns2 },
  { id: "small-picture", label: "More words, small picture", icon: BookOpen },
] as const;
export function StoryPageDesign({ page, words, url, busy, onSave }: { page: { id: string; text: string; image: string | null; chapter?: string | undefined; layout?: StoryLayout | undefined }; words: string; url?: string | undefined; busy: boolean; onSave: (layout: StoryLayout, chapter: string) => void }) {
  const [chosen, setChosen] = useState<StoryLayout>(page.layout ?? "picture-top");
  const [chapter, setChapter] = useState(page.chapter ?? "");
  const suggestion = suggestStoryLayout(words);
  return <details className="border-y border-border py-3">
    <summary className="cursor-pointer font-display text-lg"><LayoutTemplate className="mr-2 inline size-5" />Design this page</summary>
    <div className="mt-4 space-y-4">
      <p className="font-semibold">Bugley’s pick: {layouts.find(l => l.id === suggestion)?.label}. Your call!</p>
      <div className="grid gap-2 sm:grid-cols-3">{layouts.map(({ id, label, icon: Icon }) => <Button key={id} variant={chosen === id ? "secondary" : "outline"} aria-pressed={chosen === id} disabled={busy} className="h-auto min-h-16 whitespace-normal py-3" onClick={() => setChosen(id)}><Icon className="shrink-0" />{label}</Button>)}</div>
      <label className="block space-y-2 font-semibold"><span>Chapter heading (optional)</span><Input aria-label="Chapter heading" value={chapter} maxLength={120} disabled={busy} onChange={e => setChapter(e.target.value)} placeholder="A mysterious beginning" /></label>
      <div className="border-y border-border py-4"><StoryPageCanvas page={{ ...page, text: words, chapter }} url={url} layout={chosen} /></div>
      <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => onSave(chosen, chapter)}><Check />Use this layout · Free</Button><Button variant="ghost" disabled={busy} onClick={() => { setChosen(page.layout ?? "picture-top"); setChapter(page.chapter ?? ""); }}>Keep my current page</Button></div>
    </div>
  </details>;
}