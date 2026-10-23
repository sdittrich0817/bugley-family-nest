import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decidePenName, listFamilyBooks } from "@/lib/book.functions";
import { BookReader, bookPageCount } from "@/components/studio/BookBuilder";
import { printMessage } from "@/lib/book";

export function ParentBooks({ kids }: { kids: { id: string; nickname: string }[] }) {
  const qc = useQueryClient();
  const { data: books = [], isLoading } = useQuery({ queryKey: ["family-books"], queryFn: () => listFamilyBooks() });
  const [open, setOpen] = useState<string | null>(null);
  const name = (id: string) => kids.find((k) => k.id === id)?.nickname ?? "Your child";
  const shown = books.find((b) => b.id === open);
  async function decide(childId: string, id: string, approve: boolean) {
    try { await decidePenName({ data: { childId, id, approve } }); toast.success(approve ? "Pen name approved" : "Pen name declined"); await qc.invalidateQueries({ queryKey: ["family-books"] }); }
    catch { toast.error("We couldn’t save that. Try again."); }
  }
  return <section className="rounded-3xl bg-card p-5 shadow-soft sm:p-6">
    <h2 className="text-2xl">Books</h2>
    {isLoading ? <p className="mt-3 text-muted-foreground">Loading…</p> : !books.length ? <p className="mt-3 text-muted-foreground">Books your kids build will show up here, with every chapter.</p> :
      shown ? <div className="mt-4"><BookReader book={shown} nickname={name(shown.childId)} onBack={() => setOpen(null)} /></div> :
      <ul className="mt-4 space-y-3">{books.map((b) => <li key={b.id} className="rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-display text-lg">{b.title}</p><p className="text-sm text-muted-foreground">{name(b.childId)} · {b.data.format === "comic" ? "Comic book" : "Story book"} · {b.chapters.length} chapters · {printMessage(b.data.format, bookPageCount(b))}</p></div>
          <Button size="sm" variant="secondary" onClick={() => setOpen(b.id)}><BookOpen />Read the book</Button>
        </div>
        {b.data.authorStatus === "pending" && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3 text-sm"><span>Pen name request: <strong>{b.data.author}</strong></span><Button size="sm" onClick={() => void decide(b.childId, b.id, true)}><Check />Approve</Button><Button size="sm" variant="outline" onClick={() => void decide(b.childId, b.id, false)}><X />Decline</Button></div>}
      </li>)}</ul>}
  </section>;
}
