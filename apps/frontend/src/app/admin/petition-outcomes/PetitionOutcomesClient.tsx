"use client";

import React, { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import {
  CandidateOutcomeTable,
  type CandidateRow,
  type PetitionOutcomeOption,
} from "./CandidateOutcomeTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";

type CommitteeListWithSeats = {
  id: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  termId: string;
  seats: Array<{ id: string; seatNumber: number; isPetitioned: boolean }>;
};

interface PetitionOutcomesClientProps {
  activeTermId: string;
  termLabel: string;
  committeeLists: CommitteeListWithSeats[];
}

function nextId() {
  return `cand-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function PetitionOutcomesClient({
  activeTermId,
  termLabel,
  committeeLists,
}: PetitionOutcomesClientProps) {
  const { toast } = useToast();
  const [committeeListId, setCommitteeListId] = useState<number | null>(null);
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [primaryDate, setPrimaryDate] = useState("");
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedCommittee = committeeLists.find((c) => c.id === committeeListId);
  const seats = selectedCommittee?.seats ?? [];

  const recordMutation = useApiMutation<
    { message: string; seatNumber: number },
    {
      committeeListId: number;
      termId?: string;
      seatNumber: number;
      primaryDate: string;
      candidates: Array<{
        voterRecordId: string;
        voteCount?: number;
        outcome: PetitionOutcomeOption;
      }>;
    }
  >("/api/admin/petition-outcomes/record", "POST", {
    onSuccess: () => {
      toast({ title: "Outcome recorded" });
      setShowConfirm(false);
      setCandidates([]);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleAddCandidate = useCallback(() => {
    setCandidates((prev) => [
      ...prev,
      {
        id: nextId(),
        voterRecordId: "",
        voteCount: undefined,
        outcome: "LOST_PRIMARY" as PetitionOutcomeOption,
      },
    ]);
  }, []);

  const handleUpdateCandidate = useCallback((id: string, patch: Partial<CandidateRow>) => {
    setCandidates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }, []);

  const handleRemoveCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const validateAndOpenConfirm = useCallback(() => {
    const filled = candidates.filter((c) => c.voterRecordId.trim() !== "");
    if (filled.length === 0) {
      toast({
        title: "Validation",
        description: "Add at least one candidate with a Voter ID.",
        variant: "destructive",
      });
      return;
    }
    const ids = filled.map((c) => c.voterRecordId.trim());
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      toast({
        title: "Validation",
        description: "Duplicate Voter IDs are not allowed.",
        variant: "destructive",
      });
      return;
    }
    const winners = filled.filter(
      (c) => c.outcome === "WON_PRIMARY" || c.outcome === "UNOPPOSED",
    );
    const allTie = filled.every((c) => c.outcome === "TIE");
    if (!allTie && winners.length !== 1) {
      toast({
        title: "Validation",
        description:
          "Exactly one winner (Won primary or Unopposed winner) is required, unless all candidates are Tie.",
        variant: "destructive",
      });
      return;
    }
    if (!committeeListId || seatNumber == null) {
      toast({
        title: "Validation",
        description: "Select a committee and seat.",
        variant: "destructive",
      });
      return;
    }
    if (!primaryDate.trim()) {
      toast({
        title: "Validation",
        description: "Enter the primary date.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirm(true);
  }, [candidates, committeeListId, seatNumber, primaryDate, toast]);

  const handleConfirmSubmit = useCallback(() => {
    const filled = candidates.filter((c) => c.voterRecordId.trim() !== "");
    if (filled.length === 0 || committeeListId == null || seatNumber == null || !primaryDate.trim()) {
      return;
    }
    void recordMutation.mutate({
      committeeListId,
      termId: activeTermId,
      seatNumber,
      primaryDate: primaryDate.trim(),
      candidates: filled.map((c) => ({
        voterRecordId: c.voterRecordId.trim(),
        voteCount: c.voteCount,
        outcome: c.outcome,
      })),
    });
  }, [candidates, committeeListId, seatNumber, primaryDate, activeTermId, recordMutation]);

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <div className="grid gap-2">
          <Label>Term</Label>
          <p className="text-sm text-muted-foreground">{termLabel}</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="committee">Committee</Label>
          <Select
            value={committeeListId?.toString() ?? ""}
            onValueChange={(v) => {
              setCommitteeListId(v ? parseInt(v, 10) : null);
              setSeatNumber(null);
            }}
          >
            <SelectTrigger id="committee">
              <SelectValue placeholder="Select committee" />
            </SelectTrigger>
            <SelectContent>
              {committeeLists.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.cityTown} · ED {c.electionDistrict}
                  {c.legDistrict != null ? ` · Leg ${c.legDistrict}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="seat">Seat</Label>
          <Select
            value={seatNumber?.toString() ?? ""}
            onValueChange={(v) => setSeatNumber(v ? parseInt(v, 10) : null)}
            disabled={!selectedCommittee}
          >
            <SelectTrigger id="seat">
              <SelectValue placeholder="Select seat" />
            </SelectTrigger>
            <SelectContent>
              {seats.map((s) => (
                <SelectItem key={s.id} value={String(s.seatNumber)}>
                  Seat {s.seatNumber}
                  {s.isPetitioned ? " (petitioned)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="primaryDate">Primary date</Label>
          <Input
            id="primaryDate"
            type="date"
            value={primaryDate}
            onChange={(e) => setPrimaryDate(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Candidates</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddCandidate}>
              Add candidate
            </Button>
          </div>
          <CandidateOutcomeTable
            candidates={candidates}
            onUpdate={handleUpdateCandidate}
            onRemove={handleRemoveCandidate}
          />
        </div>

        <Button onClick={validateAndOpenConfirm} disabled={recordMutation.loading}>
          Record outcome
        </Button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm petition outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Committee:</strong>{" "}
              {selectedCommittee
                ? `${selectedCommittee.cityTown} · ED ${selectedCommittee.electionDistrict}`
                : ""}
            </p>
            <p>
              <strong>Seat:</strong> {seatNumber ?? ""}
            </p>
            <p>
              <strong>Primary date:</strong> {primaryDate || ""}
            </p>
            <p className="font-medium mt-2">Candidates:</p>
            <ul className="list-disc list-inside">
              {candidates
                .filter((c) => c.voterRecordId.trim())
                .map((c) => (
                  <li key={c.id}>
                    {c.voterRecordId} — {c.outcome}
                    {c.voteCount != null ? ` (${c.voteCount} votes)` : ""}
                  </li>
                ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={recordMutation.loading}
            >
              {recordMutation.loading ? "Recording…" : "Record outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
