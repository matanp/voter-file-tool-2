"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2 } from "lucide-react";
import { type ReportTypeKey } from "@voter-file-tool/shared-validators";

const ABSENTEE_REPORT_TYPE: ReportTypeKey = "absenteeReport";
const VOTER_IMPORT_TYPE: ReportTypeKey = "voterImport";

interface AbsenteeReportFormData {
  name: string;
  csvFile: File | null;
  csvFileKey: string | null; // Added after successful upload
  isUploading: boolean; // Track upload state
}

const DEFAULT_FORM_DATA: AbsenteeReportFormData = {
  name: "",
  csvFile: null,
  csvFileKey: null,
  isUploading: false,
};

interface VoterImportFormData {
  name: string;
  voterFile: File | null;
  fileKey: string | null;
  year: number;
  recordEntryNumber: number;
  isUploading: boolean;
}

const DEFAULT_VOTER_IMPORT_FORM_DATA: VoterImportFormData = {
  name: "",
  voterFile: null,
  fileKey: null,
  year: new Date().getFullYear(),
  recordEntryNumber: 1,
  isUploading: false,
};

export const SpecialReports = () => {
  const [formData, setFormData] =
    useState<AbsenteeReportFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Voter import state
  const [voterImportForm, setVoterImportForm] = useState<VoterImportFormData>(
    DEFAULT_VOTER_IMPORT_FORM_DATA,
  );
  const [isVoterImportSubmitting, setIsVoterImportSubmitting] = useState(false);
  const [voterImportError, setVoterImportError] = useState<string | null>(null);
  const [voterImportSuccess, setVoterImportSuccess] = useState<string | null>(
    null,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({
      ...prev,
      csvFile: file,
      csvFileKey: null,
      isUploading: false,
    }));
    setError(null);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const response = await fetch("/api/getCsvUploadUrl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error ?? "Failed to get upload URL");
    }

    const { uploadUrl, fileKey } = (await response.json()) as {
      uploadUrl: string;
      fileKey: string;
    };

    // Upload file directly to R2
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file");
    }

    return fileKey;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error("Report name is required");
      }

      if (!formData.csvFile) {
        throw new Error("CSV file is required");
      }

      // Upload file if not already uploaded
      let csvFileKey = formData.csvFileKey;
      if (!csvFileKey) {
        setFormData((prev) => ({ ...prev, isUploading: true }));
        csvFileKey = await uploadFile(formData.csvFile);
        setFormData((prev) => ({ ...prev, csvFileKey, isUploading: false }));
      }

      const response = await fetch("/api/generateReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: ABSENTEE_REPORT_TYPE,
          name: formData.name,
          format: "xlsx",
          csvFileKey,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to generate report");
      }

      setSuccess("Report generation started successfully!");
      setFormData(DEFAULT_FORM_DATA);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
      // Reset upload state on error
      setFormData((prev) => ({ ...prev, isUploading: false }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Voter Import handlers
  const handleVoterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setVoterImportForm((prev) => ({
      ...prev,
      voterFile: file,
      fileKey: null,
      isUploading: false,
    }));
    setVoterImportError(null);
  };

  const uploadVoterFile = async (file: File): Promise<string> => {
    const response = await fetch("/api/getVoterFileUploadUrl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || "text/plain",
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error ?? "Failed to get upload URL");
    }

    const { uploadUrl, fileKey } = (await response.json()) as {
      uploadUrl: string;
      fileKey: string;
    };

    // Upload file directly to R2
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "text/plain",
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file");
    }

    return fileKey;
  };

  const handleVoterImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVoterImportSubmitting(true);
    setVoterImportError(null);
    setVoterImportSuccess(null);

    try {
      // Validate required fields
      if (!voterImportForm.name.trim()) {
        throw new Error("Import name is required");
      }

      if (!voterImportForm.voterFile) {
        throw new Error("Voter file is required");
      }

      if (voterImportForm.year < 2000 || voterImportForm.year > 2100) {
        throw new Error("Year must be between 2000 and 2100");
      }

      if (voterImportForm.recordEntryNumber < 1) {
        throw new Error("Record entry number must be at least 1");
      }

      // Upload file if not already uploaded
      let fileKey = voterImportForm.fileKey;
      if (!fileKey) {
        setVoterImportForm((prev) => ({ ...prev, isUploading: true }));
        fileKey = await uploadVoterFile(voterImportForm.voterFile);
        setVoterImportForm((prev) => ({
          ...prev,
          fileKey,
          isUploading: false,
        }));
      }

      const response = await fetch("/api/generateReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: VOTER_IMPORT_TYPE,
          name: voterImportForm.name,
          format: "txt",
          fileKey,
          fileName: voterImportForm.voterFile.name,
          year: voterImportForm.year,
          recordEntryNumber: voterImportForm.recordEntryNumber,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to start voter import");
      }

      setVoterImportSuccess(
        "Voter import started successfully! You can track the progress in the Reports page.",
      );
      setVoterImportForm(DEFAULT_VOTER_IMPORT_FORM_DATA);
    } catch (err) {
      setVoterImportError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
      // Reset upload state on error
      setVoterImportForm((prev) => ({ ...prev, isUploading: false }));
    } finally {
      setIsVoterImportSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Special Reports & Data Import</h2>

      <Card>
        <CardHeader>
          <CardTitle>Voter File Import</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVoterImportSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voterImportName">Import Name</Label>
              <Input
                id="voterImportName"
                value={voterImportForm.name}
                onChange={(e) =>
                  setVoterImportForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
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
                  value={voterImportForm.year}
                  onChange={(e) =>
                    setVoterImportForm((prev) => ({
                      ...prev,
                      year:
                        parseInt(e.target.value) || new Date().getFullYear(),
                    }))
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
                  value={voterImportForm.recordEntryNumber}
                  onChange={(e) =>
                    setVoterImportForm((prev) => ({
                      ...prev,
                      recordEntryNumber: parseInt(e.target.value) || 1,
                    }))
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
                  onChange={handleVoterFileChange}
                  disabled={voterImportForm.isUploading}
                  required
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  disabled={voterImportForm.isUploading}
                  onClick={() => document.getElementById("voterFile")?.click()}
                >
                  {voterImportForm.isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading {voterImportForm.voterFile?.name}...
                    </>
                  ) : voterImportForm.fileKey ? (
                    <>
                      <span className="mr-2">✅</span>
                      {voterImportForm.voterFile?.name} (Uploaded)
                    </>
                  ) : voterImportForm.voterFile ? (
                    <>
                      <span className="mr-2">📄</span>
                      {voterImportForm.voterFile.name}
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📁</span>
                      Choose Voter File
                    </>
                  )}
                </Button>
              </div>
              {voterImportForm.voterFile &&
                !voterImportForm.fileKey &&
                !voterImportForm.isUploading && (
                  <p className="text-sm text-muted-foreground">
                    File size:{" "}
                    {(voterImportForm.voterFile.size / 1024 / 1024).toFixed(2)}{" "}
                    MB
                  </p>
                )}
              {voterImportForm.isUploading && (
                <p className="text-sm text-blue-600">Uploading file...</p>
              )}
              {voterImportForm.fileKey && (
                <p className="text-sm text-green-600">
                  ✓ File uploaded successfully and ready for import
                </p>
              )}
            </div>

            {voterImportError && (
              <Alert variant="destructive">
                <AlertDescription>{voterImportError}</AlertDescription>
              </Alert>
            )}

            {voterImportSuccess && (
              <Alert>
                <AlertDescription>{voterImportSuccess}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isVoterImportSubmitting || voterImportForm.isUploading}
              className="w-full"
            >
              {voterImportForm.isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : isVoterImportSubmitting ? (
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

      <Card>
        <CardHeader>
          <CardTitle>Absentee Ward/Town Report</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
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
                  disabled={formData.isUploading}
                  required
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  disabled={formData.isUploading}
                  onClick={() => document.getElementById("csvFile")?.click()}
                >
                  {formData.isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading {formData.csvFile?.name}...
                    </>
                  ) : formData.csvFileKey ? (
                    <>
                      <span className="mr-2">✅</span>
                      {formData.csvFile?.name} (Uploaded)
                    </>
                  ) : formData.csvFile ? (
                    <>
                      <span className="mr-2">📄</span>
                      {formData.csvFile.name}
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📁</span>
                      Choose CSV File
                    </>
                  )}
                </Button>
              </div>
              {formData.csvFile &&
                !formData.csvFileKey &&
                !formData.isUploading && (
                  <p className="text-sm text-muted-foreground">
                    File size:{" "}
                    {(formData.csvFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              {formData.isUploading && (
                <p className="text-sm text-blue-600">Uploading file...</p>
              )}
              {formData.csvFileKey && (
                <p className="text-sm text-green-600">
                  ✓ File uploaded successfully and ready for processing
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || formData.isUploading}
              className="w-full"
            >
              {formData.isUploading ? (
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
    </div>
  );
};
