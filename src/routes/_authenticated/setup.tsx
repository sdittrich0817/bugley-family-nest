import { useScrollTopOn } from "@/lib/scroll";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { accountHead } from "@/lib/parent-auth";
import { familyOptions, finishFamilySetup } from "@/lib/family.functions";
import { FamilyEditor } from "@/components/site/FamilyEditor";
import { Bugley } from "@/components/brand/Bugley";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/setup")({ head: () => accountHead("Meet your crew", "Set up your private Bugley family with child avatars and simple logins."), loader: ({context}) => context.queryClient.ensureQueryData(familyOptions), component: Setup });
function Setup() {
  const [step, setStep] = useState<"welcome" | "children" | "done">("welcome"); useScrollTopOn(step); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const finish = useServerFn(finishFamilySetup); const queryClient = useQueryClient();
  async function complete() { setBusy(true);setError(""); try { await finish(); await queryClient.invalidateQueries({queryKey:["family"]}); setStep("done"); } catch(err) {setError(err instanceof Error ? err.message : "Please try again.");} finally {setBusy(false);} }
  return <section className="container-page py-12 sm:py-16"><div className="mx-auto max-w-xl">
    <ol aria-label="Family setup progress" className="mb-10 flex items-center justify-center gap-4 text-sm text-muted-foreground">{["Hello","Your crew","Ready"].map((label,i) => <li key={label} aria-current={i === ["welcome","children","done"].indexOf(step) ? "step" : undefined} className={i === ["welcome","children","done"].indexOf(step) ? "font-bold text-foreground" : ""}>{i+1}. {label}</li>)}</ol>
    {step === "welcome" ? <div className="text-center"><Bugley stage="scout" expression="happy" size={150} className="mx-auto" /><h1 className="mt-6 text-4xl">Let’s meet your crew!</h1><p className="my-6 leading-relaxed text-muted-foreground">Hi, I’m Bugley! Every adventurer gets their own avatar, their own login, and a little glow to grow with.</p><Button onClick={() => setStep("children")}>Meet my crew<ArrowRight /></Button></div> : step === "done" ? <div className="text-center"><Bugley stage="navigator" expression="celebrating" size={150} className="mx-auto" /><h1 className="mt-6 text-3xl">Your family is ready for your first session!</h1><p className="my-6 text-muted-foreground">Your crew is saved. Last step: pick a plan and start your 14-day free trial.</p><Button asChild><Link to="/plan">Choose your plan<ArrowRight /></Link></Button><div className="mt-3"><Link to="/hub" className="text-sm underline">Skip to Parent Hub</Link></div></div> : <><h1 className="mb-8 text-center text-3xl">A little glow for everyone</h1><FamilyEditor onFinish={() => void complete()} finishing={busy} />{error && <p role="alert" className="mt-4 text-destructive">{error}</p>}</>}
  </div></section>;
}