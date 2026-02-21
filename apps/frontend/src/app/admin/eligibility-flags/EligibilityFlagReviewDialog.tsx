"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";

export type EligibilityFlagListItem = {
  id: string;
  reason:
    | "PARTY_MISMATCH"
    | "ASSEMBLY_DISTRICT_MISMATCH"
    | "VOTER_NOT_FOUND"
    | "POSSIBLY_INACTIVE";
  status: "PENDING" | "CONFIRMED" | "DISMISSED";
  membership: {
    voterRecordId: string;
    voterRecord: {
      VRCNUM: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
    committeeList: {
      cityTown: string;
      legDistrict: number;
      electionDistrict: number;
    };
  };
};

type ReviewPayload = {
  decision: "confirm" | "dismiss";
  notes?: string;
};

interface EligibilityFlagReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: EligibilityFlagListItem | null;
  onReviewed: () => void;
}

const REASON_LABELS: Record<EligibilityFlagListItem["reason"], string> = {
  PARTY_MISMATCH: "Party mismatch",
  ASSEMBLY_DISTRICT_MISMATCH: "Assembly district mismatch",
  VOTER_NOT_FOUND: "Voter not found",
  POSSIBLY_INACTIVE: "Possibly inactive",
};

export function EligibilityFlagReviewDialog({
  open,
  onOpenChange,
  flag,
  onReviewed,
}: EligibilityFlagReviewDialogProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");

  const reviewMutation = useApiMutation<{ status: string }, ReviewPayload>(
    "/api/admin/eligibility-flags/review",
    "POST",
    {
      onSuccess: () => {
        toast({ title: "Eligibility flag reviewed" });
        setNotes("");
        onOpenChange(false);
        onReviewed();
      },
      onError: (error: Error) => {
        toast({
          title: "Review failed",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const handleReview = (decision: "confirm" | "dismiss") => {
    if (!flag) return;
    void reviewMutation.mutate(
      {
        decision,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      `/api/admin/eligibility-flags/${flag.id}/review`,
    );
  };

  const memberLabel = flag?.membership.voterRecord
    ? `${flag.membership.voterRecord.firstName ?? ""} ${flag.membership.voterRecord.lastName ?? ""}`.trim() ||
      flag.membership.voterRecord.VRCNUM
    : "Unknown voter";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setNotes("");
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Eligibility Flag</DialogTitle>
          <DialogDescription>
            {flag
              ? `Review ${REASON_LABELS[flag.reason]} for ${memberLabel}.`
              : "Review this flagged eligibility discrepancy."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="eligibility-review-notes">Notes (optional)</Label>
          <Textarea
            id="eligibility-review-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1000}
            placeholder="Add review notes"
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reviewMutation.loading}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleReview("dismiss")}
            disabled={reviewMutation.loading || !flag || flag.status !== "PENDING"}
          >
            Dismiss
          </Button>
          <Button
            onClick={() => handleReview("confirm")}
            disabled={reviewMutation.loading || !flag || flag.status !== "PENDING"}
          >
            Confirm removal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
