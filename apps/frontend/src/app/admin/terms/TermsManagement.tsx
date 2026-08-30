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
import { Check, Pencil } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  formatCalendarDateForDisplay,
  formatCalendarDateForForm,
} from "~/lib/dateUtils";

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

type TermFieldsPayload = {
  label: string;
  startDate: string;
  endDate: string;
};

/** Maps JSON term rows from the admin API into Date-backed CommitteeTerm objects. */
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
  const [editingTerm, setEditingTerm] = useState<CommitteeTerm | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const termsQuery = useApiQuery<CommitteeTerm[]>("/api/admin/terms", {
    initialData: initialTerms,
    parseResponse: parseTermList,
    enabled: false,
  });
  const terms = termsQuery.data ?? [];

  const createTermMutation = useApiMutation<CommitteeTerm, TermFieldsPayload>(
    "/api/admin/terms",
    "POST",
    {
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
    },
  );

  const updateTermMutation = useApiMutation<CommitteeTerm, TermFieldsPayload>(
    "/api/admin/terms",
    "PUT",
    {
      onSuccess: () => {
        toast({ title: "Term updated" });
        setEditingTerm(null);
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

  const handleOpenEdit = (term: CommitteeTerm) => {
    setEditingTerm(term);
    setEditLabel(term.label);
    setEditStartDate(formatCalendarDateForForm(term.startDate));
    setEditEndDate(formatCalendarDateForForm(term.endDate));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) {
      return;
    }
    if (!editLabel.trim() || !editStartDate || !editEndDate) {
      toast({
        title: "Validation",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    void updateTermMutation.mutate(
      {
        label: editLabel.trim(),
        startDate: editStartDate,
        endDate: editEndDate,
      },
      `/api/admin/terms/${editingTerm.id}`,
    );
  };

  return (
    <div className="space-y-8">
      <Alert>
        <AlertTitle>What a committee term controls</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Only one term is active at a time. That is the term the rest of the
            app uses for committee lists, imports, petitions, eligibility, and
            weight.
          </p>
          <p>
            The label and dates are just a name and calendar range. Editing them
            does not change members, seats, or weight.
          </p>
        </AlertDescription>
      </Alert>

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
            <Button type="submit" disabled={createTermMutation.loading}>
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
                  className="flex items-center justify-between py-2 border-b last:border-0 gap-3"
                >
                  <div>
                    <span className="font-medium">{term.label}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {formatCalendarDateForDisplay(term.startDate)} –{" "}
                      {formatCalendarDateForDisplay(term.endDate)}
                    </span>
                    {term.isActive && (
                      <Badge variant="default" className="ml-2">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(term)}
                      disabled={updateTermMutation.loading}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editingTerm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTerm(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit term</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label htmlFor="editLabel">Label</Label>
              <Input
                id="editLabel"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStartDate">Start Date</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="editEndDate">End Date</Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTerm(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTermMutation.loading}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
