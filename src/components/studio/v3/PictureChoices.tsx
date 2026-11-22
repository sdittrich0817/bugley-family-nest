import { useState, type ReactNode } from "react";
import { Check, Heart, Paintbrush, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GLOW_COSTS } from "@/lib/glow";
import { cn } from "@/lib/utils";

// A3.3: the simple screens around a drawn comic panel and the comic cover. These components only show choices and
// ask before anything paid; every drawing still goes through the existing paint/cover server functions and their
// charge-once-with-refund rules. Prices come from the shared GLOW_COSTS, never a new number.
export const PICTURE_GLOW = GLOW_COSTS.picture;

type Band = "sprouts" | "explorers" | "builders";

function CostTag({ free, cost = PICTURE_GLOW }: { free?: boolean | undefined; cost?: number | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-3 py-1 font-display text-sm",
        free ? "border-2 border-foreground/25 bg-secondary text-foreground" : "bg-primary text-primary-foreground",
      )}
    >
      {free ? "FREE" : `${cost} Glow`}
    </span>
  );
}

/** "Change it" opens exactly three choices: fix one thing, draw a new one, or keep this picture. */
export function ChangeChoices({
  band,
  busy,
  onFix,
  onRedraw,
  onKeep,
}: {
  band: Band;
  busy?: boolean | undefined;
  onFix: () => void;
  onRedraw: () => void;
  onKeep: () => void;
}) {
  const big = band === "sprouts";
  const choices: { key: string; icon: ReactNode; title: string; text: string; free?: boolean; on: () => void }[] = [
    {
      key: "fix",
      icon: <Wand2 />,
      title: "Fix one thing",
      text: big ? "Tell Bugley one thing to change." : "Tell Bugley what you’d like to change in this picture.",
      on: onFix,
    },
    {
      key: "redraw",
      icon: <Paintbrush />,
      title: "Draw a new one",
      text: big ? "Bugley tries a whole new picture!" : "Let’s try a new picture for this part of your comic!",
      on: onRedraw,
    },
    {
      key: "keep",
      icon: <Heart />,
      title: "Keep this picture",
      text: big ? "Go back. Nothing changes." : "Go back to your picture. Nothing changes.",
      free: true,
      on: onKeep,
    },
  ];
  return (
    <div role="group" aria-label="How to change this picture" className={cn("grid gap-3", !big && "sm:grid-cols-3")}>
      {choices.map((c) => (
        <button
          key={c.key}
          type="button"
          disabled={busy}
          onClick={c.on}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border-4 bg-card p-4 text-left shadow-soft transition hover:-translate-y-0.5 disabled:opacity-50",
            c.free ? "border-border" : "border-primary",
            big ? "min-h-24 items-center" : "sm:flex-col",
            band === "builders" && "border-2 p-3",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-primary/20 [&_svg]:size-6",
              big ? "size-14 [&_svg]:size-8" : "size-11",
            )}
          >
            {c.icon}
          </span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className={cn("flex flex-wrap items-center gap-2 font-display", big ? "text-2xl" : "text-xl")}>
              {c.title}
              <CostTag free={c.free} />
            </span>
            <span className={cn("block text-muted-foreground", big ? "text-lg" : "text-base")}>{c.text}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Shown before every paid drawing: what Bugley will do, the Glow it costs, and a way to cancel. */
export function GlowConfirm({
  band,
  what,
  have,
  busy,
  ready = true,
  confirmLabel,
  onConfirm,
  onCancel,
  children,
}: {
  band: Band;
  what: ReactNode;
  have?: number | undefined;
  busy?: boolean | undefined;
  /** False while the child still needs to type something (for example the change they want). */
  ready?: boolean | undefined;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const short = have !== undefined && have < PICTURE_GLOW;
  const big = band === "sprouts";
  return (
    <div role="region" aria-label="Before Bugley draws" className="space-y-3 rounded-2xl border-4 border-primary bg-card p-4 shadow-glow">
      {children}
      <div className="space-y-1">
        <p className="font-display text-lg">What Bugley will do</p>
        <p className={big ? "text-lg" : undefined}>{what}</p>
      </div>
      <p className={cn("flex flex-wrap items-center gap-2 font-semibold", big && "text-lg")}>
        <Sparkles className="size-5 shrink-0" aria-hidden />
        This costs {PICTURE_GLOW} Glow.
        {have !== undefined && <span className="font-normal text-muted-foreground">You have {have} Glow.</span>}
      </p>
      {short ? (
        <p role="status" className="font-semibold">
          You need {PICTURE_GLOW} Glow for this. Bugley’s Glow fills up again tomorrow.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">If Bugley can’t finish the picture, you get your Glow back.</p>
      )}
      <div className={cn("flex flex-wrap gap-2", big && "grid grid-cols-1")}>
        <Button
          size={big ? "lg" : "default"}
          className={cn("h-auto min-h-12 whitespace-normal", big && "min-h-16 text-xl")}
          disabled={busy || !ready || short}
          onClick={onConfirm}
        >
          <Paintbrush />
          {confirmLabel} · {PICTURE_GLOW} Glow
        </Button>
        <Button
          size={big ? "lg" : "default"}
          variant="outline"
          className={cn("h-auto min-h-12 whitespace-normal", big && "min-h-16 text-xl")}
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

type CoverOption = { id: string; url: string; image: string; label: string };

/** The last step of a comic: pick one of your own panels (free) or have Bugley paint a new cover (3 Glow). */
export function CoverPicker({
  band,
  panels,
  cover,
  coverUrl,
  have,
  busy,
  onPick,
  onPaint,
  onPublish,
}: {
  band: Band;
  panels: CoverOption[];
  cover?: string | null | undefined;
  coverUrl?: string | undefined;
  have?: number | undefined;
  busy?: boolean | undefined;
  onPick: (id: string) => void;
  onPaint: () => void;
  onPublish: () => void;
}) {
  const [painting, setPainting] = useState(false);
  const big = band === "sprouts";
  const fromPanel = panels.some((p) => p.image === cover);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl">Let’s pick your comic cover!</h2>
      {coverUrl && (
        <figure className="space-y-1 text-center">
          <img
            src={coverUrl}
            alt="Your cover"
            className="mx-auto max-h-64 rounded-xl border-4 border-primary object-contain shadow-glow"
          />
          <figcaption className="font-semibold">
            {fromPanel ? "Your cover is one of your pictures." : "Bugley painted this cover for you."}
          </figcaption>
        </figure>
      )}
      <section aria-label="Use one of my pictures" className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn("font-display", big ? "text-2xl" : "text-xl")}>Use one of my pictures</h3>
          <CostTag free />
        </div>
        <p className="text-muted-foreground">Tap a picture to make it your cover.</p>
        <div className={cn("grid gap-3", big ? "max-w-lg grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
          {panels.map((p) => {
            const chosen = cover === p.image;
            return (
              <button
                key={p.id}
                type="button"
                aria-label={`Use ${p.label} as the cover`}
                aria-pressed={chosen}
                disabled={busy}
                onClick={() => {
                  setPainting(false);
                  if (!chosen) onPick(p.id);
                }}
                className={cn(
                  "relative overflow-hidden rounded-xl border-4 transition",
                  chosen ? "scale-[1.03] border-primary shadow-glow" : "border-transparent hover:border-border",
                )}
              >
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                {chosen && (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-primary py-1 font-display text-sm text-primary-foreground">
                    <Check className="size-4" aria-hidden />
                    Your cover
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      <section aria-label="Paint a new cover" className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn("font-display", big ? "text-2xl" : "text-xl")}>Paint a new cover</h3>
          <CostTag />
        </div>
        {painting ? (
          <GlowConfirm
            band={band}
            have={have}
            busy={busy}
            what="Bugley paints a brand-new cover for your comic with your characters and your story. Your panels stay just as they are."
            confirmLabel="Yes, paint my cover"
            onConfirm={() => {
              setPainting(false);
              onPaint();
            }}
            onCancel={() => setPainting(false)}
          />
        ) : (
          <>
            <p className="text-muted-foreground">Bugley paints a brand-new picture just for the cover.</p>
            <Button
              variant="outline"
              size={big ? "lg" : "default"}
              className={cn("h-auto min-h-12 whitespace-normal", big && "min-h-16 text-xl")}
              disabled={busy}
              onClick={() => setPainting(true)}
            >
              <Paintbrush />
              Paint a new cover
            </Button>
          </>
        )}
      </section>
      {cover ? (
        <Button
          size="lg"
          className={cn("h-auto min-h-14 w-full whitespace-normal text-xl", big && "min-h-16 text-2xl")}
          disabled={busy}
          onClick={onPublish}
        >
          Publish to my shelf! 🎉
        </Button>
      ) : (
        <p role="status" className="text-center font-semibold text-muted-foreground">
          Pick a cover first, then you can publish your comic.
        </p>
      )}
    </div>
  );
}
