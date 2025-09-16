"use client";

import type { OfficeName } from "@prisma/client";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";

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

  // API mutation hooks
  const addOfficeMutation = useApiMutation<OfficeName, { name: string }>(
    "/api/admin/officeNames",
    "POST",
    {
      onSuccess: (createdOffice) => {
        setOfficeNames((prev) => [...prev, createdOffice]);
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

  const deleteOfficeMutation = useApiDelete<OfficeName, { id: number }>(
    "/api/admin/officeNames",
    {
      onSuccess: (_data, payload) => {
        if (payload?.id) {
          setOfficeNames((prev) => prev.filter((o) => o.id !== payload.id));
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
        throw new Error(
          `Failed to fetch office names (${res.status} ${res.statusText})`,
        );
      }
      const data = (await res.json()) as OfficeName[];
      setOfficeNames(data);
    } catch (err) {
      console.error("Failed to fetch office names", err);
    }
  };

  const handleAddOffice = async () => {
    if (!newOffice.trim()) return;
    try {
      await addOfficeMutation.mutate({ name: newOffice.trim() });
    } catch (error) {
      // Error is already handled by the onError callback in the mutation hook
      // This catch block prevents the uncaught promise rejection
      console.error("Error in handleAddOffice:", error);
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
              disabled={deletingIds.has(office.id)}
              aria-busy={deletingIds.has(office.id)}
            >
              {deletingIds.has(office.id) ? "Deleting..." : "Delete"}
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
          aria-busy={addOfficeMutation.loading}
        >
          {addOfficeMutation.loading ? "Adding..." : "Add Office"}
        </Button>
      </div>
    </div>
  );
};
