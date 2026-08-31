"use client";

import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/datePicker";
import type { ElectionDate } from "@prisma/client";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import {
  formatElectionDateForDisplay,
  formatElectionDateForForm,
  sortElectionDates,
} from "~/lib/electionDateUtils";
import {
  calendarDateFromLocalDate,
  formatCalendarDateWithWeekday,
  INVALID_DATE_MESSAGE,
  parseCalendarDate,
  splitPastedLines,
} from "~/lib/electionConfigParsing";
import {
  BulkAddSection,
  summarizePreviewRows,
  type PreviewRow,
} from "./BulkAddSection";

interface ElectionDateProps {
  electionDates: ElectionDate[];
}

export const ElectionDates = ({
  electionDates: initialDates,
}: ElectionDateProps) => {
  const { toast } = useToast();
  const [electionDates, setElectionDates] =
    useState<ElectionDate[]>(initialDates);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  // The paste lives here, not in BulkAddSection, so toggling back to single-add and
  // returning does not discard it.
  const [bulkText, setBulkText] = useState("");
  const debouncedBulkText = useDebouncedValue(bulkText);

  // `rows` is a pure function of the (debounced) pasted text. Matching is client-side
  // against the list already in local state; no fetch is involved in the preview.
  // Dates are matched by UTC day: `formatElectionDateForDisplay` renders UTC components,
  // so it doubles as a day key and copes with dates that arrived as JSON strings.
  const { bulkRows, newDatePayloads } = useMemo(() => {
    const existing = new Set(
      electionDates.map((ed) => formatElectionDateForDisplay(ed.date)),
    );
    const seen = new Map<string, string>();
    const payloads: string[] = [];

    const rows = splitPastedLines(debouncedBulkText).map<PreviewRow>(
      (line, lineIndex) => {
        const parsed = parseCalendarDate(line);
        if (parsed === null) {
          return {
            lineIndex,
            original: line,
            value: "—",
            status: "invalid",
            detail: INVALID_DATE_MESSAGE,
          };
        }

        // Weekday is shown deliberately: NY elections are Tuesdays, so a fat-fingered
        // 11/4/2026 -> Wed is visible at a glance.
        const value = formatCalendarDateWithWeekday(parsed);
        const key = formatElectionDateForDisplay(parsed);

        if (existing.has(key)) {
          return {
            lineIndex,
            original: line,
            value,
            status: "exists",
            detail: "already in the list",
          };
        }

        const earlier = seen.get(key);
        if (earlier !== undefined) {
          return {
            lineIndex,
            original: line,
            value,
            status: "duplicate",
            detail: `duplicate of ${earlier}`,
          };
        }

        seen.set(key, line);
        payloads.push(formatElectionDateForForm(parsed));
        return { lineIndex, original: line, value, status: "new" };
      },
    );

    return { bulkRows: rows, newDatePayloads: payloads };
  }, [debouncedBulkText, electionDates]);

  // API mutation hooks
  const addDateMutation = useApiMutation<ElectionDate, { date: string }>(
    "/api/admin/electionDates",
    "POST",
    {
      onSuccess: (createdDate) => {
        setElectionDates((prev) => [...prev, createdDate]);
        setNewDate(null);
        toast({
          title: "Success",
          description: "Election date added successfully.",
        });
      },
      onError: (error) => {
        console.error("Failed to add election date", error);
        toast({
          title: "Error",
          description:
            error.message || "Failed to add election date. Please try again.",
          variant: "destructive",
        });
      },
    },
  );

  const deleteDateMutation = useApiDelete<
    { id: number; message: string },
    { id: number }
  >("/api/admin/electionDates", {
    onSuccess: (data) => {
      if (data?.id) {
        setElectionDates((prev) => prev.filter((d) => d.id !== data.id));
        setDeletingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.id);
          return newSet;
        });
        toast({
          title: "Success",
          description: "Election date deleted successfully.",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Failed to delete election date", error);
      toast({
        title: "Error",
        description: "Failed to delete election date. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkAddMutation = useApiMutation<
    { created: ElectionDate[]; skipped: string[] },
    { dates: string[] }
  >("/api/admin/electionDates/bulk", "POST", {
    onSuccess: (data) => {
      const summary = summarizePreviewRows(bulkRows);
      // Re-sort: the list is served date-ascending, so appending a pasted 2024-2028
      // range would stack it below 2030 in arrival order until the next reload.
      setElectionDates((prev) => sortElectionDates([...prev, ...data.created]));
      // Clearing the text clears the preview — the text is the only source of truth.
      setBulkText("");
      toast({ title: "Success", description: summary });
    },
    onError: (error) => {
      console.error("Failed to bulk add election dates", error);
      // Nothing else changes: the textarea and preview stay intact so Confirm can be
      // retried.
      toast({
        title: "Error",
        description:
          error.message || "Failed to add election dates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBulkConfirm = async () => {
    if (newDatePayloads.length === 0) return;
    try {
      await bulkAddMutation.mutate({ dates: newDatePayloads });
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      console.error("Bulk add dates mutation failed:", error);
    }
  };

  const handleAddDate = async () => {
    if (!newDate) return;
    try {
      // The picker gives a LOCAL-midnight Date; its local components are the day the
      // admin clicked at every UTC offset. `formatElectionDateForForm` would read UTC
      // components, which is right only for dates read back from the DB.
      await addDateMutation.mutate({
        date: calendarDateFromLocalDate(newDate),
      });
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      console.error("Add date mutation failed:", error);
    }
  };

  const handleDeleteDate = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteDateMutation.mutate({ id }, `/api/admin/electionDates/${id}`);
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      // Just remove the id from deleting set if it wasn't already removed
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="section-header mb-4">Election Dates</h2>

      <ul className="mb-4">
        {electionDates.map((ed) => (
          <li
            key={ed.id}
            className="flex justify-between items-center border-b py-2"
          >
            <p>{formatElectionDateForDisplay(ed.date)}</p>
            <Button
              variant={"destructive"}
              onClick={() => handleDeleteDate(ed.id)}
              disabled={deletingIds.has(ed.id)}
            >
              {deletingIds.has(ed.id) ? "Deleting..." : "Delete"}
            </Button>
          </li>
        ))}
      </ul>

      <div className="mb-2 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant={bulkMode ? "default" : "outline"}
          aria-pressed={bulkMode}
          onClick={() => setBulkMode((prev) => !prev)}
        >
          Bulk add
        </Button>
      </div>

      {bulkMode ? (
        <BulkAddSection
          rows={bulkRows}
          text={bulkText}
          onTextChange={setBulkText}
          onConfirm={handleBulkConfirm}
          confirmLabel={`Add ${newDatePayloads.length} election date${
            newDatePayloads.length === 1 ? "" : "s"
          }`}
        />
      ) : (
        <div className="space-y-2">
          <DatePicker onChange={(date) => setNewDate(date)} />
          <Button
            onClick={handleAddDate}
            disabled={newDate === null || addDateMutation.loading}
            aria-busy={addDateMutation.loading}
          >
            {addDateMutation.loading ? "Adding..." : "Add Election Date"}
          </Button>
        </div>
      )}
    </div>
  );
};
