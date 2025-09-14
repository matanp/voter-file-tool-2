"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/datePicker";
import type { ElectionDate } from "@prisma/client";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";

interface ElectionDateProps {
  electionDates: ElectionDate[];
}

export const ElectionDates = ({
  electionDates: initialDates,
}: ElectionDateProps) => {
  const [electionDates, setElectionDates] =
    useState<ElectionDate[]>(initialDates);
  const [newDate, setNewDate] = useState<Date | null>(null);

  // API mutation hooks
  const addDateMutation = useApiMutation<ElectionDate, { date: string }>(
    "/api/admin/electionDates",
    "POST",
    {
      onSuccess: (createdDate) => {
        setElectionDates([...electionDates, createdDate]);
        setNewDate(null);
      },
      onError: (error) => {
        console.error("Failed to add election date", error);
      },
    },
  );

  const deleteDateMutation = useApiDelete<ElectionDate, { id: number }>(
    "/api/admin/electionDates",
    {
      onSuccess: (data, payload) => {
        if (payload?.id) {
          setElectionDates(electionDates.filter((d) => d.id !== payload.id));
        }
      },
      onError: (error) => {
        console.error("Failed to delete election date", error);
      },
    },
  );

  useEffect(() => {
    const loadElectionDates = async () => {
      await fetchElectionDates();
    };

    loadElectionDates().catch((error) => {
      console.log(error);
    });
  }, []);

  const fetchElectionDates = async () => {
    try {
      const res = await fetch("/api/admin/electionDates");
      const data: ElectionDate[] = (await res.json()) as ElectionDate[];
      setElectionDates(data);
    } catch (err) {
      console.error("Failed to fetch election dates", err);
    }
  };

  const handleAddDate = async () => {
    if (!newDate) return;
    await addDateMutation.mutate({ date: newDate.toISOString() });
  };

  const handleDeleteDate = async (id: number) => {
    await deleteDateMutation.mutate(
      undefined,
      `/api/admin/electionDates/${id}`,
    );
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
