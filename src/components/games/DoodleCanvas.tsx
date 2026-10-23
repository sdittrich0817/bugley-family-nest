import { useEffect, useRef, useState } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Stroke } from '@/lib/play';
import { cn } from '@/lib/utils';
export function DoodleCanvas({onChange,disabled}:{onChange:(s:Stroke[])=>void;disabled:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null), drawing=useRef(false), strokes=useRef<Stroke[]>([]);
  const [color,setColor]=useState(0);
  const render=()=>{const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return;ctx.clearRect(0,0,c.width,c.height);const colors=['--foreground','--play-coral','--sky','--primary'];for(const s of strokes.current){ctx.strokeStyle=getComputedStyle(c).getPropertyValue(colors[s.color]??'--foreground');ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();s.points.forEach(([x,y],i)=>i?ctx.lineTo(x*c.width,y*c.height):ctx.moveTo(x*c.width,y*c.height));ctx.stroke();}};
  useEffect(()=>{render();},[]);
  return <div className="space-y-3"><canvas ref={canvas} width={512} height={512} aria-label="Doodle drawing canvas" className="mx-auto block aspect-square w-full max-w-lg touch-none rounded-lg border-2 border-border bg-card"
    onPointerDown={e=>{if(disabled||strokes.current.length>=80)return;const r=e.currentTarget.getBoundingClientRect();strokes.current.push({color,points:[[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]]});drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(!drawing.current)return;const r=e.currentTarget.getBoundingClientRect(),s=strokes.current.at(-1);if(!s||s.points.length>=1000)return;s.points.push([Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]);render();}}
    onPointerUp={()=>{drawing.current=false;onChange(strokes.current.map(s=>({...s,points:[...s.points]})));}} onPointerCancel={()=>{drawing.current=false;}} />
    <div className="flex flex-wrap justify-center gap-2">{['bg-foreground','bg-play-coral','bg-sky','bg-primary'].map((c,i)=><Button key={c} size="icon" variant="outline" aria-label={['Ink crayon','Pink crayon','Blue crayon','Yellow crayon'][i]} aria-pressed={color===i} disabled={disabled} onClick={()=>setColor(i)} className={cn('rounded-full',color===i&&'ring-2 ring-ring')}><span className={cn('size-6 rounded-full',c)}/></Button>)}<Button variant="ghost" size="icon" aria-label="Undo last stroke" disabled={disabled} onClick={()=>{strokes.current.pop();render();onChange([...strokes.current]);}}><Undo2/></Button><Button variant="ghost" size="icon" aria-label="Clear drawing" disabled={disabled} onClick={()=>{strokes.current=[];render();onChange([]);}}><Eraser/></Button></div></div>;
}