"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import {
  EligibilityFlagReviewDialog,
  type EligibilityFlagListItem,
} from "./EligibilityFlagReviewDialog";

type FlagsResponse = {
  flags: EligibilityFlagListItemWithContext[];
};

type RunResponse = {
  termId: string;
  scanned: number;
  newFlags: number;
  existingPending: number;
  durationMs: number;
};

type EligibilityFlagListItemWithContext = EligibilityFlagListItem & {
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: { id: string; name: string | null; email: string } | null;
  membership: EligibilityFlagListItem["membership"] & {
    term: { id: string; label: string };
    seatNumber: number | null;
  };
};

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "DISMISSED";
type ReasonFilter =
  | "ALL"
  | "PARTY_MISMATCH"
  | "ASSEMBLY_DISTRICT_MISMATCH"
  | "VOTER_NOT_FOUND"
  | "POSSIBLY_INACTIVE";

const STATUS_VARIANTS: Record<EligibilityFlagListItem["status"], string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-red-100 text-red-900",
  DISMISSED: "bg-emerald-100 text-emerald-900",
};

const REASON_LABELS: Record<EligibilityFlagListItem["reason"], string> = {
  PARTY_MISMATCH: "Party mismatch",
  ASSEMBLY_DISTRICT_MISMATCH: "Assembly district mismatch",
  VOTER_NOT_FOUND: "Voter not found",
  POSSIBLY_INACTIVE: "Possibly inactive",
};

interface EligibilityFlagsTableProps {
  activeTermId?: string;
  activeTermLabel?: string;
}

export function EligibilityFlagsTable({
  activeTermId,
  activeTermLabel,
}: EligibilityFlagsTableProps) {
  const { toast } = useToast();
  const [flags, setFlags] = useState<EligibilityFlagListItemWithContext[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("ALL");
  const [selectedFlag, setSelectedFlag] =
    useState<EligibilityFlagListItemWithContext | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const runMutation = useApiMutation<RunResponse, { termId?: string }>(
    "/api/admin/eligibility-flags/run",
    "POST",
    {
      onSuccess: (data) => {
        toast({
          title: "Eligibility check complete",
          description: `Scanned ${data.scanned} memberships, created ${data.newFlags} new flags.`,
        });
        void loadFlags();
      },
      onError: (error: Error) => {
        toast({
          title: "Run failed",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (statusFilter !== "ALL") searchParams.set("status", statusFilter);
      if (reasonFilter !== "ALL") searchParams.set("reason", reasonFilter);
      if (activeTermId) searchParams.set("termId", activeTermId);

      const response = await fetch(
        `/api/admin/eligibility-flags?${searchParams.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch flags (${response.status})`);
      }
      const data = (await response.json()) as FlagsResponse;
      setFlags(data.flags ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch flags";
      toast({
        title: "Load failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTermId, reasonFilter, statusFilter, toast]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const pendingCount = useMemo(
    () => flags.filter((flag) => flag.status === "PENDING").length,
    [flags],
  );

  const openReviewDialog = (flag: EligibilityFlagListItemWithContext) => {
    setSelectedFlag(flag);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {activeTermLabel
              ? `Active term: ${activeTermLabel}`
              : "Review pending eligibility discrepancies from BOE checks."}
          </p>
          <p className="text-sm text-muted-foreground">
            Pending flags: {pendingCount}
          </p>
        </div>
        <Button
          onClick={() =>
            void runMutation.mutate(
              activeTermId ? { termId: activeTermId } : undefined,
            )
          }
          disabled={runMutation.loading}
        >
          {runMutation.loading ? "Running..." : "Run eligibility check"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={reasonFilter}
          onValueChange={(value) => setReasonFilter(value as ReasonFilter)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All reasons</SelectItem>
            <SelectItem value="PARTY_MISMATCH">Party mismatch</SelectItem>
            <SelectItem value="ASSEMBLY_DISTRICT_MISMATCH">
              Assembly district mismatch
            </SelectItem>
            <SelectItem value="VOTER_NOT_FOUND">Voter not found</SelectItem>
            <SelectItem value="POSSIBLY_INACTIVE">Possibly inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Committee</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Detected</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!loading && flags.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No eligibility flags found.
              </TableCell>
            </TableRow>
          ) : null}

          {flags.map((flag) => {
            const voter = flag.membership.voterRecord;
            const memberName = voter
              ? `${voter.firstName ?? ""} ${voter.lastName ?? ""}`.trim() ||
                voter.VRCNUM
              : flag.membership.voterRecordId;
            const committee = flag.membership.committeeList;

            return (
              <TableRow key={flag.id}>
                <TableCell>
                  <div className="font-medium">{memberName}</div>
                  <div className="text-xs text-muted-foreground">
                    {flag.membership.voterRecordId}
                  </div>
                </TableCell>
                <TableCell>
                  {committee.cityTown} · ED {committee.electionDistrict} · Leg{" "}
                  {committee.legDistrict}
                </TableCell>
                <TableCell>{REASON_LABELS[flag.reason]}</TableCell>
                <TableCell>
                  {new Date(flag.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge
                    hoverable={false}
                    className={STATUS_VARIANTS[flag.status]}
                  >
                    {flag.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={flag.status === "PENDING" ? "default" : "outline"}
                    onClick={() => openReviewDialog(flag)}
                  >
                    {flag.status === "PENDING" ? "Review" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <EligibilityFlagReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        flag={selectedFlag}
        onReviewed={() => {
          void loadFlags();
        }}
      />
    </div>
  );
}
