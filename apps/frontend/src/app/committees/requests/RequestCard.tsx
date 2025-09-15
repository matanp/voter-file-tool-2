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
import type { CommitteeRequestWithDetails } from "./page";
import { toast } from "~/components/ui/use-toast";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useApiMutation } from "~/hooks/useApiMutation";
import type { CommitteeRequest } from "@prisma/client";

type RequestCardProps = {
  request: CommitteeRequestWithDetails;
};

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const router = useRouter();

  // API mutation hook
  const handleRequestMutation = useApiMutation<
    CommitteeRequest,
    {
      committeeRequestId: string;
      acceptOrReject: "accept" | "reject";
    }
  >("/api/committee/handleRequest", "POST", {
    onSuccess: (data, payload) => {
      if (payload?.acceptOrReject) {
        toast({
          title: "Success",
          description: `${payload.acceptOrReject === "accept" ? "Committee has been updated" : "Committee request has been rejected"}`,
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
      committeeRequestId: String(request.id),
      acceptOrReject,
    });
  };

  return (
    <Card className="my-2">
      <CardHeader>
        <CardTitle>Committee Change Request</CardTitle>
        <CardDescription>{request.requestNotes}</CardDescription>
      </CardHeader>
      <CardContent>
        {request.addVoterRecord && (
          <h1>
            Add{" "}
            {`${request.addVoterRecord.firstName} ${request.addVoterRecord.lastName}`}
          </h1>
        )}
        {request.removeVoterRecord && (
          <h1>
            Remove{" "}
            {`${request.removeVoterRecord.firstName} ${request.removeVoterRecord.lastName}`}
          </h1>
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
