"use client";
/**
 * Admin-only letter actions on a recorded resignation in Committee History
 * (ticket 08 decisions 12, 16): "View letter", and "Attach / replace letter",
 * which uploads through the same field and saves it as the membership's
 * letter (audited `RESIGNATION_LETTER_ATTACHED`; a replaced file is kept).
 */
import React, { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/use-toast";
import { letterViewHref, type LetterSummary } from "~/lib/resignationLetter";
import { attachResignationLetter } from "../../adapters";
import {
  EMPTY_LETTER,
  ResignationLetterField,
  ViewLetterLink,
  stagedLetterOf,
  type LetterFieldState,
} from "../../drawer/ResignationLetterField";

export function HistoryLetterActions({
  membershipId,
  letter,
  onSaved,
}: {
  membershipId: string;
  letter: LetterSummary | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<LetterFieldState>(EMPTY_LETTER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const staged = stagedLetterOf(field);

  const save = async () => {
    if (!staged) return;
    setBusy(true);
    setError(null);
    const outcome = await attachResignationLetter(membershipId, staged);
    setBusy(false);
    if (outcome.ok) {
      setOpen(false);
      toast({ title: "Success", description: outcome.message });
      onSaved();
    } else {
      setError(outcome.kind === "error" ? outcome.message : "Something went wrong.");
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2" data-testid="history-letter-actions">
      {letter ? (
        <span>
          Letter: {letter.fileName}{" "}
          <ViewLetterLink href={letterViewHref(membershipId)} fileName={letter.fileName} />
        </span>
      ) : (
        <span className="text-slate-600 dark:text-slate-400">No letter attached</span>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setField(EMPTY_LETTER);
          setError(null);
          setOpen(true);
        }}
      >
        {letter ? "Replace letter" : "Attach letter"}
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {letter ? "Replace the resignation letter" : "Attach a resignation letter"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {letter
                ? "The new file becomes this resignation's letter. The old file is kept in the audit log."
                : "The file becomes this resignation's letter. Only Admins can open it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ResignationLetterField
            target={{ kind: "membership", membershipId }}
            value={field}
            onChange={setField}
            label="Letter"
            disabled={busy}
          />
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button onClick={() => void save()} disabled={busy || !staged}>
              {busy ? "Saving…" : "Save letter"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
