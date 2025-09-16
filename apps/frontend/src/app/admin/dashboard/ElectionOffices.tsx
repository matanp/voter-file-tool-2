"use client";

import type { OfficeName } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
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

  const fetchOffices = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch("/api/admin/officeNames", { signal });
        if (!res.ok) {
          throw new Error(
            `Failed to fetch office names (${res.status} ${res.statusText})`,
          );
        }
        const data = (await res.json()) as OfficeName[];
        setOfficeNames(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Failed to fetch office names", err);
        toast({
          title: "Error",
          description: "Could not load office names. Please refresh.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    const ac = new AbortController();
    const loadOffices = async () => {
      await fetchOffices(ac.signal);
    };
    loadOffices().catch((error) => {
      console.error("Failed to load offices", error);
    });
    return () => ac.abort();
  }, [fetchOffices]);

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
          type="button"
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
