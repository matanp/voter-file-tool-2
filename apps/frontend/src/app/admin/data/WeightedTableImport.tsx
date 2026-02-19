"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useToast } from "~/components/ui/use-toast";

export const WeightedTableImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    matched: number;
    skippedNoCommittee: number;
  } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a Weighted Table Excel file",
        variant: "destructive",
      });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "Invalid file type",
        description: "Please select an .xlsx file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("weightedTable", file);

      const response = await fetch("/api/admin/weightedTable/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        error?: string;
        matched?: number;
        skippedNoCommittee?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      setResult({
        matched: data.matched ?? 0,
        skippedNoCommittee: data.skippedNoCommittee ?? 0,
      });
      setFile(null);
      (e.target as HTMLFormElement).reset();
      toast({ title: "Import completed" });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weighted Table Import</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm pb-4">
          Import LTED weights from the MCDC Weighted Table Excel file. Matches
          committees by leg district and election district.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weighted-table-file">Weighted Table (Excel)</Label>
            <Input
              id="weighted-table-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" disabled={!file || isSubmitting}>
            {isSubmitting ? "Importing..." : "Import"}
          </Button>
        </form>
        {result != null && (
          <Alert className="mt-4">
            <AlertDescription>
              Matched: {result.matched} committees updated. Skipped (no committee):{" "}
              {result.skippedNoCommittee}.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
