import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { familyOptions } from "@/lib/family.functions";
import { getActivePlayer, setKidZoneLocked } from "@/lib/kid-zone";
import { billingOptions } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Arcade } from "@/components/games/Arcade";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/kids_/studio_/games")({
  head: () => ({ meta: [
    { title: "Game Studio · Bugley’s Arcade" }, { name: "description", content: "Short, safe games that teach kids how AI works." },
    { property: "og:title", content: "Game Studio · Bugley’s Arcade" }, { property: "og:description", content: "Play Real or Robot?, Robot Chef, Train Bugley and Fact or Fib." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: GamesPage,
});

function GamesPage() {
  const { data } = useSuspenseQuery(familyOptions);
  const navigate = useNavigate();
  const [childId, setChildId] = useState<string | null>(null);
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
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6"><Arcade child={child as any} family={data.children as any} /></main>
  </div>;
}
