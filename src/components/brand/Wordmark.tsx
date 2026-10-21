import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Bugley home"
      className={cn("inline-flex items-center gap-2 font-display text-2xl text-foreground", className)}
    >
      <span aria-hidden className="relative inline-flex h-8 w-8 items-center justify-center">
        <span className="glow-blob absolute -inset-1 rounded-full" />
        <span className="relative h-4 w-4 rounded-full bg-primary ring-4 ring-primary/40" />
      </span>
      Bugley
    </Link>
  );
}
