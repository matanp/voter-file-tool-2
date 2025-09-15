"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/datePicker";
import type { ElectionDate } from "@prisma/client";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";

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
          description: "Failed to add election date. Please try again.",
          variant: "destructive",
        });
      },
    },
  );

  const deleteDateMutation = useApiDelete<{ message: string }, { id: number }>(
    "/api/admin/electionDates",
    {
      onSuccess: (data, payload) => {
        if (payload?.id) {
          setElectionDates((prev) => prev.filter((d) => d.id !== payload.id));
          toast({
            title: "Success",
            description: "Election date deleted successfully.",
          });
        }
      },
      onError: (error) => {
        console.error("Failed to delete election date", error);
        toast({
          title: "Error",
          description: "Failed to delete election date. Please try again.",
          variant: "destructive",
        });
      },
    },
  );

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
    await addDateMutation.mutate({ date: newDate.toISOString() });
  };

  const handleDeleteDate = async (id: number) => {
    await deleteDateMutation.mutate({ id }, `/api/admin/electionDates/${id}`);
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
            <p>{new Date(ed.date).toLocaleString().split(",")[0]}</p>
            <Button
              variant={"destructive"}
              onClick={() => handleDeleteDate(ed.id)}
              disabled={deleteDateMutation.loading}
            >
              {deleteDateMutation.loading ? "Deleting..." : "Delete"}
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
