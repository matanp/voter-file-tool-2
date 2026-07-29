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

export type PresignedUploadReportFormSpec = {
  title: string;
  nameField: {
    id: string;
    label: string;
    placeholder: string;
    requiredError: string;
  };
  fileField: {
    id: string;
    label: string;
    accept: string;
    chooseLabel: string;
    requiredError: string;
    readyMessage: string;
  };
  upload: { endpoint: string; maxSize: number };
  submit: {
    idleLabel: string;
    generatingLabel: string;
    successMessage: string;
  };
  buildPayload: (ctx: {
    name: string;
    fileKey: string;
    fileName: string;
  }) => Record<string, unknown>;
};

type PresignedUploadReportFormProps = {
  spec: PresignedUploadReportFormSpec;
  renderExtraFields?: () => React.ReactNode;
  validateExtra?: () => string | null;
  extendPayload?: (base: Record<string, unknown>) => Record<string, unknown>;
  onSuccessReset?: () => void;
};

/** Shared admin form for presigned S3 upload followed by /api/generateReport. */
export function PresignedUploadReportForm({
  spec,
  renderExtraFields,
  validateExtra,
  extendPayload,
  onSuccessReset,
}: PresignedUploadReportFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileUpload = useFileUpload({
    endpoint: spec.upload.endpoint,
    maxSize: spec.upload.maxSize,
  });

  const generateReportMutation = useApiMutation<
    { jobId?: string },
    Record<string, unknown>
  >("/api/generateReport", "POST", {
    onSuccess: () => {
      setSuccess(spec.submit.successMessage);
      setName("");
      onSuccessReset?.();
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
      setError(spec.nameField.requiredError);
      return;
    }
    if (!fileUpload.file) {
      setError(spec.fileField.requiredError);
      return;
    }

    const extraError = validateExtra?.();
    if (extraError) {
      setError(extraError);
      return;
    }

    try {
      const fileKey = fileUpload.fileKey ?? (await fileUpload.upload());
      const basePayload = spec.buildPayload({
        name,
        fileKey,
        fileName: fileUpload.file.name,
      });
      const payload = extendPayload ? extendPayload(basePayload) : basePayload;
      await generateReportMutation.mutate(payload);
    } catch {
      // Error already set in onError or useFileUpload
    }
  };

  const displayError = error ?? fileUpload.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{spec.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={spec.nameField.id}>{spec.nameField.label}</Label>
            <Input
              id={spec.nameField.id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={spec.nameField.placeholder}
              required
            />
          </div>

          {renderExtraFields?.()}

          <div className="space-y-2">
            <Label htmlFor={spec.fileField.id}>{spec.fileField.label}</Label>
            <div className="space-y-2">
              <Input
                id={spec.fileField.id}
                type="file"
                accept={spec.fileField.accept}
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
                onClick={() =>
                  document.getElementById(spec.fileField.id)?.click()
                }
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
                    {spec.fileField.chooseLabel}
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
                ✓ File uploaded successfully and {spec.fileField.readyMessage}
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
                {spec.submit.generatingLabel}
              </>
            ) : (
              spec.submit.idleLabel
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
