"use client";

import type { OfficeName } from "@prisma/client";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { revalidatePath } from "next/cache";

interface ElectionOfficesProps {
  officeNames: OfficeName[];
}

export const ElectionOffices = ({
  officeNames: initialOffices,
}: ElectionOfficesProps) => {
  const [officeNames, setOfficeNames] = useState<OfficeName[]>(initialOffices);
  const [newOffice, setNewOffice] = useState<string>("");

  useEffect(() => {
    const loadOffices = async () => {
      await fetchOffices();
    };

    loadOffices().catch((error) => {
      console.error("Failed to load offices", error);
    });
  }, []);

  const fetchOffices = async () => {
    try {
      const res = await fetch("/api/admin/officeNames");
      const data = (await res.json()) as OfficeName[];
      setOfficeNames(data);
    } catch (err) {
      console.error("Failed to fetch office names", err);
    }
  };

  const handleAddOffice = async () => {
    if (!newOffice.trim()) return;

    try {
      const res = await fetch("/api/admin/officeNames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOffice.trim() }),
      });

      if (res.ok) {
        const created = (await res.json()) as OfficeName;
        setOfficeNames([...officeNames, created]);
        setNewOffice("");
        revalidatePath("/petitions");
      }
    } catch (err) {
      console.error("Failed to add office", err);
    }
  };

  const handleDeleteOffice = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/officeNames/${id}}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOfficeNames(officeNames.filter((o) => o.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete office", err);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Election Offices</h1>

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
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <Input
          value={newOffice}
          onChange={(e) => setNewOffice(e.target.value)}
          placeholder="New office name"
        />
        <Button onClick={handleAddOffice} disabled={!newOffice.trim()}>
          Add Office
        </Button>
      </div>
    </div>
  );
};
