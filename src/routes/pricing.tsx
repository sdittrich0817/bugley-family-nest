import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Bugley" },
      { name: "description", content: "Simple, family-friendly pricing for Bugley." },
      { property: "og:title", content: "Pricing — Bugley" },
      { property: "og:description", content: "Simple, family-friendly pricing for Bugley." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Pricing" />,
});
