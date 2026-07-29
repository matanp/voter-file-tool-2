"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";

type Submission = {
  id: string;
  voterRecordId: string;
  voterRecord: {
    VRCNUM: string;
    firstName: string | null;
    lastName: string | null;
    middleInitial: string | null;
    suffixName: string | null;
  };
  committeeListId: number;
  committeeList: {
    id: number;
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
  };
  membershipType: string | null;
  submittedAt: string;
  submissionMetadata: Record<string, unknown> | null;
};

type DecisionResult = {
  membershipId: string;
  decision: "confirm" | "reject";
  success: boolean;
  error?: string;
};

type DecisionPayload = {
  decisions: Array<{
    membershipId: string;
    decision: "confirm" | "reject";
    rejectionNote?: string;
  }>;
};

interface PendingSubmissionsTableProps {
  meetingId: string;
  activeTermId: string;
}

export function PendingSubmissionsTable({
  meetingId,
}: PendingSubmissionsTableProps) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>(
    {},
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "confirm" | "reject" | null
  >(null);

  // Fetch submissions
  useEffect(() => {
    let cancelled = false;
    async function fetchSubmissions() {
      try {
        const res = await fetch(
          `/api/admin/meetings/${meetingId}/submissions`,
        );
        if (!res.ok) throw new Error("Failed to fetch submissions");
        const data = (await res.json()) as { submissions: Submission[] };
        if (!cancelled) {
          setSubmissions(data.submissions);
        }
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Error",
            description:
              err instanceof Error ? err.message : "Failed to load submissions",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchSubmissions();
    return () => {
      cancelled = true;
    };
  }, [meetingId, toast]);

  const decisionMutation = useApiMutation<
    { results: DecisionResult[] },
    DecisionPayload
  >(`/api/admin/meetings/${meetingId}/decisions`, "POST", {
    onSuccess: (data) => {
      const successes = data.results.filter((r) => r.success);
      const failures = data.results.filter((r) => !r.success);

      if (successes.length > 0) {
        toast({
          title: `${String(successes.length)} decision(s) processed`,
        });
      }
      if (failures.length > 0) {
        toast({
          title: "Some decisions failed",
          description: failures
            .map((f) => `${f.membershipId}: ${f.error ?? "Unknown error"}`)
            .join("; "),
          variant: "destructive",
        });
      }

      // Remove successfully processed from the list
      const successIds = new Set(successes.map((s) => s.membershipId));
      setSubmissions((prev) =>
        prev.filter((s) => !successIds.has(s.id)),
      );
      setSelected(new Set());
      setShowConfirm(false);
      setPendingAction(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === submissions.length
        ? new Set()
        : new Set(submissions.map((s) => s.id)),
    );
  }, [submissions]);

  const openConfirmDialog = useCallback(
    (action: "confirm" | "reject") => {
      if (selected.size === 0) {
        toast({
          title: "No selections",
          description: "Select at least one submission.",
          variant: "destructive",
        });
        return;
      }
      setPendingAction(action);
      setShowConfirm(true);
    },
    [selected, toast],
  );

  const handleSubmitDecisions = useCallback(() => {
    if (!pendingAction || selected.size === 0) return;
    const decisions = Array.from(selected).map((membershipId) => ({
      membershipId,
      decision: pendingAction,
      ...(pendingAction === "reject" && rejectionNotes[membershipId]
        ? { rejectionNote: rejectionNotes[membershipId] }
        : {}),
    }));
    void decisionMutation.mutate({ decisions });
  }, [pendingAction, selected, rejectionNotes, decisionMutation]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading submissions...</p>;
  }

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pending submissions for the active term.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => openConfirmDialog("confirm")}
            disabled={decisionMutation.loading || selected.size === 0}
          >
            Confirm selected ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => openConfirmDialog("reject")}
            disabled={decisionMutation.loading || selected.size === 0}
          >
            Reject selected ({selected.size})
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    selected.size === submissions.length &&
                    submissions.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>VRCNUM</TableHead>
              <TableHead>Committee</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Rejection Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggleSelect(s.id)}
                  />
                </TableCell>
                <TableCell>
                  {[
                    s.voterRecord.firstName,
                    s.voterRecord.middleInitial,
                    s.voterRecord.lastName,
                    s.voterRecord.suffixName,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {s.voterRecord.VRCNUM}
                </TableCell>
                <TableCell>
                  {s.committeeList.cityTown} · ED{" "}
                  {s.committeeList.electionDistrict} · Leg{" "}
                  {s.committeeList.legDistrict}
                </TableCell>
                <TableCell>
                  {new Date(s.submittedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Rejection note (optional)"
                    value={rejectionNotes[s.id] ?? ""}
                    onChange={(e) =>
                      setRejectionNotes((prev) => ({
                        ...prev,
                        [s.id]: e.target.value,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "confirm"
                ? "Confirm selected members"
                : "Reject selected members"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Are you sure you want to{" "}
            <strong>{pendingAction}</strong>{" "}
            {selected.size} submission(s)?
            {pendingAction === "confirm" &&
              " Members will be immediately activated and assigned seats."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant={
                pendingAction === "reject" ? "destructive" : "default"
              }
              onClick={handleSubmitDecisions}
              disabled={decisionMutation.loading}
            >
              {decisionMutation.loading
                ? "Processing..."
                : pendingAction === "confirm"
                  ? "Confirm"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
