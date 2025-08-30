"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/datePicker";
import type { ElectionDate } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface ElectionDateProps {
  electionDates: ElectionDate[];
}

export const ElectionDates = ({
  electionDates: initialDates,
}: ElectionDateProps) => {
  const [electionDates, setElectionDates] =
    useState<ElectionDate[]>(initialDates);
  const [newDate, setNewDate] = useState<Date | null>(null);

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

    try {
      const res = await fetch("/api/admin/electionDates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate }),
      });

      if (res.ok) {
        const created: ElectionDate = (await res.json()) as ElectionDate;
        setElectionDates([...electionDates, created]);
        setNewDate(null);
        revalidatePath("/petitions");
      }
    } catch (err) {
      console.error("Failed to add election date", err);
    }
  };

  const handleDeleteDate = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/electionDates/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setElectionDates(electionDates.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete election date", err);
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
            <p>{new Date(ed.date).toLocaleString().split(",")[0]}</p>
            <Button
              variant={"destructive"}
              onClick={() => handleDeleteDate(ed.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <DatePicker onChange={(date) => setNewDate(date)} />
        <Button onClick={handleAddDate} disabled={newDate === null}>
          Add Election Date
        </Button>
      </div>
    </div>
  );
};
