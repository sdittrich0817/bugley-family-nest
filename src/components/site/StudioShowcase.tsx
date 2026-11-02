// Marketing previews of Bugley's Studio that reuse the real game list and cover art.
import { ARCADE_GAMES } from "@/lib/arcade";
import { ARCADE_ART } from "@/lib/arcade-art";
import { Badge } from "@/components/ui/badge";
import { Bugley } from "@/components/brand/Bugley";
import panelA from "@/assets/illustrations/comic-genre-0.jpg";
import panelB from "@/assets/illustrations/comic-genre-1.jpg";
import panelC from "@/assets/illustrations/comic-genre-2.jpg";
import storyArt from "@/assets/illustrations/studio-story.jpg";

const LEARNS: Record<string, string> = {
  memory_meadow: "How AI learns from examples",
  ocean_quest: "When to trust a machine",
  dragon_catch: "Spotting AI mistakes",
  creature_lab_v2: "Teaching AI your choices",
  cosmic_maze: "If-then rules, like code",
  mystery_manor: "Checking a confident robot",
  bugley_guesses: "How clues narrow a guess",
  doodle_duel: "How AI recognizes pictures",
  story_blanks: "How AI predicts words",
};

export function GameGallery({ limit }: { limit?: number }) {
  const games = limit ? ARCADE_GAMES.slice(0, limit) : ARCADE_GAMES;
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((g) => (
        <li key={g.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {ARCADE_ART[g.id] && (
            <img src={ARCADE_ART[g.id]} alt={`${g.name} game cover`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
          )}
          <div className="flex flex-col gap-2 p-4">
            <p className="font-display text-lg text-foreground">{g.name}</p>
            <p className="text-sm text-muted-foreground">{g.line}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {LEARNS[g.id] && <Badge variant="leaf">Learns: {LEARNS[g.id]}</Badge>}
              <Badge variant="outline">{g.controls}</Badge>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Bubble({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`absolute max-w-[75%] rounded-2xl border-2 border-foreground bg-card px-2 py-1 font-display text-xs leading-tight text-foreground shadow-soft ${className}`}>
      {children}
    </span>
  );
}

export function ComicAndStoryLook() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <figure className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-2">
          <div className="relative col-span-2 overflow-hidden rounded-lg border-2 border-foreground">
            <img src={panelA} alt="Comic panel: the hero sets out" loading="lazy" className="aspect-[2/1] w-full object-cover" />
            <Bubble className="left-2 top-2">“Today I find the lost lantern!”</Bubble>
          </div>
          <div className="relative overflow-hidden rounded-lg border-2 border-foreground">
            <img src={panelB} alt="Comic panel: a surprise appears" loading="lazy" className="aspect-square w-full object-cover" />
            <Bubble className="bottom-2 left-2">“Wait… who's there?”</Bubble>
          </div>
          <div className="relative overflow-hidden rounded-lg border-2 border-foreground">
            <img src={panelC} alt="Comic panel: the new friend" loading="lazy" className="aspect-square w-full object-cover" />
            <Bubble className="right-2 top-2">“A friend!”</Bubble>
          </div>
        </div>
        <figcaption className="mt-4">
          <Badge variant="sky">Comic</Badge>
          <p className="mt-2 font-display text-lg text-foreground">Kids choose the panels, Bugley places the bubbles</p>
          <p className="text-sm text-muted-foreground">
            Their exact words go in the speech bubbles. Layouts are automatic, characters stay looking the same panel to
            panel, and issues continue like a real series.
          </p>
        </figcaption>
      </figure>

      <figure className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="overflow-hidden rounded-lg border border-border">
          <img src={storyArt} alt="Story page picture: a child reading to a firefly by a tent" loading="lazy" className="aspect-[4/3] w-full object-cover" />
          <p className="bg-muted p-4 font-display text-base text-foreground">
            Mia unzipped the tent. The lake was so quiet she could hear the firefly hum.
          </p>
        </div>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
          <Bugley stage="scout" expression="thinking" glow size={36} title="Bugley's writing tip" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Bugley's writing tip:</span> “Hum” is a great sound word! What could Mia
            <em> see</em> on the water?
          </p>
        </div>
        <figcaption className="mt-4">
          <Badge variant="sky">Illustrated story</Badge>
          <p className="mt-2 font-display text-lg text-foreground">One picture, their words, a gentle coach</p>
          <p className="text-sm text-muted-foreground">
            Each page pairs a picture with the child's own sentences. Bugley offers writing tips, never rewrites — your
            child decides what to change.
          </p>
        </figcaption>
      </figure>
    </div>
  );
}
