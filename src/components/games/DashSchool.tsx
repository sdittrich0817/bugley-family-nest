import { useState } from 'react';
import { ArrowUp, Check, Clock, Play, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { DASH_LESSONS, type DashAction, type DashExample } from '@/lib/dash-learning';
import { speak } from '@/components/studio/Sidekick';
import candy from '@/assets/games/dash-candy.jpg';
export function DashSchool({ stage, onReady }: { stage: NonNullable<React.ComponentProps<typeof Bugley>['stage']>; onReady: (examples: DashExample[]) => void }) {
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState<DashAction | null>(null);
  const lesson = DASH_LESSONS[index];
  if (!lesson) return null;
  const correct = answer === lesson.action;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl">Teach me to dash!</h2><span className="font-bold">Example {index + 1}/4</span></div>
    <div className="dash-school-world"><img src={candy} width={1024} height={768} alt="Candy hills and glowing paths" className="size-full object-cover" /><div className="dash-school-path" /><Bugley stage={stage} expression="curious" size={120} glow className={lesson.airborne ? 'dash-school-flyer' : 'dash-school-runner'} /><span className={`dash-school-obstacle ${lesson.distance > 200 ? 'dash-school-far' : lesson.distance > 140 ? 'dash-school-middle' : 'dash-school-near'}`} role="img" aria-label="Obstacle">🪨</span><span className="dash-school-sign">{lesson.airborne ? 'Already in the air' : lesson.distance > 200 ? 'Far away' : lesson.distance > 140 ? 'Getting closer' : 'Close enough to jump'}</span></div>
    <div className="flex items-center gap-3"><Bugley stage={stage} expression={correct ? 'celebrating' : 'thinking'} size={100} className="shrink-0" /><p className="text-lg font-bold" aria-live="polite">{answer === null ? lesson.question : correct ? `Yes! ${lesson.reason}` : `Let’s look again. ${lesson.reason}`}</p><Button variant="ghost" size="icon" aria-label="Hear Bugley’s example" onClick={() => speak(answer === null ? lesson.question : lesson.reason)}><Volume2 /></Button></div>
    {correct ? <Button size="lg" className="w-full" onClick={() => { if (index === DASH_LESSONS.length - 1) onReady(DASH_LESSONS.map(e => ({ distance: e.distance, airborne: e.airborne, action: e.action }))); else { setIndex(i => i + 1); setAnswer(null); } }}>{index === 3 ? <Play /> : <Check />}{index === 3 ? 'Let’s test what Bugley learned!' : 'Next example'}</Button> : <div className="grid grid-cols-2 gap-3"><Button size="lg" className="min-h-16 text-lg" onClick={() => setAnswer('jump')}><ArrowUp />Jump</Button><Button size="lg" variant="outline" className="min-h-16 text-lg" onClick={() => setAnswer('wait')}><Clock />Wait</Button></div>}
    <p className="text-center text-sm text-muted-foreground">{index} checked examples in Bugley’s brain</p>
  </div>;
}