"use client";

import React, { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";

type WeightedTableImportResponse = {
  matched?: number;
  skippedNoCommittee?: number;
};

export const WeightedTableImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    matched: number;
    skippedNoCommittee: number;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const importMutation = useApiMutation<
    WeightedTableImportResponse,
    FormData
  >("/api/admin/weightedTable/import", "POST", {
    onSuccess: (data) => {
      setResult({
        matched: data.matched ?? 0,
        skippedNoCommittee: data.skippedNoCommittee ?? 0,
      });
      setFile(null);
      formRef.current?.reset();
      toast({ title: "Import completed" });
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    importMutation.reset();
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

    setResult(null);
    const formData = new FormData();
    formData.set("weightedTable", file);

    try {
      await importMutation.mutate(formData);
    } catch {
      // onError callback already handles the user-facing error state.
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
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weighted-table-file">Weighted Table (Excel)</Label>
            <Input
              id="weighted-table-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={importMutation.loading}
            />
          </div>
          <Button type="submit" disabled={!file || importMutation.loading}>
            {importMutation.loading ? "Importing..." : "Import"}
          </Button>
        </form>
        {importMutation.error != null && (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{importMutation.error}</AlertDescription>
          </Alert>
        )}
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
