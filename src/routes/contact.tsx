import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/site/PlaceholderPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bugley" },
      { name: "description", content: "Get in touch with the Bugley team." },
      { property: "og:title", content: "Contact — Bugley" },
      { property: "og:description", content: "Get in touch with the Bugley team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlaceholderPage title="Contact" />,
});
