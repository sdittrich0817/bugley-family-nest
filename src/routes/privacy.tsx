import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — Bugley" },
      { name: "description", content: "How Bugley protects your family's data. No ads, never sold." },
      { property: "og:title", content: "Privacy policy — Bugley" },
      { property: "og:description", content: "How Bugley protects your family's data. No ads, never sold." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Privacy policy" />,
});
