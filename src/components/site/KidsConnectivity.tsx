import { useEffect, useState } from 'react';
import { Bugley } from '@/components/brand/Bugley';
export function KidsConnectivity({children}:{children:React.ReactNode}) {
  const [online,setOnline]=useState(true);
  useEffect(()=>{const sync=()=>setOnline(navigator.onLine);sync();window.addEventListener('online',sync);window.addEventListener('offline',sync);return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync);};},[]);
  if(!online)return <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"><Bugley stage="scout" expression="sleepy" size={160}/><h1 className="text-3xl">My glow needs the internet</h1><p>Ask your grown-up to reconnect. Your saved creations are safe.</p></section>;
  return children;
}