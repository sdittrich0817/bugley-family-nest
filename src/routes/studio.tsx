import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Bugley's Studio — Bugley" },
      { name: "description", content: "Bugley's Studio: a creative space for kids and parents to explore AI." },
      { property: "og:title", content: "Bugley's Studio — Bugley" },
      { property: "og:description", content: "Bugley's Studio: a creative space for kids and parents to explore AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Bugley's Studio" />,
});
