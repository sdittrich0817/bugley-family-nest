import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { familyOptions } from "@/lib/family.functions";
import { accountHead } from "@/lib/parent-auth";
import { FamilyEditor } from "@/components/site/FamilyEditor";
import { Button } from "@/components/ui/button";
import { KidDeviceSettings } from '@/components/site/KidDeviceSettings';
export const Route = createFileRoute("/_authenticated/settings")({ head: () => accountHead("Family settings", "Manage your family’s private child profiles, avatars and logins."), loader: ({context}) => context.queryClient.ensureQueryData(familyOptions), component: Settings });
function Settings() { return <section className="container-page py-12 sm:py-16"><div className="mx-auto max-w-xl"><Button variant="ghost" asChild className="mb-6"><Link to="/hub"><ArrowLeft />Parent Hub</Link></Button><h1 className="mb-3 text-3xl">Family settings</h1><p className="mb-8 text-muted-foreground">Your family, in your hands.</p><FamilyEditor /><KidDeviceSettings/></div></section>; }