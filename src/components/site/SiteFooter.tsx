import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/brand/Wordmark";
import { Bugley } from "@/components/brand/Bugley";
import { legalNav, mainNav } from "@/lib/nav";

export function SiteFooter() {
  const linkCls = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Wordmark />
          <p className="font-display text-lg text-foreground">Figure out AI, together.</p>
          <Bugley stage="scout" expression="happy" size={64} glow={false} className="mt-2" />
        </div>
        <nav aria-label="Explore" className="flex flex-col gap-3">
          <p className="font-display text-sm text-foreground">Explore</p>
          {mainNav.map((l) => <Link key={l.to} to={l.to} className={linkCls}>{l.label}</Link>)}
        </nav>
        <nav aria-label="More" className="flex flex-col gap-3">
          <p className="font-display text-sm text-foreground">More</p>
          {legalNav.map((l) => <Link key={l.to} to={l.to} className={linkCls}>{l.label}</Link>)}
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>No ads. We never sell your family's data.</p>
          <p>© {new Date().getFullYear()} Bugley</p>
        </div>
      </div>
    </footer>
  );
}
