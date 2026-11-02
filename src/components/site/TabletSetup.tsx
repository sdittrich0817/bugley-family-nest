import { Link } from '@tanstack/react-router';
import { KeyRound, Tablet, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TabletSetup() {
  return <section aria-labelledby="tablet-setup-title" className="border-y border-border bg-accent/40 px-5 py-6 sm:px-6">
    <div className="flex items-start gap-3"><Tablet className="mt-1 size-6 shrink-0"/><div><h2 id="tablet-setup-title" className="text-2xl">Their tablet. Your peace of mind.</h2><p className="mt-2 text-sm text-muted-foreground">Set it up together once. Then they can open Bugley and use their own secret login.</p></div></div>
    <ol className="my-5 grid gap-5 sm:grid-cols-3">
      <li><KeyRound className="mb-2 size-5"/><h3 className="text-base">1. Practice their login</h3><p className="mt-2 text-sm">Choose a child PIN or three pictures in Family settings. Practice together; keep your parent PIN separate.</p></li>
      <li><Tablet className="mb-2 size-5"/><h3 className="text-base">2. Connect their tablet</h3><p className="mt-2 text-sm">Use this device, or pair their tablet from yours. Approve it, then add the Bugley Kids icon to its home screen.</p></li>
      <li><ShieldCheck className="mb-2 size-5"/><h3 className="text-base">3. Keep the grown-up keys</h3><p className="mt-2 text-sm">You choose remembered login, daily limits and Studio access. Review recorded activity in the Hub and remove device access in settings.</p></li>
    </ol>
    <Button asChild><Link to="/settings" hash="kids-devices">Set up a child’s tablet<ArrowRight/></Link></Button>
    <p className="mt-4 text-xs text-muted-foreground">Safety updates currently appear here in the Parent Hub—not by email or phone notification. Reports cover recorded activity, not everything on the tablet.</p>
  </section>;
}