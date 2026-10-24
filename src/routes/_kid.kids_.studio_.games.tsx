import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { kidFamilyOptions as familyOptions } from "@/lib/kid-family";
import { getActivePlayer, setKidZoneLocked } from "@/lib/kid-zone";
import { kidPlanOptions as billingOptions } from '@/lib/kid-family';
import { getStripeEnvironment } from "@/lib/stripe";
import { PlayStudio } from "@/components/games/PlayStudio";
import { GameBuilder } from "@/components/games/GameBuilder";
import { MyGames } from "@/components/games/MyGames";
import { z } from "zod";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_kid/kids_/studio_/games")({
  head: () => ({ meta: [
    { title: "PLAY · Bugley’s Studio" }, { name: "description", content: "Seven joyful family games: creatures, doodles, mysteries, guessing and Glow Dash remixes with Bugley." },
    { property: "og:title", content: "PLAY · Bugley’s Studio" }, { property: "og:description", content: "Play seven safe games, solve Mystery Manor, and share Glow Dash remixes with your family." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  validateSearch: z.object({ game: z.string().uuid().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: GamesPage,
});

function GamesPage() {
  const { data } = useSuspenseQuery(familyOptions);
  const navigate = useNavigate();
  const [childId, setChildId] = useState<string | null>(null);
  const search = Route.useSearch();
  const [editing, setEditing] = useState<string | null | undefined>(search.game);
  useEffect(() => {
    setKidZoneLocked(true);
    const id = getActivePlayer();
    if (!id || !data.children.some((c) => c.id === id)) void navigate({ to: "/kids", replace: true });
    else setChildId(id);
  }, [data.children, navigate]);
  const { data: billing } = useQuery(billingOptions(getStripeEnvironment()));
  useEffect(() => { if (billing && !billing.active) void navigate({ to: "/kids", replace: true }); }, [billing, navigate]);
  const child = data.children.find((c) => c.id === childId);
  if (!child) return null;
  return <div className={cn("min-h-screen bg-background text-foreground", `skin-${child.age_band}`)}>
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3"><Link to="/kids/studio" className="flex items-center gap-2 rounded-full px-3 py-2 font-semibold hover:bg-muted"><ArrowLeft className="size-5" />Studio</Link><span className="font-display text-lg">Game Studio</span></div></header>
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">{editing !== undefined ? <GameBuilder key={editing ?? "new"} child={child as any} gameId={editing} onClose={() => { setEditing(undefined); void navigate({ to: "/kids/studio/games", search: {}, replace: true }); }} /> : <PlayStudio child={child as any} family={data.children as any} builder={<MyGames childId={child.id} onEdit={setEditing} />} />}</main>
  </div>;
}
