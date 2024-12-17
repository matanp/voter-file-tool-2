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
import { useState } from "react";
import { useToast } from "~/components/ui/use-toast";

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
  const [loading, setLoading] = useState(false);

  const handleAction = async (accept: boolean, takeAddress?: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/handleCommitteeDiscrepancy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ VRCNUM, accept, takeAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: `Error: ${errorData.error}`,
        });
      } else {
        const successData = await response.json();
        onAction(accept);
        toast({
          title: "Success",
          description: accept
            ? `Added to committee ${successData.committee.cityTown}, LD: ${successData.committee.legDistrict}, ED: ${successData.committee.electionDistrict}`
            : `Discrepancy removed, not added to committee`,
        });
      }
    } catch (error) {
      console.error("Failed to handle action:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? "Processing..." : "Actions"}
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
