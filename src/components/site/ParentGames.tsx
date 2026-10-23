import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listFamilyGamesForParent } from "@/lib/game-builder.functions";
import { TEMPLATES } from "@/lib/game-builder";
import { GamePlayer } from "@/components/games/engines";

export function ParentGames() {
  const { data: games = [], isLoading } = useQuery({ queryKey: ["family-games-parent"], queryFn: () => listFamilyGamesForParent() });
  const [open, setOpen] = useState<string | null>(null);
  const shown = games.find((g) => g.id === open);
  return <section className="rounded-3xl bg-card p-5 shadow-soft sm:p-6">
    <h2 className="text-2xl">Games your kids made</h2>
    {isLoading ? <p className="mt-3 text-muted-foreground">Loading…</p> : !games.length ? <p className="mt-3 text-muted-foreground">Games your kids design in the Game Builder will show up here.</p>
      : shown ? <div className="mt-4"><GamePlayer file={shown.file} urls={shown.urls} title={shown.title} onClose={() => setOpen(null)} /></div>
      : <ul className="mt-4 space-y-2">{games.map((g) => <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3">
        <span className="text-2xl" aria-hidden>{TEMPLATES[g.file.template].emoji}</span>
        <span className="min-w-0 flex-1"><span className="block font-display">{g.title}</span><span className="text-sm text-muted-foreground">{g.ownerName} · {TEMPLATES[g.file.template].name} · {g.file.published ? "Shared in the Family Arcade" : "Private"}</span></span>
        <Button size="sm" variant="secondary" onClick={() => setOpen(g.id)}><Play />Play</Button>
      </li>)}</ul>}
  </section>;
}
