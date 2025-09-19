"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/datePicker";
import type { ElectionDate } from "@prisma/client";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";
import { formatElectionDateForDisplay } from "~/lib/electionDateUtils";

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

  const fetchElectionDates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/electionDates");
      const data: ElectionDate[] = (await res.json()) as ElectionDate[];
      setElectionDates(data);
    } catch (err) {
      console.error("Failed to fetch election dates", err);
      toast({
        title: "Error",
        description: "Failed to load election dates. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const loadElectionDates = async () => {
      await fetchElectionDates();
    };

    loadElectionDates().catch((error) => {
      console.log(error);
    });
  }, [fetchElectionDates]);

  const handleAddDate = async () => {
    if (!newDate) return;
    try {
      await addDateMutation.mutate({ date: newDate.toISOString() });
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
      <h1 className="text-2xl font-bold mb-4">Election Dates</h1>

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

      <div className="space-y-2">
        <DatePicker onChange={(date) => setNewDate(date)} />
        <Button
          onClick={handleAddDate}
          disabled={newDate === null || addDateMutation.loading}
        >
          {addDateMutation.loading ? "Adding..." : "Add Election Date"}
        </Button>
      </div>
    </div>
  );
};
