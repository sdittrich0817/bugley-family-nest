import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listFamilyGamesForParent } from "@/lib/game-builder.functions";
import { TEMPLATES } from "@/lib/game-builder";
import { GamePlayer } from "@/components/games/engines";
import { getParentDashShelf } from '@/lib/play-extra.functions';
import { GlowDash } from '@/components/games/GlowDash';
import { STARTER_STICKERS } from '@/lib/stickers';

export function ParentGames() {
  const { data: games = [], isLoading } = useQuery({ queryKey: ["family-games-parent"], queryFn: () => listFamilyGamesForParent() });
  const {data:remixes=[]}=useQuery({queryKey:['parent-dash-remixes'],queryFn:()=>getParentDashShelf()});
  const [dashId,setDashId]=useState<string|null>(null),[dashDone,setDashDone]=useState(false);
  const dash=remixes.find(r=>r.id===dashId);
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
    {!!remixes.length&&<div className="mt-6 space-y-3"><h3 className="text-xl">Family Arcade · Glow Dash remixes</h3>{dash?<><h4>{dash.title}</h4>{dashDone?<p>Great run!</p>:<GlowDash config={dash.config} heroUrl={dash.heroUrl} stage="scout" stickers={STARTER_STICKERS} onEnd={()=>setDashDone(true)}/>}<Button variant="outline" onClick={()=>setDashId(null)}>Back to remixes</Button></>:<ul className="space-y-2">{remixes.map(r=><li key={r.id} className="flex items-center gap-3 border-b border-border py-3"><span className="flex-1 font-display">{r.title}</span><Button onClick={()=>{setDashId(r.id);setDashDone(false);}}><Play/>Play</Button></li>)}</ul>}</div>}
  </section>;
}
