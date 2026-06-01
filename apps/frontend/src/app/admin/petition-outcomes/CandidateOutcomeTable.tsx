"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Trash2 } from "lucide-react";

export type PetitionOutcomeOption = "WON_PRIMARY" | "LOST_PRIMARY" | "TIE" | "UNOPPOSED";

export interface CandidateRow {
  id: string;
  voterRecordId: string;
  voteCount: number | undefined;
  outcome: PetitionOutcomeOption;
}

const OUTCOME_LABELS: Record<PetitionOutcomeOption, string> = {
  WON_PRIMARY: "Won primary",
  LOST_PRIMARY: "Lost primary",
  TIE: "Tie",
  UNOPPOSED: "Unopposed winner",
};

interface CandidateOutcomeTableProps {
  candidates: CandidateRow[];
  onUpdate: (id: string, patch: Partial<CandidateRow>) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function CandidateOutcomeTable({
  candidates,
  onUpdate,
  onRemove,
  disabled = false,
}: CandidateOutcomeTableProps) {
  return (
    <div className="border rounded-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-2 font-medium">Voter ID (VRCNUM)</th>
            <th className="text-left p-2 font-medium">Vote count</th>
            <th className="text-left p-2 font-medium">Outcome</th>
            <th className="w-10 p-2" />
          </tr>
        </thead>
        <tbody>
          {candidates.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0">
              <td className="p-2">
                <Input
                  value={row.voterRecordId}
                  onChange={(e) =>
                    onUpdate(row.id, { voterRecordId: e.target.value })
                  }
                  onBlur={(e) =>
                    onUpdate(row.id, { voterRecordId: e.target.value.trim() })
                  }
                  placeholder="VRCNUM"
                  className="font-mono"
                  disabled={disabled}
                />
              </td>
              <td className="p-2">
                <Input
                  type="number"
                  min={0}
                  value={row.voteCount ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      onUpdate(row.id, { voteCount: undefined });
                      return;
                    }
                    const parsed = parseInt(v, 10);
                    onUpdate(row.id, {
                      voteCount: Number.isFinite(parsed) ? parsed : undefined,
                    });
                  }}
                  placeholder="Optional"
                  disabled={disabled}
                />
              </td>
              <td className="p-2">
                <Select
                  value={row.outcome}
                  onValueChange={(value) =>
                    onUpdate(row.id, { outcome: value as PetitionOutcomeOption })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(OUTCOME_LABELS) as [PetitionOutcomeOption, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(row.id)}
                  disabled={disabled}
                  aria-label="Remove candidate"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
