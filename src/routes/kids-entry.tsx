import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect,useState } from 'react';
import { Bugley } from '@/components/brand/Bugley';
import { kidDeviceStatus,forgetInvalidKidDevice } from '@/lib/kid-device.functions';
import { Button } from '@/components/ui/button';
import { useServerFn } from '@tanstack/react-start';
import { KidsInstallGuide } from '@/components/site/KidsInstallGuide';
import { QrCode, ShieldCheck } from 'lucide-react';
export const Route=createFileRoute('/kids-entry')({head:()=>({meta:[{title:'Bugley Kids · Device setup'},{name:'description',content:'A grown-up can set up a trusted device for Bugley Kids.'},{property:'og:title',content:'Bugley Kids · Device setup'},{property:'og:description',content:'Safe family device setup for Bugley Kids.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}]}),component:KidsEntry});
function KidsEntry(){const navigate=useNavigate(),forget=useServerFn(forgetInvalidKidDevice);const [invalid,setInvalid]=useState(false);useEffect(()=>{void kidDeviceStatus().then(s=>{setInvalid(s.invalid);if(s.trusted)void navigate({to:'/kids',replace:true});}).catch(()=>setInvalid(false));},[navigate]);return <section className="mx-auto min-h-screen max-w-lg px-6 py-8 sm:py-12">
  <div className="flex flex-col items-center gap-4 text-center"><Bugley stage="scout" expression="curious" glow size={120}/><h1 className="text-3xl">Bugley Kids</h1><p className="font-display text-xl">Your adventures start here.</p><p className="text-muted-foreground">Ask a grown-up to connect this tablet. After setup, open the Bugley icon and use your own PIN or secret pictures.</p></div>
  <div className="my-6 grid gap-3">{!invalid?<Button className="h-auto min-h-12 whitespace-normal py-3" onClick={()=>void navigate({to:'/login'})}>Grown-up: sign in on this tablet</Button>:<Button className="min-h-12" onClick={async()=>{await forget();await navigate({to:'/login',replace:true});}}>Grown-up: set up again</Button>}<Button asChild variant="secondary" className="min-h-12"><Link to="/pair"><QrCode/>I have a pairing code</Link></Button></div>
  <p className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-5 shrink-0"/>Grown-ups: on your own device, open Family settings → Bugley Kids devices → Pair their tablet. Approve the connection there. Keep your parent PIN private.</p>
  <details className="mt-6 border-t border-border pt-5"><summary className="cursor-pointer font-display text-lg">Add the Bugley icon to this tablet</summary><KidsInstallGuide/></details>
</section>;}