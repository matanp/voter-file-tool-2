"use client";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useToast } from "~/components/ui/use-toast";
import type { CommitteeList } from "@prisma/client";
import { useApiMutation } from "~/hooks/useApiMutation";

export function DiscrepanciesActionsMenu({
  VRCNUM,
  showAddressOption,
  address,
  onAction,
}: {
  VRCNUM: string;
  showAddressOption: boolean;
  address: string;
  onAction: (accept: boolean) => void;
}) {
  const { toast } = useToast();

  // API mutation hook
  const handleDiscrepancyMutation = useApiMutation<
    {
      committee: CommitteeList;
    },
    {
      VRCNUM: string;
      accept: boolean;
      takeAddress?: string;
    }
  >("/api/admin/handleCommitteeDiscrepancy", "POST", {
    onSuccess: (data, payload) => {
      if (payload?.accept !== undefined) {
        onAction(payload.accept);
        toast({
          title: "Success",
          description: payload.accept
            ? `Added to committee ${data.committee.cityTown}, LD: ${data.committee.legDistrict}, ED: ${data.committee.electionDistrict}`
            : `Discrepancy removed, not added to committee`,
        });
      }
    },
    onError: (error) => {
      console.error("Failed to handle action:", error);
      toast({
        title: "Error",
        description: `Error: ${error.message}`,
      });
    },
  });

  const handleAction = async (accept: boolean, takeAddress?: string) => {
    await handleDiscrepancyMutation.mutate({ VRCNUM, accept, takeAddress });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={handleDiscrepancyMutation.loading}>
          {handleDiscrepancyMutation.loading ? "Processing..." : "Actions"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Take actions on this record</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleAction(true)}>
            Accept Discrepancy
          </DropdownMenuItem>
          {showAddressOption && (
            <DropdownMenuItem onClick={() => handleAction(true, address)}>
              Accept and Update Address
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => handleAction(false)}>
            Reject Due to Discrepancy
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
