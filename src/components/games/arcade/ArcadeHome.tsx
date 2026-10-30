import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Star, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import type { SidekickChild } from '@/components/studio/Sidekick';
import { ARCADE_CATEGORIES, ARCADE_GAMES, FEATURED, markPlayed, recordBest, readProgress, updateProgress, type ArcadeCategory, type ArcadeGame, type ArcadeId } from '@/lib/arcade';
import { playAllowed, type PlayKey } from '@/lib/play';
import { useScrollTopOn } from '@/lib/scroll';
import { cn } from '@/lib/utils';
import { PlayStudio } from '../PlayStudio';
import { CosmicMaze } from './CosmicMaze';
import { MysteryManor } from './MysteryManor';
import { CreatureArt, CreatureLab } from './CreatureLab';
import guessArt from '@/assets/games/guesses.jpg';
import manorArt from '@/assets/games/manor.jpg';
import dashArt from '@/assets/games/dash-candy.jpg';
import sayArt from '@/assets/games/say-see.jpg';
import storyArt from '@/assets/games/story-blanks.jpg';
import doodleArt from '@/assets/games/doodle-duel.jpg';
import mazeArt from '@/assets/games/cosmic-maze.jpg';

const ART: Partial<Record<ArcadeId, string>> = { glow_dash: dashArt, cosmic_maze: mazeArt, mystery_manor: manorArt, bugley_guesses: guessArt, doodle_duel: doodleArt, say_see: sayArt, story_blanks: storyArt };
const Thumb = ({ g }: { g: ArcadeGame }) => g.id === 'creature_lab_v2'
  ? <div className="flex aspect-[4/3] w-full items-center justify-center bg-play-mint"><CreatureArt c={{ body: 'tall', head: 'horns', wings: 'bat', tail: 'dragon', pattern: 'stars', color: '5' }} size={150} className="arcade-bob" /></div>
  : <img src={ART[g.id]} width={1024} height={768} loading="lazy" alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />;

export function ArcadeHome({ child, family, myGames, onCreate }: { child: SidekickChild & { age_band: string }; family: SidekickChild[]; myGames: React.ReactNode; onCreate: () => void }) {
  const band = child.age_band as 'sprouts' | 'explorers' | 'builders';
  const [playing, setPlaying] = useState<ArcadeId | null>(null), [cat, setCat] = useState<ArcadeCategory | 'all'>('all'), [recent, setRecent] = useState<ArcadeId[]>([]);
  useEffect(() => { setRecent(readProgress(child.id).recent); }, [child.id, playing]);
  useScrollTopOn(`${playing}`);
  const games = ARCADE_GAMES.filter((g) => g.engine !== 'play' || playAllowed(g.id as PlayKey, band));
  const open = (id: ArcadeId) => { updateProgress(child.id, (p) => markPlayed(p, id)); setPlaying(id); };
  const back = () => setPlaying(null);
  const current = games.find((g) => g.id === playing);
  if (current?.engine === 'play') return <PlayStudio child={child} family={family} start={current.id as PlayKey} onExit={back} />;
  if (current) return <div className="space-y-4"><div className="flex items-center gap-3"><Button variant="ghost" onClick={back}><ArrowLeft />All games</Button><h1 className="text-3xl">{current.name}</h1></div>
    {current.engine === 'manor' ? <MysteryManor stage={child.bugley_stage} onExit={back} onWin={(n) => updateProgress(child.id, (p) => recordBest(p, 'mystery_manor', n))} /> : current.engine === 'maze' ? <CosmicMaze childId={child.id} band={band} stage={child.bugley_stage} onExit={back} /> : <CreatureLab childId={child.id} band={band} stage={child.bugley_stage} onExit={back} />}
    <p className="text-xs text-muted-foreground">Controls: {current.controls}</p></div>;
  const featured = games.find((g) => g.id === FEATURED) ?? games[0];
  const shown = cat === 'all' ? games : games.filter((g) => g.categories.includes(cat));
  const Card = ({ g }: { g: ArcadeGame }) => <article className="group overflow-hidden rounded-lg border-2 border-border bg-card shadow-soft transition hover:border-primary">
    <button type="button" aria-label={`Play ${g.name}`} onClick={() => open(g.id)} className="block w-full overflow-hidden"><Thumb g={g} /></button>
    <div className="space-y-2 p-3"><h3 className="text-xl">{g.name}</h3><p className="text-sm text-muted-foreground">{g.line}</p><Button className="w-full" onClick={() => open(g.id)}><Play />Play</Button></div>
  </article>;
  return <div className="space-y-8">
    <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-muted-foreground">BUGLEY’S ARCADE</p><h1 className="mt-1 text-4xl">Let’s play!</h1></div><Bugley stage={child.bugley_stage} expression="celebrating" glow size={88} /></div>
    {featured && <section className="relative overflow-hidden rounded-lg border-2 border-primary shadow-soft">
      <img src={ART[featured.id]} width={1536} height={768} alt="" className="aspect-[2/1] w-full object-cover sm:aspect-[5/2]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-background via-background/80 to-transparent p-4 pt-12">
        <div><p className="flex items-center gap-1 text-sm font-bold"><Star className="size-4 fill-primary text-primary" />Featured game</p><h2 className="text-3xl">{featured.name}</h2><p className="text-sm">{featured.line}</p></div>
        <Button size="lg" className="min-h-14 text-lg" onClick={() => open(featured.id)}><Play />Play now</Button>
      </div>
    </section>}
    {recent.length > 0 && <section className="space-y-3"><h2 className="text-2xl">Play again</h2><div className="flex flex-wrap gap-2">{recent.map((id) => { const g = games.find((x) => x.id === id); return g && <Button key={id} variant="outline" size="lg" onClick={() => open(id)}><Play />{g.name}</Button>; })}</div></section>}
    <section className="space-y-3">
      <h2 className="text-2xl">Explore games</h2>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={cat === 'all' ? 'primary' : 'outline'} onClick={() => setCat('all')}>All</Button>{ARCADE_CATEGORIES.map((c) => <Button key={c.key} size="sm" variant={cat === c.key ? 'primary' : 'outline'} onClick={() => setCat(c.key)}>{c.label}</Button>)}</div>
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3')}>{shown.map((g) => <Card key={g.id} g={g} />)}</div>
    </section>
    <section className="space-y-3"><h2 className="text-2xl">My games</h2>{myGames}</section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4"><p>Got your own game idea? Build it with Bugley.</p><Button variant="outline" onClick={onCreate}><Wand2 />Make a game</Button></section>
  </div>;
}
