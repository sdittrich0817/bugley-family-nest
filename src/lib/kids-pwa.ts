export function refusesKidsWorker(hostname:string,production:boolean,framed:boolean,off:boolean) {
  const host=hostname.toLowerCase(),label=host.split('.')[0]??'';
  return !production||framed||off||host==='localhost'||host==='beta.lovable.dev'||host.endsWith('.beta.lovable.dev')||['lovableproject.com','lovableproject-dev.com'].some(h=>host===h||host.endsWith(`.${h}`))||((host.endsWith('.lovable.app')||host.endsWith('.gpt-eng.com')||host.endsWith('.gptengineer.run'))&&(/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label)||/^project--.+-dev$/.test(label)));
}
export async function registerKidsWorker() {
  if(!('serviceWorker' in navigator))return;
  if(refusesKidsWorker(location.hostname,import.meta.env.PROD,window.self!==window.top,new URLSearchParams(location.search).get('sw')==='off')) {
    const registrations=await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r=>[r.active,r.waiting,r.installing].some(w=>w&&new URL(w.scriptURL).pathname==='/sw.js')).map(r=>r.unregister()));return;
  }
  await navigator.serviceWorker.register('/sw.js',{scope:'/kids'});
}