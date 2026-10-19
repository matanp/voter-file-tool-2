"use client";
/**
 * Voter details (`view-voter-details`): the member's voter record as the
 * legacy `/committees` cards showed it, in the drawer. Read-only.
 */
import React, { useEffect, useState } from "react";
import type { VoterRecord } from "@prisma/client";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { VoterCard } from "~/app/recordsearch/VoterCard";
import type { RosterContact } from "~/lib/validations/committee";
import { fetchVoterRecord } from "../adapters";
import { DrawerFooter } from "./drawerParts";

export type VoterDetailsViewProps = {
  memberId: string;
  /**
   * The roster row's contact (Admin only), which prefers the submission's
   * contact over the voter file's (SRS 2.1a).
   */
  contact?: RosterContact;
  onClose: () => void;
};

type Loaded =
  | { status: "loading" }
  | { status: "ready"; record: VoterRecord }
  | { status: "missing" }
  | { status: "error"; message: string };

export function VoterDetailsView({
  memberId,
  contact,
  onClose,
}: VoterDetailsViewProps) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    // The drawer remounts this per opening, so it starts out loading.
    const controller = new AbortController();
    fetchVoterRecord(memberId, controller.signal).then(
      (record) => {
        if (controller.signal.aborted) return;
        setLoaded(record ? { status: "ready", record } : { status: "missing" });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setLoaded({
          status: "error",
          message:
            err instanceof Error ? err.message : "Unable to load voter record.",
        });
      },
    );
    return () => controller.abort();
  }, [memberId]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loaded.status === "loading" && (
          <p className="text-sm text-muted-foreground" role="status">
            Loading voter record…
          </p>
        )}
        {loaded.status === "ready" && (
          <VoterCard
            record={loaded.record}
            committee
            submissionMetadata={contact}
          />
        )}
        {loaded.status === "missing" && (
          <p className="text-sm text-muted-foreground">
            No voter record found for {memberId}.
          </p>
        )}
        {loaded.status === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{loaded.message}</AlertDescription>
          </Alert>
        )}
      </div>
      <DrawerFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </DrawerFooter>
    </>
  );
}
