import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { kidFamilyOptions as familyOptions, restoreStudioPlayer } from "@/lib/kid-family";
import { setKidZoneLocked } from "@/lib/kid-zone";
import { kidPlanOptions as billingOptions } from '@/lib/kid-family';
import { getStripeEnvironment } from "@/lib/stripe";
import { ArcadeHome } from "@/components/games/arcade/ArcadeHome";
import { GameBuilder } from "@/components/games/GameBuilder";
import { MyGames } from "@/components/games/MyGames";
import { z } from "zod";
import { ARCADE_GAMES, type ArcadeId } from "@/lib/arcade";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_kid/kids_/studio_/games")({
  head: () => ({ meta: [
    { title: "Arcade · Bugley’s Studio" }, { name: "description", content: "Find twins in Memory Meadow, dive into Ocean Quest, draw doodles and discover playful AI-learning games in Bugley’s Arcade." },
    { property: "og:title", content: "Arcade · Bugley’s Studio" }, { property: "og:description", content: "Teach Bugley the little details in Memory Meadow, solve Mystery Manor and explore playful AI adventures." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  validateSearch: z.object({ game: z.string().uuid().optional(), play: z.enum(ARCADE_GAMES.map((g) => g.id) as [ArcadeId, ...ArcadeId[]]).optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: GamesPage,
});

function GamesPage() {
  const { data } = useSuspenseQuery(familyOptions);
  const navigate = useNavigate();
  const [childId, setChildId] = useState<string | null>(null);
  const [entryError,setEntryError] = useState('');
  const search = Route.useSearch();
  const [editing, setEditing] = useState<string | null | undefined>(search.game);
  useEffect(() => {
    setKidZoneLocked(true);
    let active=true;
    void restoreStudioPlayer(data.children).then(id=>{
      if(!active)return;
      if(!id)void navigate({to:'/kids',replace:true});else setChildId(id);
    }).catch(()=>{if(active)setEntryError('Couldn’t reopen Games. Refresh to try again.');});
    return ()=>{active=false;};
  }, [data.children, navigate]);
  const { data: billing } = useQuery(billingOptions(getStripeEnvironment()));
  useEffect(() => { if (billing && !billing.active) void navigate({ to: "/kids", replace: true }); }, [billing, navigate]);
  const child = data.children.find((c) => c.id === childId);
  if (!child) return <p className="p-6" role={entryError?'alert':'status'}>{entryError||'Opening Games…'}</p>;
  return <div className={cn("min-h-screen bg-background text-foreground", `skin-${child.age_band}`)}>
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3"><Link to="/kids/studio" className="flex items-center gap-2 rounded-full px-3 py-2 font-semibold hover:bg-muted"><ArrowLeft className="size-5" />Studio</Link><span className="font-display text-lg">Game Studio</span></div></header>
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">{editing !== undefined ? <GameBuilder key={editing ?? "new"} child={child as any} gameId={editing} onClose={() => { setEditing(undefined); void navigate({ to: "/kids/studio/games", search: {}, replace: true }); }} /> : <ArcadeHome initial={search.play} child={child as any} family={data.children as any} myGames={<MyGames childId={child.id} onEdit={setEditing} />} onCreate={() => setEditing(null)} />}</main>
  </div>;
}
