import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { kidFamilyOptions as familyOptions, kidPlanOptions as billingOptions } from "@/lib/kid-family";
import { getActivePlayer } from "@/lib/kid-zone";
import { getStripeEnvironment } from "@/lib/stripe";
import { ComicJourney } from "@/components/studio/v3/ComicJourney";
import type { SidekickChild } from "@/components/studio/Sidekick";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_kid/kids_/studio_/v3")({
  head: () => ({ meta: [
    { title: "Create with Your Characters · Bugley Kids" }, { name: "description", content: "Invent your own character, then create a picture, comic or story with Bugley’s optional help." },
    { property: "og:title", content: "Create with Your Characters · Bugley Kids" }, { property: "og:description", content: "Your characters, your words, your pictures and adventures." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  validateSearch: z.object({ project: z.string().uuid().optional(), draft: z.string().uuid().optional(), character: z.string().uuid().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: V3Page,
});

function V3Page() {
  const { data } = useSuspenseQuery(familyOptions);
  const navigate = useNavigate();
  const { project, draft, character } = Route.useSearch();
  const [childId, setChildId] = useState<string | null>(null);
  useEffect(() => {
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
      <ComicJourney child={child as SidekickChild} projectId={project} draftId={draft} characterId={character}
        onProject={id => void navigate({ to: "/kids/studio/v3", search: { project: id }, replace: true })}
        onDraft={id => void navigate({ to: "/kids/studio/v3", search: { draft: id }, replace: true })}
        onBook={() => void navigate({ to: "/kids/studio" })}
        onExit={() => void navigate({ to: "/kids/studio" })} />
    </div>
  </div>;
}
