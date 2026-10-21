import { createContext, useContext, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Glow } from "@/components/brand/Glow";
import { waitlistSchema } from "@/lib/waitlist";
import { joinWaitlist } from "@/lib/waitlist.functions";

type Source = "start_free" | "log_in";
const Ctx = createContext<{ open: (s: Source) => void }>({ open: () => {} });
export const useWaitlist = () => useContext(Ctx);

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<Source | null>(null);
  return (
    <Ctx.Provider value={{ open: setSource }}>
      {children}
      <Dialog open={source !== null} onOpenChange={(o) => !o && setSource(null)}>
        <DialogContent className="rounded-3xl border-border p-6 sm:max-w-md sm:p-8">
          {source && <WaitlistForm source={source} onDone={() => setSource(null)} />}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

function WaitlistForm({ source, onDone }: { source: Source; onDone: () => void }) {
  const submit = useServerFn(joinWaitlist);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [name, setName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = waitlistSchema.safeParse({
      firstName: fd.get("firstName"),
      email: fd.get("email"),
      kidsCount: fd.get("kidsCount"),
      source,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      const res = await submit({ data: parsed.data });
      if (res.ok) {
        setName(parsed.data.firstName);
        setStatus("done");
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <Glow size="sm">
          <span className="text-5xl" aria-hidden>✨</span>
        </Glow>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-display text-2xl">You're in line, {name}!</DialogTitle>
          <DialogDescription>We'll email you the moment the doors open.</DialogDescription>
        </DialogHeader>
        <Button onClick={onDone}>Sounds good</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader className="text-left">
        <DialogTitle className="font-display text-2xl sm:text-3xl">
          We're opening the doors soon. Be first in line!
        </DialogTitle>
        <DialogDescription>Leave a few details and we'll save your family a spot.</DialogDescription>
      </DialogHeader>

      <Field id="firstName" label="Your first name" error={errors.firstName}>
        <Input id="firstName" name="firstName" autoComplete="given-name" maxLength={80} className="h-11 rounded-xl" />
      </Field>
      <Field id="email" label="Email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={255} className="h-11 rounded-xl" />
      </Field>
      <Field id="kidsCount" label="How many kids?" error={errors.kidsCount}>
        <select
          id="kidsCount"
          name="kidsCount"
          defaultValue="1"
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n === 5 ? "5 or more" : n}</option>
          ))}
        </select>
      </Field>

      {status === "error" && (
        <p className="text-sm text-destructive">Something hiccuped. Please try again in a moment.</p>
      )}
      <Button type="submit" size="lg" disabled={status === "sending"}>
        {status === "sending" ? "Saving your spot…" : "Save my spot"}
      </Button>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
