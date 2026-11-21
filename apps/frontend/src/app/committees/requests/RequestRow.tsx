"use client";
/**
 * One pending submission on the Admin requests page, in the same compact row
 * as the reported exits beside it. Reject calls `/api/committee/handleRequest`
 * here; confirming happens at a meeting record, so the row links to Meetings.
 */
import { useId, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type SimpleApiResponse } from "@voter-file-tool/shared-validators";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import { formatInstantDateForDisplay } from "~/lib/dateUtils";
import type { CommitteeMembershipSubmissionMetadata } from "~/lib/validations/committee";
import { PendingRow } from "~/app/committees/workspace/tabs/pending/PendingRow";
import type { MembershipRequestWithDetails } from "./page";

type RequestRowProps = {
  request: MembershipRequestWithDetails;
};

function getSubmissionMetadata(
  meta: unknown,
): CommitteeMembershipSubmissionMetadata | null {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    const eligibilityWarnings = Array.isArray(m.eligibilityWarnings)
      ? m.eligibilityWarnings
      : undefined;
    return {
      ...(typeof m.removeMemberId === "string" && {
        removeMemberId: m.removeMemberId,
      }),
      ...(typeof m.requestNotes === "string" && {
        requestNotes: m.requestNotes,
      }),
      ...(eligibilityWarnings?.length ? { eligibilityWarnings } : {}),
    };
  }
  return null;
}

export const RequestRow: React.FC<RequestRowProps> = ({ request }) => {
  const router = useRouter();
  const ids = useId();

  const handleRequestMutation = useApiMutation<
    SimpleApiResponse,
    {
      membershipId: string;
      acceptOrReject: "reject";
    }
  >("/api/committee/handleRequest", "POST", {
    onSuccess: (data, payload) => {
      if (payload?.acceptOrReject && "message" in data) {
        const successData = data as { message: string };
        toast({
          title: "Success",
          description: successData.message,
        });
        startTransition(() => {
          router.refresh();
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong with your request",
      });
    },
  });

  const handleReject = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void handleRequestMutation.mutate({
      membershipId: request.id,
      acceptOrReject: "reject",
    });
  };

  const submissionMeta = getSubmissionMetadata(request.submissionMetadata);
  const name =
    `${request.voterRecord.firstName ?? ""} ${request.voterRecord.lastName ?? ""}`.trim() ||
    "Unnamed voter";
  const warnings = submissionMeta?.eligibilityWarnings ?? [];

  return (
    <PendingRow
      labelId={`${ids}-name`}
      busy={handleRequestMutation.loading}
      name={name}
      seat={request.seatNumber !== null ? `Seat ${request.seatNumber}` : null}
      chip={
        <Badge variant="outline" hoverable={false}>
          Submission
        </Badge>
      }
      meta={`Submitted ${formatInstantDateForDisplay(request.submittedAt)}`}
      details={
        <>
          <p>{submissionMeta?.requestNotes ?? "No notes provided"}</p>
          {submissionMeta?.removeMemberId && (
            <p>
              Intended replacement for member ID:{" "}
              {submissionMeta.removeMemberId}
            </p>
          )}
          {warnings.length > 0 && (
            <div className="text-amber-900">
              <p className="font-medium">Eligibility warnings</p>
              <ul className="list-inside list-disc">
                {warnings.map((w, i) => (
                  <li key={typeof w.code === "string" ? w.code : i}>
                    {typeof w.message === "string" ? w.message : String(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      }
      actions={
        <>
          <Button size="sm" asChild>
            <Link href="/admin/meetings">Confirm in Meetings</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={handleRequestMutation.loading}
            aria-label={`Reject ${name}`}
          >
            {handleRequestMutation.loading ? "Processing..." : "Reject"}
          </Button>
        </>
      }
    />
  );
};
