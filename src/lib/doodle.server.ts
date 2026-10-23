import { encode } from 'fast-png';
import type { Stroke } from './play';
// Re-render validated stroke coordinates: clients cannot send images or external URLs.
export function renderDoodle(strokes: Stroke[]) {
  const size = 256, pixels = new Uint8Array(size*size*4).fill(255);
  const colors = [[35,43,73],[240,85,110],[31,158,189],[239,181,45]];
  const dot = (x:number,y:number,c:number[]) => { for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) { const xx=x+dx, yy=y+dy; if(xx<0||yy<0||xx>=size||yy>=size) continue; const i=(yy*size+xx)*4; pixels[i]=c[0]??35;pixels[i+1]=c[1]??43;pixels[i+2]=c[2]??73; } };
  for(const stroke of strokes) { const color=colors[stroke.color]??colors[0]??[35,43,73]; for(let i=1;i<stroke.points.length;i++) { const a=stroke.points[i-1],b=stroke.points[i];if(!a||!b)continue;const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*size));for(let j=0;j<=count;j++)dot(Math.round((a[0]+(b[0]-a[0])*j/count)*255),Math.round((a[1]+(b[1]-a[1])*j/count)*255),color); } }
  return `data:image/png;base64,${Buffer.from(encode({width:size,height:size,data:pixels,channels:4})).toString('base64')}`;
}