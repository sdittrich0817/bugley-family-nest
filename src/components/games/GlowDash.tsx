import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Flag, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { createDash } from '@/lib/dash-engine';
import { DASH_STEP, DASH_TICKS, type DashConfig } from '@/lib/play-extra';
import type { Sticker } from '@/lib/stickers';
import candy from '@/assets/games/dash-candy.jpg';
import lava from '@/assets/games/dash-lava.jpg';
import cloud from '@/assets/games/dash-cloud.jpg';
export const DASH_ART={candy,lava,cloud};
export function GlowDash({config,heroUrl,stage,stickers,onEnd}:{config:DashConfig;heroUrl:string;stage:NonNullable<React.ComponentProps<typeof Bugley>['stage']>;stickers:Sticker[];onEnd:(ticks:number,jumps:number[])=>void}){
 const [view,setView]=useState({x:100,y:270,tick:0,orbs:0,hits:0,checkpoint:100,shield:0,collected:new Set<number>()});
 const run=useRef<ReturnType<typeof createDash>|null>(null),jumps=useRef<number[]>([]),press=useRef(false),ended=useRef(false),callback=useRef(onEnd);callback.current=onEnd;
 const jump=()=>{press.current=true;};
 useEffect(()=>{
  const r=createDash(config);run.current=r;let last=performance.now(),acc=0,frame=0;
  const key=(e:KeyboardEvent)=>{if([' ','ArrowUp','w'].includes(e.key)&&!e.repeat){e.preventDefault();jump();}};window.addEventListener('keydown',key);
  const deadline=Date.now()+180000;
  const checkEnd=()=>{if(!ended.current&&Date.now()>=deadline){ended.current=true;cancelAnimationFrame(frame);callback.current(r.view().tick,jumps.current);}};
  const tick=(t:number)=>{checkEnd();acc+=Math.min(100,t-last);last=t;while(acc>=DASH_STEP&&!ended.current){const before=r.view();if(press.current){jumps.current.push(before.tick);r.step(true);press.current=false;}else r.step();acc-=DASH_STEP;if(r.view().tick>=DASH_TICKS){ended.current=true;callback.current(r.view().tick,jumps.current);}}setView({...r.view(),collected:new Set(r.view().collected)});if(!ended.current)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  const timer=setInterval(checkEnd,250);document.addEventListener('visibilitychange',checkEnd);window.addEventListener('pageshow',checkEnd);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',checkEnd);window.removeEventListener('pageshow',checkEnd);cancelAnimationFrame(frame);window.removeEventListener('keydown',key);r.dispose();};
 },[config]);
 const camera=Math.max(0,view.x-150),object=stickers.find(s=>s.key===config.object);
 function finish(){if(ended.current)return;ended.current=true;callback.current(view.tick,jumps.current);}
 const prevY=useRef(view.y),tilt=Math.max(-18,Math.min(18,(view.y-prevY.current)*3));prevY.current=view.y;
 const pops=[...view.collected];
 return <div className="space-y-3"><div role="img" aria-label={`Running through ${config.chocolate?'chocolate cave':config.theme+' world'}, ${view.orbs} orbs collected`} className="relative aspect-[2/1] min-h-52 w-full touch-none select-none overflow-hidden rounded-lg border-2 border-border bg-play-mint" onPointerDown={jump}>
  <div className={`absolute inset-y-0 left-0 w-[300%] ${config.chocolate?'dash-chocolate':''}`} style={{backgroundImage:`url(${DASH_ART[config.theme]})`,backgroundSize:'33.34% 100%',backgroundRepeat:'repeat-x',transform:`translateX(-${(camera*0.15)%((800/3)*1)}px)`}}/>
  <svg className="absolute inset-x-0 bottom-0 h-1/2 w-[200%]" viewBox="0 0 1600 200" preserveAspectRatio="none" style={{transform:`translateX(-${(camera*0.35)%800}px)`}} aria-hidden><path d="M0,120 C120,60 220,60 340,110 C460,150 560,50 700,90 C780,110 800,120 800,120 C920,60 1020,60 1140,110 C1260,150 1360,50 1500,90 L1600,120 L1600,200 L0,200Z" fill="var(--dash-hill-far)"/></svg>
  <svg className="absolute inset-x-0 bottom-0 h-[30%] w-[200%]" viewBox="0 0 1600 120" preserveAspectRatio="none" style={{transform:`translateX(-${(camera*0.7)%800}px)`}} aria-hidden><path d="M0,60 C100,30 200,40 300,60 C420,80 520,20 650,45 C720,58 760,62 800,60 C900,30 1000,40 1100,60 C1220,80 1320,20 1450,45 L1600,60 L1600,120 L0,120Z" fill="var(--dash-hill-near)"/></svg>
  {config.time==='night'&&<div className="absolute inset-0 bg-dash-night/60"/>}
  <div className="absolute inset-x-0 top-[86%] bottom-0 border-t-4 border-foreground/30 bg-foreground/10"/>
  <div className="absolute left-3 top-3 z-10 flex gap-3 rounded-lg bg-card/95 px-3 py-2 text-sm font-bold"><span className="flex gap-1"><Star className="size-4 fill-primary text-primary"/>{view.orbs}</span><span><Flag className="inline size-4"/> {Math.floor((view.checkpoint-100)/1800)+1}</span></div>
  {run.current?.obstacles.map((o,i)=>{const x=o.x-camera,orb=o.orbX-camera;if(x<-100||x>850)return null;return <div key={i}>{!view.collected.has(i)?<svg className="absolute h-[9%] w-[4.5%] overflow-visible" style={{left:`${orb/8}%`,top:'62%'}} viewBox="-10 -10 20 20" aria-hidden><circle r={9} fill="var(--glow)" opacity={0.35} className="animate-pulse"/><circle r={5.5} fill="var(--glow)" stroke="var(--card)" strokeWidth={2}/><circle cx={-1.8} cy={-1.8} r={1.6} fill="var(--card)"/></svg>:pops.includes(i)&&orb>-50&&orb<850&&<svg className="absolute h-[14%] w-[7%] overflow-visible" style={{left:`${orb/8-1}%`,top:'59%'}} viewBox="-10 -10 20 20" aria-hidden><circle r={6} fill="none" stroke="var(--glow)" strokeWidth={2} className="arcade-burst"/></svg>}<span className="absolute flex h-[12%] w-[7%] items-center justify-center drop-shadow-md" style={{left:`${x/8}%`,top:'75%'}}>{object?<img src={object.url} alt={object.name} className="size-full object-contain"/>:<svg viewBox="0 0 40 30" className="size-full" aria-hidden><path d="M3,28 C2,16 10,6 20,5 C31,5 38,15 37,28Z" fill="var(--muted-foreground)" stroke="var(--foreground)" strokeWidth={2}/><path d="M10,18 C14,14 18,14 21,16" stroke="var(--card)" strokeWidth={2} fill="none" strokeLinecap="round"/></svg>}</span>{config.pads&&<span className="absolute h-[3%] w-[7%] rounded-full border-2 border-foreground bg-play-coral" style={{left:`${(x-100)/8}%`,top:'85%'}}/>}</div>;})}
  <span className={`absolute h-[17%] w-[10%] transition-transform duration-75 ${view.shield?'opacity-60':''}`} style={{left:`${(view.x-camera-20)/8}%`,top:`${(view.y-55)/3.6}%`,transform:`rotate(${tilt}deg)`}}><span className="block size-full arcade-bob">{heroUrl?<img src={heroUrl} alt="Your hero" className="size-full object-contain"/>:<Bugley stage={stage} expression={view.hits>0?'oops':'happy'} glow size={70} className="size-full"/>}</span></span>
 </div><div className="flex flex-wrap gap-3"><Button className="min-h-16 flex-1 text-lg" onClick={jump}><ArrowUp/>Jump</Button><Button variant="outline" onClick={finish}><Flag/>Finish run</Button></div><p role="status" className="text-sm text-muted-foreground">{view.hits>0?'Checkpoint rescue! Keep going.':'Ready, set, glow!'}</p></div>;
}