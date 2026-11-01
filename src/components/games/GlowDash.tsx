import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Flag, Star, Brain, Hand, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { createDash } from '@/lib/dash-engine';
import { DASH_STEP, DASH_TICKS, type DashConfig } from '@/lib/play-extra';
import type { Sticker } from '@/lib/stickers';
import candy from '@/assets/games/dash-candy.jpg';
import lava from '@/assets/games/dash-lava.jpg';
import cloud from '@/assets/games/dash-cloud.jpg';
import { DashSchool } from './DashSchool';
import { makeDashBrain, DASH_FINISH_X, type DashExample } from '@/lib/dash-learning';
import { speak } from '@/components/studio/Sidekick';
export const DASH_ART={candy,lava,cloud};
export function GlowDash({config,heroUrl,stage,stickers,onEnd}:{config:DashConfig;heroUrl:string;stage:NonNullable<React.ComponentProps<typeof Bugley>['stage']>;stickers:Sticker[];onEnd:(ticks:number,jumps:number[])=>void}){
 const [examples,setExamples]=useState<DashExample[]>([]),[pilot,setPilot]=useState(true),[thought,setThought]=useState('Waiting for your examples…');
 const brain=useRef<ReturnType<typeof makeDashBrain>>(null),pilotRef=useRef(true);pilotRef.current=pilot;
 const [paused,setPaused]=useState(false),pausedRef=useRef(false);pausedRef.current=paused;
 const [view,setView]=useState({x:100,y:270,tick:0,orbs:0,hits:0,checkpoint:100,shield:0,collected:new Set<number>()});
 const run=useRef<ReturnType<typeof createDash>|null>(null),jumps=useRef<number[]>([]),press=useRef(false),ended=useRef(false),callback=useRef(onEnd);callback.current=onEnd;
 const jump=()=>{press.current=true;};
 useEffect(()=>{
  if(!examples.length)return;
  brain.current=makeDashBrain(examples,config.speed);
  const r=createDash(config);run.current=r;let last=performance.now(),acc=0,frame=0;
  const key=(e:KeyboardEvent)=>{if([' ','ArrowUp','w'].includes(e.key)&&!e.repeat){e.preventDefault();jump();}};window.addEventListener('keydown',key);
  const deadline=Date.now()+180000;
  const checkEnd=()=>{if(!ended.current&&Date.now()>=deadline){ended.current=true;cancelAnimationFrame(frame);callback.current(r.view().tick,jumps.current);}};
  const tick=(t:number)=>{checkEnd();if(pausedRef.current){last=t;acc=0;if(!ended.current)frame=requestAnimationFrame(tick);return;}acc+=Math.min(100,t-last);last=t;while(acc>=DASH_STEP&&!ended.current){const before=r.view(),o=r.obstacles.find(o=>o.x>=before.x-22),distance=o?o.x-before.x:300,air=before.y<298,action=brain.current?.predict(distance,air)??'wait';if(press.current||(pilotRef.current&&action==='jump')){jumps.current.push(before.tick);r.step(true);press.current=false;}else r.step();acc-=DASH_STEP;if(r.view().tick>=DASH_TICKS||r.view().x>=DASH_FINISH_X){ended.current=true;callback.current(r.view().tick,jumps.current);}}const v=r.view(),o=r.obstacles.find(o=>o.x>=v.x-22),d=o?o.x-v.x:300;setThought(v.y<298?'Wait — I’m already in the air.':(brain.current?.predict(d,false)==='jump'?'Jump — this looks like your close-obstacle example!':'Wait — this looks like your far-away example.'));setView({...v,collected:new Set(v.collected)});if(!ended.current)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  const timer=setInterval(checkEnd,250);document.addEventListener('visibilitychange',checkEnd);window.addEventListener('pageshow',checkEnd);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',checkEnd);window.removeEventListener('pageshow',checkEnd);cancelAnimationFrame(frame);window.removeEventListener('keydown',key);r.dispose();};
 },[config,examples]);
 const camera=Math.max(0,view.x-150),object=stickers.find(s=>s.key===config.object);
 function finish(){if(ended.current)return;ended.current=true;callback.current(view.tick,jumps.current);}
 const prevY=useRef(view.y),tilt=Math.max(-18,Math.min(18,(view.y-prevY.current)*3));prevY.current=view.y;
 const pops=[...view.collected];
 if(!examples.length)return <DashSchool stage={stage} onReady={setExamples}/>;
 return <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">Test your training!</h2><span className="font-bold">{pilot?'🧠 Bugley is driving':'🖐 You are driving'}</span></div><div role="img" aria-label={`Running through ${config.chocolate?'chocolate cave':config.theme+' world'}, ${view.orbs} orbs collected`} className="dash-learning-world relative aspect-[2/1] min-h-52 w-full touch-none select-none overflow-hidden rounded-lg border-2 border-border bg-play-mint" onPointerDown={jump}>
  <div className={`absolute inset-0 ${config.chocolate?'dash-chocolate':''}`} style={{backgroundImage:`url(${DASH_ART[config.theme]})`,backgroundSize:'auto 100%',backgroundRepeat:'repeat-x',backgroundPositionX:`${-camera*0.15}px`}}/>
  <svg className="absolute inset-x-0 bottom-0 h-1/2 w-[200%]" viewBox="0 0 1600 200" preserveAspectRatio="none" style={{transform:`translateX(-${(camera*0.35)%800}px)`}} aria-hidden><path d="M0,120 C120,60 220,60 340,110 C460,150 560,50 700,90 C780,110 800,120 800,120 C920,60 1020,60 1140,110 C1260,150 1360,50 1500,90 L1600,120 L1600,200 L0,200Z" fill="var(--dash-hill-far)"/></svg>
  <svg className="absolute inset-x-0 bottom-0 h-[30%] w-[200%]" viewBox="0 0 1600 120" preserveAspectRatio="none" style={{transform:`translateX(-${(camera*0.7)%800}px)`}} aria-hidden><path d="M0,60 C100,30 200,40 300,60 C420,80 520,20 650,45 C720,58 760,62 800,60 C900,30 1000,40 1100,60 C1220,80 1320,20 1450,45 L1600,60 L1600,120 L0,120Z" fill="var(--dash-hill-near)"/></svg>
  {config.time==='night'&&<div className="absolute inset-0 bg-dash-night/60"/>}
  <div className="absolute inset-x-0 top-[86%] bottom-0 border-t-4 border-foreground/30 bg-foreground/10"/>
  <div className="absolute left-3 top-3 z-10 flex gap-3 rounded-lg bg-card/95 px-3 py-2 text-sm font-bold"><span className="flex gap-1"><Star className="size-4 fill-primary text-primary"/>{view.orbs}</span><span><Flag className="inline size-4"/> {Math.floor((view.checkpoint-100)/1800)+1}</span></div>
  {DASH_FINISH_X-camera<850&&<div className="dash-finish-gate" style={{left:`${(DASH_FINISH_X-camera)/8}%`}}>🏁<span>FINISH</span></div>}
  {run.current?.obstacles.map((o,i)=>{const x=o.x-camera,orb=o.orbX-camera;if(x<-100||x>850)return null;return <div key={i}>{!view.collected.has(i)?<svg className="absolute h-[9%] w-[4.5%] overflow-visible" style={{left:`${orb/8}%`,top:'62%'}} viewBox="-10 -10 20 20" aria-hidden><circle r={9} fill="var(--glow)" opacity={0.35} className="animate-pulse"/><circle r={5.5} fill="var(--glow)" stroke="var(--card)" strokeWidth={2}/><circle cx={-1.8} cy={-1.8} r={1.6} fill="var(--card)"/></svg>:pops.includes(i)&&orb>-50&&orb<850&&<svg className="absolute h-[14%] w-[7%] overflow-visible" style={{left:`${orb/8-1}%`,top:'59%'}} viewBox="-10 -10 20 20" aria-hidden><circle r={6} fill="none" stroke="var(--glow)" strokeWidth={2} className="arcade-burst"/></svg>}<span className="absolute flex h-[12%] w-[7%] items-center justify-center drop-shadow-md" style={{left:`${(x-28)/8}%`,top:'75%'}}>{object?<img src={object.url} alt={object.name} className="size-full object-contain"/>:<svg viewBox="0 0 40 30" className="size-full" aria-hidden><path d="M3,28 C2,16 10,6 20,5 C31,5 38,15 37,28Z" fill="var(--muted-foreground)" stroke="var(--foreground)" strokeWidth={2}/><path d="M10,18 C14,14 18,14 21,16" stroke="var(--card)" strokeWidth={2} fill="none" strokeLinecap="round"/></svg>}</span>{config.pads&&<span className="absolute h-[3%] w-[7%] rounded-full border-2 border-foreground bg-play-coral" style={{left:`${(x-128)/8}%`,top:'85%'}}/>}</div>;})}
  <span className={`absolute h-[17%] w-[10%] transition-transform duration-75 ${view.shield?'opacity-60':''}`} style={{left:`${(view.x-camera-20)/8}%`,top:`${(view.y-55)/3.6}%`,transform:`rotate(${tilt}deg)`}}><span className="block size-full arcade-bob">{heroUrl?<img src={heroUrl} alt="Your hero" className="size-full object-contain"/>:<Bugley stage={stage} expression={view.hits>0?'oops':'happy'} glow size={70} className="size-full"/>}</span></span>
 </div><progress className="dash-run-progress" max={DASH_FINISH_X-100} value={Math.max(0,view.x-100)} aria-label="Distance to finish"/><div className="flex items-center gap-3"><Bugley stage={stage} size={96} expression={view.hits?'oops':'thinking'} className="shrink-0"/><div className="min-w-0 flex-1"><p className="text-xs font-bold text-muted-foreground">BUGLEY’S BRAIN · {examples.length} CHECKED EXAMPLES</p><p className="font-bold">{thought}</p></div><Button variant="ghost" size="icon" aria-label="Hear Bugley’s thinking" onClick={()=>speak(thought)}><Volume2/></Button></div><div className="flex flex-wrap gap-3"><Button className="min-h-16 flex-1 text-lg" onClick={jump}><ArrowUp/>Jump</Button><Button variant="outline" onClick={()=>setPilot(p=>!p)}>{pilot?<Hand/>:<Brain/>}{pilot?'My turn to drive':'Let Bugley drive'}</Button><Button variant="outline" onClick={()=>setPaused(p=>!p)}>{paused?'Keep running':'Pause & look'}</Button><Button variant="ghost" onClick={finish}><Flag/>Finish run</Button></div><p role="status" className="text-sm text-muted-foreground">{view.hits>0?'Checkpoint rescue! Examples help, but guesses can still go wrong.':'Your examples are choosing Bugley’s jumps — not a fixed jump timer.'}</p></div>;
}