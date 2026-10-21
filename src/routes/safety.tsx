import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety — Bugley" },
      { name: "description", content: "How Bugley keeps kids safe while they learn about AI." },
      { property: "og:title", content: "Safety — Bugley" },
      { property: "og:description", content: "How Bugley keeps kids safe while they learn about AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Safety" />,
});
