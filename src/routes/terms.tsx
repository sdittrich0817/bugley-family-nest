import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Bugley" },
      { name: "description", content: "The terms for using Bugley." },
      { property: "og:title", content: "Terms — Bugley" },
      { property: "og:description", content: "The terms for using Bugley." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Terms" />,
});
