import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/co-ops")({
  head: () => ({
    meta: [
      { title: "For co-ops — Bugley" },
      { name: "description", content: "Bugley for homeschool co-ops and learning groups." },
      { property: "og:title", content: "For co-ops — Bugley" },
      { property: "og:description", content: "Bugley for homeschool co-ops and learning groups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="For co-ops" />,
});
