import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Wraps an image or icon with a soft yellow glow behind it. */
export function Glow({
  children,
  className,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const inset = size === "sm" ? "-inset-3" : size === "lg" ? "-inset-12" : "-inset-6";
  return (
    <div className={cn("relative isolate inline-flex", className)}>
      <div aria-hidden className={cn("glow-blob absolute -z-10 rounded-full", inset)} />
      {children}
    </div>
  );
}
