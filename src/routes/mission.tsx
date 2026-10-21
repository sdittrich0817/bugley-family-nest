import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/mission")({
  head: () => ({
    meta: [
      { title: "Our mission — Bugley" },
      { name: "description", content: "Why we built Bugley: helping families figure out AI, together." },
      { property: "og:title", content: "Our mission — Bugley" },
      { property: "og:description", content: "Why we built Bugley: helping families figure out AI, together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Our mission" />,
});
