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
import React, { useContext, useEffect, useRef, useState } from "react";
import { PrivilegeLevel } from "@prisma/client";

import { GlobalContext } from "~/components/providers/GlobalContext";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { toast } from "~/components/ui/use-toast";
import { hasPermissionFor } from "~/lib/utils";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";
import { candidateSubmissionMode, type CandidateSubmissionMode } from "../adapters";
import type { CommitteeAction } from "../committeeAction";
import { AddMemberFlow } from "./AddMemberFlow";
import { DrawerFooter, committeeLabel, occupantLabel } from "./drawerParts";
import { RecordResignationForm, RemoveMemberForm } from "./MemberExitForms";

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
  /**
   * Where focus goes when `returnFocusTo` is gone by then (e.g. removing an
   * unassigned member removes its row and trigger).
   */
  fallbackFocus?: () => HTMLElement | null;
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
  fallbackFocus,
}: CommitteeActionDrawerProps) {
  const { actingPermissions } = useContext(GlobalContext);

  // Keep rendering the last action (and where to return focus) while the
  // sheet animates closed. `generation` counts openings: it remounts the flow
  // for every new action, and ties a mutation's completion to its opening.
  type Shown = {
    action: CommitteeAction;
    generation: number;
    returnFocusTo: HTMLElement | null;
  };
  const [shown, setShown] = useState<Shown | null>(
    action ? { action, generation: 0, returnFocusTo: returnFocusTo ?? null } : null,
  );
  if (action && action !== shown?.action) {
    setShown({
      action,
      generation: (shown?.generation ?? 0) + 1,
      returnFocusTo: returnFocusTo ?? null,
    });
  }
  const current = action ?? shown?.action ?? null;
  const generation = shown?.generation ?? 0;

  // What is open now, read when a mutation resolves.
  const live = useRef({ open: action !== null, generation });
  useEffect(() => {
    live.current = { open: action !== null, generation };
  });

  // The data changed either way, so always refresh. Close only the opening
  // this mutation came from: if the user closed it mid-flight and opened
  // another action, leave that one alone.
  const handleSuccess = (message: string) => {
    toast({ title: "Success", description: message });
    onComplete();
    if (live.current.open && live.current.generation === generation) onClose();
  };

  let mode: CandidateSubmissionMode | null = null;
  let flow: React.ReactNode = null;
  if (current) {
    const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
    switch (current.kind) {
      case "add-member":
      case "replace-member":
        mode = candidateSubmissionMode(current, actingPermissions);
        flow = mode ? (
          <AddMemberFlow
            key={generation}
            action={current}
            mode={mode}
            detail={detail}
            onCancel={onClose}
            onSuccess={handleSuccess}
          />
        ) : null;
        break;
      // Admin-only endpoints; the row menu offers them only to Admins.
      case "remove-member":
        flow = isAdmin ? (
          <RemoveMemberForm
            key={generation}
            action={current}
            memberLabel={occupantLabel(detail, current.memberId).label}
            onCancel={onClose}
            onSuccess={handleSuccess}
          />
        ) : null;
        break;
      case "record-resignation":
        flow = isAdmin ? (
          <RecordResignationForm
            key={generation}
            action={current}
            memberLabel={occupantLabel(detail, current.memberId).label}
            onCancel={onClose}
            onSuccess={handleSuccess}
          />
        ) : null;
        break;
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
          const trigger = shown?.returnFocusTo;
          const target = trigger?.isConnected ? trigger : fallbackFocus?.();
          if (target) {
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
