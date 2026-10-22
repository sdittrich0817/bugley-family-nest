import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="Bugley home" className={className}>
      <Logo variant="hop" />
    </Link>
  );
}
