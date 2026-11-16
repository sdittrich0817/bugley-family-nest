// TEMPORARY: shown only while the "drawing" service notice is switched on in the database.
import { useQuery } from "@tanstack/react-query";
import { Bugley } from "@/components/brand/Bugley";
import { drawingNoticeOptions } from "@/lib/service-notice.functions";

export function DrawingRestNotice() {
  const { data } = useQuery(drawingNoticeOptions);
  if (!data?.message) return null;
  return <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-primary/40 bg-primary/15 p-3 text-foreground">
    <Bugley stage="scout" expression="sleepy" className="h-12 w-12 shrink-0" />
    <p className="font-display text-base leading-snug sm:text-lg">{data.message}</p>
  </div>;
}
