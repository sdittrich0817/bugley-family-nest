import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Bugley" },
      { name: "description", content: "See how Bugley helps families explore AI together." },
      { property: "og:title", content: "How it works — Bugley" },
      { property: "og:description", content: "See how Bugley helps families explore AI together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="How it works" />,
});
