"use client";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import type { MembershipRequestWithDetails } from "./page";
import type { CommitteeMembershipSubmissionMetadata } from "~/lib/validations/committee";
import { toast } from "~/components/ui/use-toast";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useApiMutation } from "~/hooks/useApiMutation";
import { type SimpleApiResponse } from "@voter-file-tool/shared-validators";
import Link from "next/link";

type RequestCardProps = {
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
      ...(typeof m.requestNotes === "string" && { requestNotes: m.requestNotes }),
      ...(eligibilityWarnings?.length ? { eligibilityWarnings } : {}),
    };
  }
  return null;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const router = useRouter();

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

  return (
    <Card className="my-2">
      <CardHeader>
        <CardTitle>Committee Membership Request</CardTitle>
        <CardDescription>
          {submissionMeta?.requestNotes ?? "No notes provided"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <h1>
          Add{" "}
          {`${request.voterRecord.firstName ?? ""} ${request.voterRecord.lastName ?? ""}`.trim()}
        </h1>
        {request.replaces && (
          <p className="text-sm text-muted-foreground">
            Replaces {request.replaces.name} (member ID{" "}
            {request.replaces.voterRecordId}). Their reported exit is listed
            under Reported exits; rejecting this candidate rejects it too.
          </p>
        )}
        {submissionMeta?.eligibilityWarnings &&
          submissionMeta.eligibilityWarnings.length > 0 && (
            <Alert variant="warning" className="mt-2">
              <AlertTitle>Eligibility warnings</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {submissionMeta.eligibilityWarnings.map((w, i) => (
                    <li key={typeof w.code === "string" ? w.code : i}>
                      {typeof w.message === "string" ? w.message : String(w)}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={handleRequestMutation.loading}
        >
          {handleRequestMutation.loading ? "Processing..." : "Reject"}
        </Button>
        <Button asChild>
          <Link href="/admin/meetings">Confirm in Meetings</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
