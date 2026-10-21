import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getParentAccount } from "@/lib/parent-account.functions";
import { AccountFrame } from "@/components/site/AccountFrame";
import { Button } from "@/components/ui/button";
import { useParentSession } from "@/components/site/ParentSession";
import { accountHead } from "@/lib/parent-auth";
const accountOptions = queryOptions({ queryKey: ["parent-account"], queryFn: () => getParentAccount() });
export const Route = createFileRoute("/_authenticated/account")({ head: () => accountHead("Your parent account", "Your private Bugley parent profile and recorded consent."), loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions), component: Account });
function Account() {
  const { data } = useSuspenseQuery(accountOptions); const { signOut } = useParentSession();
  return <AccountFrame title={`Welcome, ${data.profile.first_name}`} subtitle="Your email is verified. Your parent account is active."><dl className="space-y-5 border-y border-border py-6"><div><dt className="text-sm text-muted-foreground">Parent name</dt><dd className="mt-1 font-medium">{data.profile.first_name} {data.profile.last_name}</dd></div><div><dt className="text-sm text-muted-foreground">Parental consent recorded</dt><dd className="mt-1"><time dateTime={data.consent.agreed_at}>{new Date(data.consent.agreed_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time></dd></div></dl><details className="mt-6"><summary className="cursor-pointer font-medium">Your consent agreement</summary><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{data.consent.consent_text}</p></details><p className="my-6 leading-relaxed text-muted-foreground">No child information has been added. Child profiles and the Studio are coming later.</p><Button variant="secondary" className="w-full" onClick={() => void signOut()}>Log out</Button></AccountFrame>;
}