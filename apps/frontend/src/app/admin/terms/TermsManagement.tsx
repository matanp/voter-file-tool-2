"use client";

import React, { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import type { CommitteeTerm } from "@prisma/client";
import { format } from "date-fns";
import { Check } from "lucide-react";

interface TermsManagementProps {
  initialTerms: CommitteeTerm[];
}

export function TermsManagement({ initialTerms }: TermsManagementProps) {
  const { toast } = useToast();
  const [terms, setTerms] = useState<CommitteeTerm[]>(initialTerms);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchTerms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/terms");
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast({
          title: "Error fetching terms",
          description: err.error ?? `Request failed (${res.status})`,
          variant: "destructive",
        });
        return;
      }
      const data = (await res.json()) as Array<{
        id: string;
        label: string;
        startDate: string;
        endDate: string;
        isActive: boolean;
        createdAt: string;
      }>;
      setTerms(
        data.map((t) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
          createdAt: new Date(t.createdAt),
        })),
      );
    } catch (e) {
      console.error("Error fetching terms:", e);
      toast({
        title: "Error fetching terms",
        description: e instanceof Error ? e.message : "Failed to fetch",
        variant: "destructive",
      });
    }
  }, [toast]);

  const createTermMutation = useApiMutation<
    CommitteeTerm,
    { label: string; startDate: string; endDate: string }
  >("/api/admin/terms", "POST", {
    onSuccess: () => {
      toast({ title: "Term created" });
      setLabel("");
      setStartDate("");
      setEndDate("");
      void fetchTerms();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setActiveMutation = useApiMutation<{ success: boolean }, never>(
    "/api/admin/terms",
    "PATCH",
    {
      onSuccess: () => {
        toast({ title: "Active term updated" });
        void fetchTerms();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !startDate || !endDate) {
      toast({
        title: "Validation",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    void createTermMutation.mutate({ label: label.trim(), startDate, endDate });
  };

  const handleSetActive = (id: string) => {
    void setActiveMutation.mutate(undefined, `/api/admin/terms/${id}`);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Term</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="label">Label (e.g. 2024–2026)</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="2024–2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={createTermMutation.loading}
            >
              Create Term
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {terms.map((term: CommitteeTerm) => (
              <li
                key={term.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <span className="font-medium">{term.label}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {format(
                      new Date(term.startDate as string | Date),
                      "MMM d, yyyy",
                    )}{" "}
                    –{" "}
                    {format(
                      new Date(term.endDate as string | Date),
                      "MMM d, yyyy",
                    )}
                  </span>
                  {term.isActive && (
                    <Badge variant="default" className="ml-2">
                      Active
                    </Badge>
                  )}
                </div>
                {!term.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetActive(term.id)}
                    disabled={setActiveMutation.loading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Set Active
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
