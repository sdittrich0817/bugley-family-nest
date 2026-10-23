import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getGame, listMyGames, type LoadedGame } from "@/lib/game-builder.functions";
import { TEMPLATES, type TemplateKey } from "@/lib/game-builder";
import { GamePlayer } from "./engines";

/** Game Builder section on the Game Studio home: my games plus the Family Arcade. */
export function MyGames({ childId, onEdit }: { childId: string; onEdit: (id: string | null) => void }) {
  const { data } = useQuery({ queryKey: ["my-games", childId], queryFn: () => listMyGames({ data: { childId } }) });
  const [playing, setPlaying] = useState<LoadedGame | null>(null);
  async function play(id: string) { try { setPlaying(await getGame({ data: { childId, id } })); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t open that game."); } }
  if (playing) return <section className="rounded-3xl bg-card p-4 shadow-soft"><GamePlayer file={playing.file} urls={playing.urls} title={`${playing.title}${playing.mine ? "" : ` · by ${playing.ownerName}`}`} onClose={() => setPlaying(null)} /></section>;
  const Card = ({ g, mine }: { g: NonNullable<typeof data>["mine"][number]; mine: boolean }) => <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
    <span className="text-3xl" aria-hidden>{TEMPLATES[g.template as TemplateKey]?.emoji ?? "🎮"}</span>
    <span className="min-w-0 flex-1"><span className="block truncate font-display">{g.title}</span><span className="text-xs text-muted-foreground">{mine ? (g.published ? "Shared with family" : "Only you") : `by ${g.nickname}`}</span></span>
    <Button size="sm" onClick={() => void play(g.id)}><Play />Play</Button>{mine && <Button size="sm" variant="outline" onClick={() => onEdit(g.id)}><Pencil />Edit</Button>}
  </li>;
  return <div className="space-y-6">
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl">Game Builder</h2><Button onClick={() => onEdit(null)}><Plus />Make a game</Button></div>
      {data?.mine.length ? <ul className="grid gap-2 sm:grid-cols-2">{data.mine.map((g) => <Card key={g.id} g={g} mine />)}</ul> : <p className="text-muted-foreground">Design your own game. Bugley helps you turn ideas into rules!</p>}
    </section>
    <section className="space-y-3">
      <h2 className="text-2xl">Family Arcade</h2>
      {data?.family.length ? <ul className="grid gap-2 sm:grid-cols-2">{data.family.map((g) => <Card key={g.id} g={g} mine={g.childId === childId} />)}</ul> : <p className="text-muted-foreground">Games your family shares will show up here.</p>}
    </section>
  </div>;
}
