import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { kidFamilyOptions as familyOptions, kidPlanOptions as billingOptions } from "@/lib/kid-family";
import { getActivePlayer, setKidZoneLocked } from "@/lib/kid-zone";
import { getStripeEnvironment } from "@/lib/stripe";
import { ComicJourney } from "@/components/studio/v3/ComicJourney";
import type { SidekickChild } from "@/components/studio/Sidekick";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_kid/kids_/studio_/v3")({
  head: () => ({ meta: [
    { title: "Make a Comic · Kid Zone" }, { name: "description", content: "One idea, one adventure, one firefly friend — make a comic with Bugley." },
    { property: "og:title", content: "Make a Comic · Kid Zone" }, { property: "og:description", content: "Make a comic with Bugley, one scene at a time." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  validateSearch: z.object({ project: z.string().uuid().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: V3Page,
});

function V3Page() {
  const { data } = useSuspenseQuery(familyOptions);
  const navigate = useNavigate();
  const { project } = Route.useSearch();
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
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-5">
      <ComicJourney child={child as SidekickChild} projectId={project} onExit={() => void navigate({ to: "/kids/studio" })} />
    </div>
  </div>;
}
