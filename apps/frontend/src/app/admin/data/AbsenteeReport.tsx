"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useFileUpload } from "~/hooks/useFileUpload";
import { type ReportTypeKey } from "@voter-file-tool/shared-validators";

const ABSENTEE_REPORT_TYPE: ReportTypeKey = "absenteeReport";

export const AbsenteeReport = () => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileUpload = useFileUpload({
    endpoint: "/api/getCsvUploadUrl",
    maxSize: 50 * 1024 * 1024,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    fileUpload.setFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!name.trim()) throw new Error("Report name is required");
      if (!fileUpload.file) throw new Error("CSV file is required");

      const csvFileKey = fileUpload.fileKey ?? (await fileUpload.upload());

      const response = await fetch("/api/generateReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: ABSENTEE_REPORT_TYPE,
          name,
          format: "xlsx",
          csvFileKey,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Failed to generate report");

      setSuccess("Report generation started successfully!");
      setName("");
      fileUpload.reset();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = error ? error : fileUpload.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absentee Ward/Town Report</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="absenteeReportName">Report Name</Label>
            <Input
              id="absenteeReportName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Report name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csvFile">CSV File</Label>
            <div className="space-y-2">
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
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
                onClick={() => document.getElementById("csvFile")?.click()}
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
                    Choose CSV File
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
                ✓ File uploaded successfully and ready for processing
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
            disabled={isSubmitting || fileUpload.isUploading}
            className="w-full"
          >
            {fileUpload.isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Upload File and Generate Report"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
