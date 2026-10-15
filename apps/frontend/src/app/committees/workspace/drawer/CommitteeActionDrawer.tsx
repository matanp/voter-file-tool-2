"use client";
/**
 * The committee action drawer (plan §8, §9): one sheet for every roster
 * action, driven by a `CommitteeAction`. The caller supplies the action and
 * the loaded detail and handles completion; candidate search, eligibility,
 * form state and errors stay in here, and endpoint URLs stay in
 * `../adapters.ts`.
 *
 * Right-hand sheet on desktop, full screen below `md`. Radix supplies the
 * focus trap and Escape; on close, focus goes back to `returnFocusTo` (the
 * row's menu trigger, which outlives the menu item that opened the drawer).
 * Each new action mounts a fresh flow, so nothing carries over between
 * openings. The drawer closes on success (no "Add another member" in v1).
 */
import React, { useContext, useState } from "react";

import { GlobalContext } from "~/components/providers/GlobalContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { toast } from "~/components/ui/use-toast";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";
import { candidateSubmissionMode, type CandidateSubmissionMode } from "../adapters";
import type { CommitteeAction } from "../committeeAction";
import { AddMemberFlow } from "./AddMemberFlow";
import { DrawerFooter, committeeLabel } from "./drawerParts";
import { Button } from "~/components/ui/button";

export type CommitteeActionDrawerProps = {
  /** The open action, or null when closed. */
  action: CommitteeAction | null;
  /** The action's committee, loaded. */
  detail: CommitteeDetailResponse;
  onClose: () => void;
  /** After a successful mutation (the drawer then closes itself via `onClose`). */
  onComplete: () => void;
  /** Where focus goes when the drawer closes. */
  returnFocusTo?: HTMLElement | null;
};

function drawerTitle(
  action: CommitteeAction,
  mode: CandidateSubmissionMode | null,
): string {
  switch (action.kind) {
    case "add-member":
      return mode === "add" ? "Add member" : "Submit candidate";
    case "replace-member":
      return "Replace member";
    case "remove-member":
      return "Remove member";
    case "record-resignation":
      return "Record resignation";
  }
}

export function CommitteeActionDrawer({
  action,
  detail,
  onClose,
  onComplete,
  returnFocusTo,
}: CommitteeActionDrawerProps) {
  const { actingPermissions } = useContext(GlobalContext);

  // Keep rendering the last action (and where to return focus) while the
  // sheet animates closed, and remount the flow for every new action.
  type Shown = {
    action: CommitteeAction;
    n: number;
    returnFocusTo: HTMLElement | null;
  };
  const [shown, setShown] = useState<Shown | null>(
    action ? { action, n: 0, returnFocusTo: returnFocusTo ?? null } : null,
  );
  if (action && action !== shown?.action) {
    setShown({ action, n: (shown?.n ?? 0) + 1, returnFocusTo: returnFocusTo ?? null });
  }
  const current = action ?? shown?.action ?? null;

  const handleSuccess = (message: string) => {
    toast({ title: "Success", description: message });
    onComplete();
    onClose();
  };

  let mode: CandidateSubmissionMode | null = null;
  let flow: React.ReactNode = null;
  if (current) {
    if (current.kind === "add-member" || current.kind === "replace-member") {
      mode = candidateSubmissionMode(current, actingPermissions);
      flow = mode && (
        <AddMemberFlow
          key={shown?.n}
          action={current}
          mode={mode}
          detail={detail}
          onCancel={onClose}
          onSuccess={handleSuccess}
        />
      );
    }
    flow ??= (
      <>
        <p className="flex-1 px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
          Your role can&apos;t change this committee.
        </p>
        <DrawerFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </>
    );
  }

  return (
    <Sheet
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-none md:w-[34rem] md:max-w-[34rem]"
        onCloseAutoFocus={(event) => {
          const target = shown?.returnFocusTo;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        {current && (
          <>
            <SheetHeader className="border-b px-4 py-3 pr-12 text-left">
              <SheetTitle>{drawerTitle(current, mode)}</SheetTitle>
              <SheetDescription>{committeeLabel(current.committee)}</SheetDescription>
            </SheetHeader>
            {flow}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
