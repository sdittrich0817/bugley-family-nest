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
export function GlowDash({config,heroUrl,stage,stickers,onEnd}:{config:DashConfig;heroUrl:string;stage:React.ComponentProps<typeof Bugley>['stage'];stickers:Sticker[];onEnd:(ticks:number,jumps:number[])=>void}){
 const [view,setView]=useState({x:100,y:270,tick:0,orbs:0,hits:0,checkpoint:100,shield:0,collected:new Set<number>()});
 const run=useRef<ReturnType<typeof createDash>|null>(null),jumps=useRef<number[]>([]),press=useRef(false),ended=useRef(false),callback=useRef(onEnd);callback.current=onEnd;
 const jump=()=>{press.current=true;};
 useEffect(()=>{
  const r=createDash(config);run.current=r;let last=performance.now(),acc=0,frame=0;
  const key=(e:KeyboardEvent)=>{if([' ','ArrowUp','w'].includes(e.key)&&!e.repeat){e.preventDefault();jump();}};window.addEventListener('keydown',key);
  const tick=(t:number)=>{acc+=Math.min(100,t-last);last=t;while(acc>=DASH_STEP&&!ended.current){const before=r.view();if(press.current){jumps.current.push(before.tick);r.step(true);press.current=false;}else r.step();acc-=DASH_STEP;if(r.view().tick>=DASH_TICKS){ended.current=true;callback.current(r.view().tick,jumps.current);}}setView({...r.view(),collected:new Set(r.view().collected)});if(!ended.current)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',key);r.dispose();};
 },[config]);
 const camera=Math.max(0,view.x-150),object=stickers.find(s=>s.key===config.object);
 function finish(){if(ended.current)return;ended.current=true;callback.current(view.tick,jumps.current);}
 return <div className="space-y-3"><div role="img" aria-label={`Running through ${config.chocolate?'chocolate cave':config.theme+' world'}, ${view.orbs} orbs collected`} className="relative aspect-[2/1] min-h-52 w-full touch-none overflow-hidden rounded-lg border-2 border-border bg-play-mint" onPointerDown={jump}>
  <img src={DASH_ART[config.theme]} width={1536} height={768} alt="" className={`absolute inset-0 size-full object-cover ${config.chocolate?'dash-chocolate':''}`}/>{config.time==='night'&&<div className="absolute inset-0 bg-dash-night/60"/>}
  <div className="absolute left-3 top-3 z-10 flex gap-3 rounded-lg bg-card/95 px-3 py-2 text-sm font-bold"><span className="flex gap-1"><Star className="size-4 fill-primary text-primary"/>{view.orbs}</span><span><Flag className="inline size-4"/> {Math.floor((view.checkpoint-100)/1800)+1}</span></div>
  {run.current?.obstacles.map((o,i)=>{const x=o.x-camera,orb=o.orbX-camera;if(x<-100||x>850)return null;return <div key={i}>{!view.collected.has(i)&&<span className="absolute size-5 rounded-full border-2 border-card bg-glow shadow-glow" style={{left:`${orb/8}%`,top:'64%'}}/>}<span className="absolute flex h-[12%] w-[7%] items-center justify-center" style={{left:`${x/8}%`,top:'75%'}}>{object?<img src={object.url} alt={object.name} className="size-full object-contain"/>:<span className="text-3xl">🪨</span>}</span>{config.pads&&<span className="absolute h-[3%] w-[7%] rounded-full border-2 border-foreground bg-play-coral" style={{left:`${(x-100)/8}%`,top:'85%'}}/>}</div>;})}
  <span className={`absolute h-[17%] w-[10%] ${view.shield?'opacity-60':''}`} style={{left:`${(view.x-camera-20)/8}%`,top:`${(view.y-25)/3.6}%`}}>{heroUrl?<img src={heroUrl} alt="Your hero" className="size-full object-contain"/>:<Bugley stage={stage} expression="happy" glow size={70} className="size-full"/>}</span>
 </div><div className="flex flex-wrap gap-3"><Button className="min-h-16 flex-1 text-lg" onClick={jump}><ArrowUp/>Jump</Button><Button variant="outline" onClick={finish}><Flag/>Finish run</Button></div><p role="status" className="text-sm text-muted-foreground">{view.hits>0?'Checkpoint rescue! Keep going.':'Ready, set, glow!'}</p></div>;
}