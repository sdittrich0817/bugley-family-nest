import Matter from 'matter-js';
import { DASH_STEP, DASH_TICKS, type DashConfig } from './play-extra';
export function createDash(config:DashConfig){
 const engine=Matter.Engine.create({gravity:{x:0,y:1.8}});
 const player=Matter.Bodies.rectangle(100,270,32,40,{friction:0,frictionAir:0, inertia:Infinity});
 const ground=Matter.Bodies.rectangle(15000,340,31000,40,{isStatic:true});
 Matter.Composite.add(engine.world,[player,ground]);
 const speed=config.speed==='slow'?1.7:config.speed==='fast'?3.1:2.3;
 let tick=0,jumps=0,orbs=0,hits=0,checkpoint=100,shield=0;
 const collected=new Set<number>();
 const obstacles=Array.from({length:100},(_,i)=>({x:650+i*290,orbX:480+i*290}));
 function step(jump=false){
  if(tick>=DASH_TICKS)return;
  if(player.position.y>=298){jumps=0;if(player.velocity.y>0)Matter.Body.setVelocity(player,{x:speed,y:0});}
  if(jump&&jumps<2){Matter.Body.setVelocity(player,{x:speed,y:-10});jumps++;}
  Matter.Body.setVelocity(player,{x:speed,y:player.velocity.y});
  Matter.Engine.update(engine,DASH_STEP);tick++;if(shield>0)shield--;
  const x=player.position.x,y=player.position.y;
  checkpoint=100+Math.floor(Math.max(0,x-100)/1800)*1800;
  for(let i=0;i<obstacles.length;i++){const o=obstacles[i];if(!o)continue;
   if(!collected.has(i)&&Math.abs(x-o.orbX)<36&&Math.abs(y-240)<65){collected.add(i);orbs++;}
   if(config.pads&&Math.abs(x-(o.x-100))<12&&y>280){Matter.Body.setVelocity(player,{x:speed,y:-13});jumps=1;}
   if(!shield&&Math.abs(x-o.x)<35&&y>272){hits++;Matter.Body.setPosition(player,{x:checkpoint,y:270});Matter.Body.setVelocity(player,{x:speed,y:0});shield=120;jumps=0;break;}
  }
 }
 function view(){return {x:player.position.x,y:player.position.y,tick,orbs,hits,checkpoint,shield,collected};}
 return {step,view,obstacles,dispose:()=>{Matter.Composite.clear(engine.world,false);Matter.Engine.clear(engine);}};
}
export function replayDash(config:DashConfig,ticks:number,jumps:number[]){const run=createDash(config),pressed=new Set(jumps);for(let i=0;i<Math.min(ticks,DASH_TICKS);i++)run.step(pressed.has(i));const r=run.view();run.dispose();return {orbs:r.orbs,hits:r.hits,score:Math.min(12,Math.floor(r.orbs/3))};}