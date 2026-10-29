import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateCreation } from "@/lib/studio.functions";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function DeleteCreationButton({ childId, id, title, disabled, beforeDelete, onDeleted }: {
  childId: string; id: string; title: string; disabled?: boolean;
  beforeDelete?: () => Promise<void>; onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = useServerFn(updateCreation);
  const qc = useQueryClient();
  async function deleteWork() {
    if (busy) return;
    setBusy(true);
    try {
      await beforeDelete?.();
      const result = await remove({ data: { childId, id, remove: true } });
      if (!result.ok) throw new Error("We couldn’t delete that. Try again.");
      // A pre-delete read may still be running. Stop it before removing the
      // saved row locally so stale results cannot put the card back.
      const keys = ["album", "in-progress", "cast"].map(key => [key, childId]);
      await Promise.all(keys.map(queryKey => qc.cancelQueries({ queryKey })));
      for (const queryKey of keys) {
        qc.setQueryData<{ id: string }[]>(queryKey, rows => rows?.filter(row => row.id !== id));
      }
      setOpen(false);
      toast.success("Deleted. Your grown-up can bring it back from the Parent Hub.");
      onDeleted?.();
      // Closing and navigation must not wait for unrelated image/list reads.
      for (const queryKey of [...keys, ["studio-activity"]]) {
        void qc.invalidateQueries({ queryKey }).catch(() => {});
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t delete that. Try again.");
    } finally { setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" disabled={disabled} aria-label={`Delete ${title}`} title={`Delete ${title}`}><Trash2 className="size-4" />Delete</Button></AlertDialogTrigger>
    <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
      <AlertDialogHeader><AlertDialogTitle className="break-words">Delete “{title}”?</AlertDialogTitle><AlertDialogDescription>This removes it from your saved work. If you change your mind, your grown-up can bring it back from the Parent Hub.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={() => void deleteWork()}><Trash2 />{busy ? "Deleting…" : "Delete work"}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}