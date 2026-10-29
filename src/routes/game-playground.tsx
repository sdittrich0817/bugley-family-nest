import { createFileRoute } from "@tanstack/react-router";
import { Wonderwood } from "@/components/games/wonderwood/Wonderwood";

export const Route = createFileRoute("/game-playground")({
  head: () => ({ meta: [
    { title: "Wonderwood — Bugley’s AI Game Playground" },
    { name: "description", content: "Teach Sprig with examples, check its AI guesses, and save the woodland picnic in a playful illustrated adventure." },
    { property: "og:title", content: "Wonderwood — Bugley’s AI Game Playground" },
    { property: "og:description", content: "An illustrated AI-learning adventure: teach, test, and help a little woodland creature." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Wonderwood,
});