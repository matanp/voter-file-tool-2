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
import { CommitteeRequestWithDetails } from "./page";
import { toast } from "~/components/ui/use-toast";
import { startTransition } from "react";
import { useRouter } from "next/navigation";

type RequestCardProps = {
  request: CommitteeRequestWithDetails;
};

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const router = useRouter();
  const handleAccept = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    acceptOrReject: "accept" | "reject",
  ) => {
    e.preventDefault();
    const response = await fetch(`/api/committee/handleRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        committeeRequestId: request.id,
        acceptOrReject: "accept",
      }),
    });

    if (response.status === 200) {
      toast({
        title: "Success",
        description: `${acceptOrReject === "accept" ? "Committtee has been updated" : "Committtee request has been rejected"}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Something went wrong with your request",
      });
    }

    startTransition(() => {
      router.refresh();
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
        <Button variant="outline" onClick={(e) => handleAccept(e, "reject")}>
          Reject
        </Button>
        <Button onClick={(e) => handleAccept(e, "accept")}>Accept</Button>
      </CardFooter>
    </Card>
  );
};
