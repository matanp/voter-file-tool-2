"use client";

import { useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { MAX_BULK_ROWS, splitPastedLines } from "~/lib/electionConfigParsing";

export type PreviewRowStatus = "new" | "exists" | "duplicate" | "invalid";

/**
 * One pasted line, already parsed, matched and status-tagged by the owning panel.
 *
 * `BulkAddSection` is purely presentational: it never parses a line, never matches one
 * against existing records and never posts. Those are exactly the parts that differ
 * between offices and dates, so they live in the two panels.
 */
export interface PreviewRow {
  /**
   * Index of this line among the non-blank lines of the pasted text
   * (i.e. its index in `splitPastedLines(text)`). Used to remove the line on ✕.
   */
  lineIndex: number;
  /** The line exactly as pasted (trimmed of surrounding whitespace). */
  original: string;
  /** What will be stored, already rendered as a display string by the panel. */
  value: string;
  status: PreviewRowStatus;
  /**
   * Panel-supplied explanation: what an "already exists" row matched, or why an
   * "invalid" row could not be parsed.
   */
  detail?: string;
}

const STATUS_LABELS: Record<PreviewRowStatus, string> = {
  new: "New",
  exists: "Already exists",
  duplicate: "Duplicate in list",
  invalid: "Invalid",
};

const STATUS_VARIANTS: Record<
  PreviewRowStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "default",
  exists: "secondary",
  duplicate: "secondary",
  invalid: "destructive",
};

export function countByStatus(
  rows: PreviewRow[],
): Record<PreviewRowStatus, number> {
  return rows.reduce(
    (counts, row) => {
      counts[row.status] += 1;
      return counts;
    },
    { new: 0, exists: 0, duplicate: 0, invalid: 0 },
  );
}

/**
 * The one-line count summary shown above the preview table. The panels reuse the same
 * string for the success toast, which is why it is exported rather than inlined.
 */
export function summarizePreviewRows(rows: PreviewRow[]): string {
  const counts = countByStatus(rows);
  const parts = [
    `${counts.new} new`,
    `${counts.exists} already exist`,
    `${counts.invalid} invalid`,
  ];
  if (counts.duplicate > 0) {
    parts.push(
      `${counts.duplicate} duplicate${counts.duplicate === 1 ? "" : "s"} in list`,
    );
  }
  return parts.join(" · ");
}

/**
 * Removes the `lineIndex`-th non-blank line from `text`, preserving everything else
 * (including blank lines) verbatim.
 */
function removeLineAt(text: string, lineIndex: number): string {
  let seen = -1;
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    if (line.trim().length > 0) {
      seen += 1;
      if (seen === lineIndex) continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

export interface BulkAddSectionProps {
  rows: PreviewRow[];
  text: string;
  onTextChange: (next: string) => void;
  onConfirm: () => void | Promise<void>;
  /**
   * The enabled-state Confirm label, e.g. "Add 12 offices". The panel supplies it whole
   * because the entity noun is the only entity-specific thing left in this component;
   * the section still owns the blocked-state labels ("Fix 3 invalid rows to continue").
   */
  confirmLabel: string;
}

export const BulkAddSection = ({
  rows,
  text,
  onTextChange,
  onConfirm,
  confirmLabel,
}: BulkAddSectionProps) => {
  const [submitting, setSubmitting] = useState(false);

  const lineCount = useMemo(() => splitPastedLines(text).length, [text]);
  const overCap = lineCount > MAX_BULK_ROWS;

  const counts = countByStatus(rows);
  const summary = summarizePreviewRows(rows);

  const blockedLabel = overCap
    ? `Remove ${lineCount - MAX_BULK_ROWS} line${
        lineCount - MAX_BULK_ROWS === 1 ? "" : "s"
      } to continue`
    : counts.invalid > 0
      ? `Fix ${counts.invalid} invalid row${counts.invalid === 1 ? "" : "s"} to continue`
      : counts.new === 0
        ? "Nothing to add"
        : null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={6}
        aria-label="Bulk add list"
        placeholder="Paste one per line. Commas are not separators."
      />

      {overCap && (
        <p role="alert" className="text-sm text-destructive">
          {lineCount} lines pasted — the limit is {MAX_BULK_ROWS} per batch.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{summary}</p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pasted</TableHead>
                <TableHead>Will be stored as</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.lineIndex}-${row.original}`}>
                  <TableCell>{row.original}</TableCell>
                  <TableCell>{row.value}</TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANTS[row.status]}
                      hoverable={false}
                    >
                      {STATUS_LABELS[row.status]}
                    </Badge>
                    {row.detail && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {row.detail}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label={`Remove ${row.original}`}
                      className="px-2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        onTextChange(removeLineAt(text, row.lineIndex))
                      }
                    >
                      ✕
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <Button
        type="button"
        onClick={handleConfirm}
        disabled={blockedLabel !== null || submitting}
        aria-busy={submitting}
      >
        {submitting ? "Adding..." : (blockedLabel ?? confirmLabel)}
      </Button>
    </div>
  );
};
