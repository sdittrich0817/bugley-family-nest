import { createFileRoute,Link } from '@tanstack/react-router';
import { KidsInstallGuide } from '@/components/site/KidsInstallGuide';
import { Bugley } from '@/components/brand/Bugley';
import { Button } from '@/components/ui/button';
export const Route=createFileRoute('/_kid/kids_/install')({head:()=>({meta:[{title:'Install Bugley Kids'},{name:'description',content:'Add Bugley Kids to your family device home screen.'},{property:'og:title',content:'Install Bugley Kids'},{property:'og:description',content:'Your grown-up’s guide to installing Bugley Kids.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}]}),component:Install});
function Install(){return <section className="mx-auto max-w-xl px-6 py-8"><Bugley stage="scout" expression="celebrating" size={100}/><h1 className="mt-4 text-3xl">This device is ready!</h1><KidsInstallGuide/><Button asChild><Link to="/kids">Who’s playing?</Link></Button></section>;}