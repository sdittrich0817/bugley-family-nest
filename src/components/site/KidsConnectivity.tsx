import { useEffect, useState } from 'react';
import { Bugley } from '@/components/brand/Bugley';
import { kidDeviceStatus } from '@/lib/kid-device.functions';
import { kidHeartbeat } from '@/lib/kid-heartbeat.functions';
import { getActivePlayer,setActivePlayer } from '@/lib/kid-zone';
import { useNavigate } from '@tanstack/react-router';
export function KidsConnectivity({children}:{children:React.ReactNode}) {
  const [online,setOnline]=useState(true);
  const [pause,setPause]=useState('');
  const navigate=useNavigate();
  useEffect(()=>{let active=true;const tick=async()=>{if(!navigator.onLine||document.hidden)return;try{const d=await kidDeviceStatus();if(d.invalid){setActivePlayer(null);void navigate({to:'/kids-entry',replace:true});return;}const childId=d.trusted?d.childId:getActivePlayer();if(childId)await kidHeartbeat({data:{childId}});if(active)setPause('');}catch(e){if(active)setPause(e instanceof Error?e.message:'Ask your grown-up to reconnect.');}};const id=setInterval(()=>void tick(),15000);return()=>{active=false;clearInterval(id);};},[navigate]);
  useEffect(()=>{const sync=()=>setOnline(navigator.onLine);sync();window.addEventListener('online',sync);window.addEventListener('offline',sync);return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync);};},[]);
  if(!online)return <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"><Bugley stage="scout" expression="sleepy" size={160}/><h1 className="text-3xl">My glow needs the internet</h1><p>Ask your grown-up to reconnect. Your saved creations are safe.</p></section>;
  if(pause)return <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"><Bugley stage="scout" expression="sleepy" size={140}/><h1 className="text-3xl">Time for a break!</h1><p>{pause}</p></section>;
  return children;
}