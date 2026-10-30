import { Lightbulb, Sparkles, Eye, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { DoodleCanvas } from './DoodleCanvas';
import { DOODLE_EMOJI, DOODLE_TURNS, doodleTarget, type PlayState, type Stroke } from '@/lib/play';
import { cn } from '@/lib/utils';

type Props = { state: PlayState; busy: boolean; disabled: boolean; stage: string; strokes: Stroke[]; onStrokes: (s: Stroke[]) => void; onGuess: () => void };

const MAX_GUESSES = 6;

export function DoodleRound({ state, busy, disabled, stage, strokes, onStrokes, onGuess }: Props) {
  const target = doodleTarget(state.turn), thought = state.doodle, got = state.drawingGuessed === true;
  const used = state.drawGuesses ?? 0, hasInk = strokes.some(s => s.points.length > 1);
  const step = got ? 3 : busy ? 2 : thought ? 3 : 1;
  return <div className="doodle-round space-y-4">
    <ol className="flex items-center justify-center gap-2 text-sm font-bold" aria-label="How to play">
      {[['1', 'You draw'], ['2', 'Bugley looks'], ['3', 'See his brain']].map(([n, l], i) => <li key={n} className={cn('flex items-center gap-2 rounded-full border-2 px-3 py-1', step === i + 1 ? 'border-primary bg-primary/20' : 'border-border text-muted-foreground')}><span className="grid size-6 place-items-center rounded-full bg-card">{n}</span>{l}</li>)}
    </ol>
    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary bg-primary/10 px-4 py-3">
      <div className="flex items-center gap-3"><span className="text-5xl" aria-hidden>{DOODLE_EMOJI[target] ?? '✏️'}</span><div><p className="text-xs font-bold uppercase text-muted-foreground">Secret word · picture {state.turn + 1} of {DOODLE_TURNS}</p><p className="font-display text-2xl capitalize">Draw a {target}</p></div></div>
      <p className="hidden text-right text-sm text-muted-foreground sm:block">Shhh! Bugley can’t see this card.<br />He only sees your drawing.</p>
    </div>
    <div className="grid items-start gap-4 md:grid-cols-[1fr_minmax(0,18rem)]">
      <div className="relative">
        <DoodleCanvas key={state.turn} disabled={disabled || got} onChange={onStrokes} />
        {busy && <div className="doodle-scan pointer-events-none absolute inset-x-0 top-0 mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-lg" aria-hidden><span /></div>}
      </div>
      <aside className="space-y-3 rounded-lg border-2 border-border bg-card p-4" aria-live="polite">
        <div className="flex items-center gap-3"><Bugley stage={stage as never} expression={got ? 'celebrating' : busy ? 'thinking' : thought ? 'curious' : 'happy'} glow size={64} /><p className="font-display text-lg leading-snug">{busy ? 'Looking at your shapes…' : state.feedback ?? 'Draw it, then tap the big button!'}</p></div>
        {thought && !busy && <>
          <div><p className="flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground"><Eye className="size-4" />What I noticed</p><ul className="mt-1 flex flex-wrap gap-1">{thought.noticed.map(n => <li key={n} className="rounded-full bg-sky/20 px-2 py-0.5 text-sm">{n}</li>)}</ul></div>
          <div><p className="flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground"><Brain className="size-4" />Bugley’s brain</p><ul className="mt-1 space-y-1">{thought.guesses.map((g, i) => <li key={g.name + i}><div className="flex justify-between text-sm"><span className="capitalize">{g.name}</span><span className="tabular-nums">{g.pct}%</span></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className={cn('doodle-bar h-full rounded-full', i === 0 ? 'bg-primary' : 'bg-sky')} style={{ width: `${Math.max(4, g.pct)}%` }} /></div></li>)}</ul></div>
          {!got && thought.tip && <p className="flex gap-2 rounded-md bg-play-mint p-2 text-sm"><Lightbulb className="size-4 shrink-0" /><span><strong>Help me out:</strong> {thought.tip} Then tap guess again!</span></p>}
          {got && <p className="rounded-md bg-play-mint p-2 text-sm"><strong>AI secret:</strong> I don’t really “see” like you. I match shapes to things I’ve seen before, and pick the one I’m most sure about.</p>}
        </>}
      </aside>
    </div>
    {!got && <Button size="lg" className="h-14 w-full text-lg" disabled={busy || !hasInk || used >= MAX_GUESSES} onClick={onGuess}><Sparkles />{busy ? 'Looking…' : used >= MAX_GUESSES ? 'All guesses used' : thought ? 'Guess again!' : 'Guess my doodle!'}</Button>}
    {!got && !hasInk && !busy && <p className="text-center text-sm text-muted-foreground">Draw on the white board first.</p>}
  </div>;
}
