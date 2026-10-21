import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Bugley" },
      { name: "description", content: "Guides and resources for families learning about AI." },
      { property: "og:title", content: "Resources — Bugley" },
      { property: "og:description", content: "Guides and resources for families learning about AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Resources" />,
});
