import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { ARTICLES } from "@/lib/articles";

const TITLE = "Resources for parents — Bugley";
const DESC = "Short, honest guides to help parents understand AI and talk about it with their kids.";

export const Route = createFileRoute("/resources/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: Resources,
});

function Resources() {
  return (
    <section className="container-page py-14 sm:py-20">
      <SectionHeader
        as="h1"
        eyebrow="Resources"
        title="Guides for curious parents"
        description="Short reads to help your family figure out AI, together."
      />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a) => (
          <Link
            key={a.slug}
            to="/resources/$slug"
            params={{ slug: a.slug }}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <img src={a.image} alt={a.imageAlt} loading="lazy" className="aspect-[16/10] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <Badge variant="secondary" className="self-start">{a.category}</Badge>
              <h2 className="text-xl text-foreground group-hover:underline">{a.title}</h2>
              <p className="flex-1 text-muted-foreground">{a.summary}</p>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden /> {a.readMinutes} min read
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
