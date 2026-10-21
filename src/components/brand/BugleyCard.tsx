import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl p-6 sm:p-8 transition-all duration-200", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border border-border shadow-soft",
      interactive:
        "bg-card text-card-foreground border border-border shadow-soft hover:shadow-lift hover:-translate-y-1",
      muted: "bg-muted text-foreground",
      glow: "bg-primary/25 text-foreground border border-primary/50",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BugleyCardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function BugleyCard({ className, variant, ...props }: BugleyCardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}
