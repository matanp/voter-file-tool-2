"use client";

import type { OfficeName } from "@prisma/client";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import {
  normalizeOfficeName,
  officeNameMatchKey,
  splitPastedLines,
} from "~/lib/electionConfigParsing";
import {
  BulkAddSection,
  summarizeBulkResult,
  type PreviewRow,
} from "./BulkAddSection";

interface ElectionOfficesProps {
  officeNames: OfficeName[];
}

export const ElectionOffices = ({
  officeNames: initialOffices,
}: ElectionOfficesProps) => {
  const { toast } = useToast();
  const [officeNames, setOfficeNames] = useState<OfficeName[]>(initialOffices);
  const [newOffice, setNewOffice] = useState<string>("");
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  // The paste lives here, not in BulkAddSection, so toggling back to single-add and
  // returning does not discard it.
  const [bulkText, setBulkText] = useState("");
  const debouncedBulkText = useDebouncedValue(bulkText);

  // `rows` is a pure function of the (debounced) pasted text. Matching is client-side
  // against the list already in local state; no fetch is involved in the preview.
  const bulkRows = useMemo<PreviewRow[]>(() => {
    const existing = new Map(
      officeNames.map((o) => [officeNameMatchKey(o.officeName), o.officeName]),
    );
    const seen = new Map<string, string>();

    return splitPastedLines(debouncedBulkText).map((line, lineIndex) => {
      const value = normalizeOfficeName(line);
      const key = officeNameMatchKey(line);

      const existingMatch = existing.get(key);
      if (existingMatch !== undefined) {
        return {
          lineIndex,
          original: line,
          value,
          status: "exists" as const,
          detail: `already exists as ${existingMatch}`,
        };
      }

      const earlier = seen.get(key);
      if (earlier !== undefined) {
        return {
          lineIndex,
          original: line,
          value,
          status: "duplicate" as const,
          detail: `duplicate of ${earlier}`,
        };
      }

      seen.set(key, value);
      return { lineIndex, original: line, value, status: "new" as const };
    });
  }, [debouncedBulkText, officeNames]);

  const newOfficeNames = bulkRows
    .filter((row) => row.status === "new")
    .map((row) => row.value);

  // API mutation hooks
  const addOfficeMutation = useApiMutation<OfficeName, { name: string }>(
    "/api/admin/officeNames",
    "POST",
    {
      onSuccess: (createdOffice) => {
        setOfficeNames((prev) => {
          const idx = prev.findIndex((o) => o.id === createdOffice.id);
          if (idx === -1) return [...prev, createdOffice];
          const next = prev.slice();
          next[idx] = createdOffice;
          return next;
        });
        setNewOffice("");
        toast({
          title: "Success",
          description: "Office name added successfully.",
        });
      },
      onError: (error) => {
        console.error("Failed to add office", error);
        const description =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Failed to add office name. Please try again.";
        toast({
          title: "Error",
          description,
          variant: "destructive",
        });
      },
    },
  );

  const deleteOfficeMutation = useApiDelete<{ id: number }, { id: number }>(
    "/api/admin/officeNames",
    {
      onSuccess: (data) => {
        if (data?.id) {
          setOfficeNames((prev) => prev.filter((o) => o.id !== data.id));
          toast({
            title: "Success",
            description: "Office name deleted successfully.",
          });
        }
      },
      onError: (error) => {
        console.error("Failed to delete office", error);
        const description =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Failed to delete office name. Please try again.";
        toast({
          title: "Error",
          description,
          variant: "destructive",
        });
      },
    },
  );

  const bulkAddMutation = useApiMutation<
    { created: OfficeName[]; skipped: string[] },
    { names: string[] }
  >("/api/admin/officeNames/bulk", "POST", {
    onSuccess: (data) => {
      setOfficeNames((prev) =>
        [...prev, ...data.created].sort((a, b) =>
          a.officeName.localeCompare(b.officeName),
        ),
      );
      // Clearing the text clears the preview — the text is the only source of truth.
      setBulkText("");
      toast({
        title: "Success",
        description: summarizeBulkResult(
          data.created.length,
          data.skipped.length,
          "office",
        ),
      });
    },
    onError: (error) => {
      console.error("Failed to bulk add offices", error);
      // Nothing else changes: the textarea and preview stay intact so Confirm can be
      // retried.
      toast({
        title: "Error",
        description:
          error.message || "Failed to add office names. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBulkConfirm = async () => {
    if (newOfficeNames.length === 0) return;
    try {
      await bulkAddMutation.mutate({ names: newOfficeNames });
    } catch (_error) {
      // onError already handles user feedback/logging.
    }
  };

  const handleAddOffice = async () => {
    if (!newOffice.trim()) return;
    try {
      await addOfficeMutation.mutate({ name: newOffice.trim() });
    } catch (_error) {
      // onError already handles user feedback/logging.
    }
  };

  const handleDeleteOffice = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteOfficeMutation.mutate({ id }, `/api/admin/officeNames/${id}`);
    } catch (error) {
      console.error("Error in handleDeleteOffice:", error);
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="section-header mb-4">Election Offices</h2>

      <ul className="mb-4">
        {officeNames.map((office) => (
          <li
            key={office.id}
            className="flex justify-between items-center border-b py-2"
          >
            <p>{office.officeName}</p>
            <Button
              variant="destructive"
              onClick={() => handleDeleteOffice(office.id)}
              disabled={deletingIds.has(office.id)}
              aria-busy={deletingIds.has(office.id)}
            >
              {deletingIds.has(office.id) ? "Deleting..." : "Delete"}
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
          confirmLabel={`Add ${newOfficeNames.length} office${
            newOfficeNames.length === 1 ? "" : "s"
          }`}
        />
      ) : (
        <div className="space-y-2">
          <Input
            value={newOffice}
            onChange={(e) => setNewOffice(e.target.value)}
            placeholder="New office name"
          />
          <Button
            type="button"
            onClick={handleAddOffice}
            disabled={!newOffice.trim() || addOfficeMutation.loading}
            aria-busy={addOfficeMutation.loading}
          >
            {addOfficeMutation.loading ? "Adding..." : "Add Office"}
          </Button>
        </div>
      )}
    </div>
  );
};
