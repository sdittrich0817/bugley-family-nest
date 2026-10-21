import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bugley — Figure out AI, together." },
      { name: "description", content: "Bugley helps parents and kids explore AI together, safely. No ads, ever." },
      { property: "og:title", content: "Bugley — Figure out AI, together." },
      { property: "og:description", content: "Bugley helps parents and kids explore AI together, safely. No ads, ever." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Figure out AI, together." />,
});
