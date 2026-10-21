import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getArticle } from "@/lib/articles";
import { useWaitlist } from "@/components/site/WaitlistModal";

export const Route = createFileRoute("/resources/$slug")({
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ params, loaderData }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: "Article not found — Bugley" }, { name: "robots", content: "noindex" }] };
    const title = `${a.title} — Bugley`;
    return {
      meta: [
        { title },
        { name: "description", content: a.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: a.summary },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/resources/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/resources/${params.slug}` }],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="text-3xl text-foreground">We couldn't find that article.</h1>
      <Link to="/resources" className="mt-4 inline-block underline">Back to resources</Link>
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article: a } = Route.useLoaderData();
  const { open } = useWaitlist();
  return (
    <article className="container-page max-w-3xl py-10 sm:py-16">
      <Link to="/resources" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All resources
      </Link>
      <header className="mt-6 flex flex-col gap-4">
        <Badge variant="secondary" className="self-start">{a.category}</Badge>
        <h1 className="text-3xl text-foreground sm:text-5xl">{a.title}</h1>
        <p className="text-lg text-muted-foreground">{a.summary}</p>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" aria-hidden /> {a.readMinutes} min read
        </span>
      </header>
      <img src={a.image} alt={a.imageAlt} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
      <div className="mt-8 flex flex-col gap-5 text-lg leading-relaxed text-foreground">
        {a.body.map((b, i) =>
          b.type === "h2" ? (
            <h2 key={i} className="mt-4 text-2xl">{b.text}</h2>
          ) : b.type === "list" ? (
            <ul key={i} className="ml-6 list-disc space-y-2">
              {b.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          ) : (
            <p key={i}>{b.text}</p>
          ),
        )}
      </div>
      <div className="mt-12 rounded-2xl bg-muted p-6 text-center sm:p-8">
        <h2 className="text-2xl text-foreground">Ready to figure out AI, together?</h2>
        <Button className="mt-4" onClick={() => open("article")}>Start free</Button>
      </div>
    </article>
  );
}
