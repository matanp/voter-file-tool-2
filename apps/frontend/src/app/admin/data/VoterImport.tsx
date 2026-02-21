"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useFileUpload } from "~/hooks/useFileUpload";
import { useApiMutation } from "~/hooks/useApiMutation";
import { type ReportTypeKey } from "@voter-file-tool/shared-validators";

const VOTER_IMPORT_TYPE: ReportTypeKey = "voterImport";

export const VoterImport = () => {
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [recordEntryNumber, setRecordEntryNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileUpload = useFileUpload({
    endpoint: "/api/getVoterFileUploadUrl",
    maxSize: 500 * 1024 * 1024,
  });

  const generateReportMutation = useApiMutation<
    { jobId?: string },
    {
      type: ReportTypeKey;
      name: string;
      format: string;
      fileKey: string;
      fileName: string;
      year: number;
      recordEntryNumber: number;
    }
  >("/api/generateReport", "POST", {
    onSuccess: () => {
      setSuccess(
        "Voter import started successfully! You can track the progress in the Reports page.",
      );
      setName("");
      setYear(new Date().getFullYear());
      setRecordEntryNumber(1);
      fileUpload.reset();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    fileUpload.setFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Import name is required");
      return;
    }
    if (!fileUpload.file) {
      setError("Voter file is required");
      return;
    }
    if (year < 2000 || year > 2100) {
      setError("Year must be between 2000 and 2100");
      return;
    }
    if (recordEntryNumber < 1) {
      setError("Record entry number must be at least 1");
      return;
    }

    try {
      const fileKey = fileUpload.fileKey ?? (await fileUpload.upload());
      await generateReportMutation.mutate({
        type: VOTER_IMPORT_TYPE,
        name,
        format: "txt",
        fileKey,
        fileName: fileUpload.file.name,
        year,
        recordEntryNumber,
      });
    } catch {
      // Error already set in onError
    }
  };

  const displayError = error ? error : fileUpload.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voter File Import</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voterImportName">Import Name</Label>
            <Input
              id="voterImportName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 2025 General Voter File"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) =>
                  setYear(parseInt(e.target.value) || new Date().getFullYear())
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordEntryNumber">Record Entry Number</Label>
              <Input
                id="recordEntryNumber"
                type="number"
                min="1"
                value={recordEntryNumber}
                onChange={(e) =>
                  setRecordEntryNumber(parseInt(e.target.value) || 1)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voterFile">Voter File (.txt)</Label>
            <div className="space-y-2">
              <Input
                id="voterFile"
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                disabled={fileUpload.isUploading}
                required
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                disabled={fileUpload.isUploading}
                onClick={() => document.getElementById("voterFile")?.click()}
              >
                {fileUpload.isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading {fileUpload.file?.name}...
                  </>
                ) : fileUpload.fileKey ? (
                  <>
                    <span className="mr-2">✅</span>
                    {fileUpload.file?.name} (Uploaded)
                  </>
                ) : fileUpload.file ? (
                  <>
                    <span className="mr-2">📄</span>
                    {fileUpload.file.name}
                  </>
                ) : (
                  <>
                    <span className="mr-2">📁</span>
                    Choose Voter File
                  </>
                )}
              </Button>
            </div>
            {fileUpload.file &&
              !fileUpload.fileKey &&
              !fileUpload.isUploading && (
                <p className="text-sm text-muted-foreground">
                  File size:{" "}
                  {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            {fileUpload.isUploading && (
              <p className="text-sm text-blue-600">Uploading file...</p>
            )}
            {fileUpload.fileKey && (
              <p className="text-sm text-green-600">
                ✓ File uploaded successfully and ready for import
              </p>
            )}
          </div>

          {displayError ? (
            <Alert variant="destructive">
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          ) : null}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={generateReportMutation.loading || fileUpload.isUploading}
            className="w-full"
          >
            {fileUpload.isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : generateReportMutation.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Import...
              </>
            ) : (
              "Upload and Import Voter File"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
