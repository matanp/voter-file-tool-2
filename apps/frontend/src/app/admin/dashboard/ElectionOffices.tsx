"use client";

import type { OfficeName } from "@prisma/client";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";

interface ElectionOfficesProps {
  officeNames: OfficeName[];
}

export const ElectionOffices = ({
  officeNames: initialOffices,
}: ElectionOfficesProps) => {
  const [officeNames, setOfficeNames] = useState<OfficeName[]>(initialOffices);
  const [newOffice, setNewOffice] = useState<string>("");

  // API mutation hooks
  const addOfficeMutation = useApiMutation<OfficeName, { name: string }>(
    "/api/admin/officeNames",
    "POST",
    {
      onSuccess: (createdOffice) => {
        setOfficeNames((prev) => [...prev, createdOffice]);
        setNewOffice("");
      },
      onError: (error) => {
        console.error("Failed to add office", error);
      },
    },
  );

  const deleteOfficeMutation = useApiDelete<OfficeName, { id: number }>(
    "/api/admin/officeNames",
    {
      onSuccess: (data, payload) => {
        if (payload?.id) {
          setOfficeNames((prev) => prev.filter((o) => o.id !== payload.id));
        }
      },
      onError: (error) => {
        console.error("Failed to delete office", error);
      },
    },
  );

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
      if (!res.ok) {
        throw new Error(`Failed to fetch office names (${res.status})`);
      }
      const data = (await res.json()) as OfficeName[];
      setOfficeNames(data);
    } catch (err) {
      console.error("Failed to fetch office names", err);
    }
  };

  const handleAddOffice = async () => {
    if (!newOffice.trim()) return;
    await addOfficeMutation.mutate({ name: newOffice.trim() });
  };

  const handleDeleteOffice = async (id: number) => {
    await deleteOfficeMutation.mutate({ id }, `/api/admin/officeNames/${id}`);
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
              disabled={deleteOfficeMutation.loading}
            >
              {deleteOfficeMutation.loading ? "Deleting..." : "Delete"}
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
        <Button
          onClick={handleAddOffice}
          disabled={!newOffice.trim() || addOfficeMutation.loading}
        >
          {addOfficeMutation.loading ? "Adding..." : "Add Office"}
        </Button>
      </div>
    </div>
  );
};
