"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useApiQuery } from "~/hooks/useApiQuery";
import type { CommitteeTerm } from "@prisma/client";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface TermsManagementProps {
  initialTerms: CommitteeTerm[];
}

type CommitteeTermApi = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
};

function parseTermList(rawData: unknown): CommitteeTerm[] {
  const terms = rawData as CommitteeTermApi[];

  return terms.map((term) => ({
    ...term,
    startDate: new Date(term.startDate),
    endDate: new Date(term.endDate),
    createdAt: new Date(term.createdAt),
  }));
}

export function TermsManagement({ initialTerms }: TermsManagementProps) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const termsQuery = useApiQuery<CommitteeTerm[]>("/api/admin/terms", {
    initialData: initialTerms,
    parseResponse: parseTermList,
  });
  const terms = termsQuery.data ?? [];

  const createTermMutation = useApiMutation<
    CommitteeTerm,
    { label: string; startDate: string; endDate: string }
  >("/api/admin/terms", "POST", {
    onSuccess: () => {
      toast({ title: "Term created" });
      setLabel("");
      setStartDate("");
      setEndDate("");
      void termsQuery.refetch();
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
        void termsQuery.refetch();
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
          {termsQuery.error != null && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{termsQuery.error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void termsQuery.refetch()}
                  disabled={termsQuery.loading}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {termsQuery.loading && terms.length === 0 ? (
            <p className="text-muted-foreground text-sm">Loading terms...</p>
          ) : terms.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No committee terms found.
            </p>
          ) : (
            <ul className="space-y-2">
              {terms.map((term: CommitteeTerm) => (
                <li
                  key={term.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{term.label}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {format(term.startDate, "MMM d, yyyy")}{" "}
                      –{" "}
                      {format(term.endDate, "MMM d, yyyy")}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
