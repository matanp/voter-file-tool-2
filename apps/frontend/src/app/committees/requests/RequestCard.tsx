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
import type { MembershipRequestWithDetails } from "./page";
import type { CommitteeMembershipSubmissionMetadata } from "~/lib/validations/committee";
import { toast } from "~/components/ui/use-toast";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useApiMutation } from "~/hooks/useApiMutation";
import { type SimpleApiResponse } from "@voter-file-tool/shared-validators";

type RequestCardProps = {
  request: MembershipRequestWithDetails;
};

function getSubmissionMetadata(
  meta: unknown,
): CommitteeMembershipSubmissionMetadata | null {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    return {
      ...(typeof m.removeMemberId === "string" && {
        removeMemberId: m.removeMemberId,
      }),
      ...(typeof m.requestNotes === "string" && { requestNotes: m.requestNotes }),
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
      acceptOrReject: "accept" | "reject";
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

  const handleAccept = (
    e: React.MouseEvent<HTMLButtonElement>,
    acceptOrReject: "accept" | "reject",
  ) => {
    e.preventDefault();
    void handleRequestMutation.mutate({
      membershipId: request.id,
      acceptOrReject,
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
        {submissionMeta?.removeMemberId && (
          <p className="text-sm text-muted-foreground">
            Intended replacement for member ID: {submissionMeta.removeMemberId}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={(e) => handleAccept(e, "reject")}
          disabled={handleRequestMutation.loading}
        >
          {handleRequestMutation.loading ? "Processing..." : "Reject"}
        </Button>
        <Button
          onClick={(e) => handleAccept(e, "accept")}
          disabled={handleRequestMutation.loading}
        >
          {handleRequestMutation.loading ? "Processing..." : "Accept"}
        </Button>
      </CardFooter>
    </Card>
  );
};
