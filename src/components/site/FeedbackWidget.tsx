import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareHeart, Star } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback, FEEDBACK_TOPICS } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TOPIC_LABEL: Record<(typeof FEEDBACK_TOPICS)[number], string> = { general: "General", bug: "Something broke", confusing: "Confusing", idea: "Idea", kids: "My kids’ experience", payments: "Plans & checkout" };

/** Tester banner plus a floating "Send feedback" button on parent/public pages (never inside the Kid Zone). */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  return <>
    <div className="border-b border-border bg-accent/60 px-4 py-2 text-center text-sm">
      <span className="font-semibold">You’re testing early Bugley.</span> No real payments — ever. <button className="font-semibold underline" onClick={() => setOpen(true)}>Tell us what you think</button>
    </div>
    <Button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 rounded-full shadow-glow" aria-label="Send feedback"><MessageSquareHeart />Feedback</Button>
    <FeedbackDialog open={open} onOpenChange={setOpen} />
  </>;
}

function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { pathname } = useLocation();
  const send = useServerFn(submitFeedback);
  const [rating, setRating] = useState<number | undefined>();
  const [topic, setTopic] = useState<(typeof FEEDBACK_TOPICS)[number]>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!message.trim()) return;
    setBusy(true);
    try {
      const r = await send({ data: { page: pathname, rating, topic, message, email } });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Thank you! Shea reads every note.");
      setMessage(""); setRating(undefined); setTopic("general"); onOpenChange(false);
    } catch { toast.error("Check your email address and try again."); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Help us make Bugley better</DialogTitle><DialogDescription>What worked, what didn’t, what confused you? We’ll note which page you were on.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div><p className="text-sm font-semibold">How’s it going?</p><div className="mt-1 flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} onClick={() => setRating(n)}><Star className={cn("size-7", rating && n <= rating ? "fill-primary text-primary" : "text-muted-foreground")} /></button>)}</div></div>
        <div className="flex flex-wrap gap-2">{FEEDBACK_TOPICS.map((t) => <button type="button" key={t} aria-pressed={topic === t} onClick={() => setTopic(t)} className={cn("rounded-full border px-3 py-1 text-sm", topic === t ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{TOPIC_LABEL[t]}</button>)}</div>
        <Textarea required rows={4} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us anything…" aria-label="Your feedback" />
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional, if you’d like a reply)" aria-label="Email" />
        <Button type="submit" disabled={busy || !message.trim()} className="w-full">{busy ? "Sending…" : "Send feedback"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
