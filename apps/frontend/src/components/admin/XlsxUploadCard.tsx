"use client";

import React, { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";

type XlsxUploadCardProps<TResponse> = {
  endpoint: string;
  formFieldName: string;
  title: string;
  label: string;
  inputId: string;
  submitLabel?: string;
  loadingLabel?: string;
  accept?: string;
  description?: React.ReactNode;
  lastImported?: string | null;
  noFileMessage?: string;
  noFileDescription?: string;
  invalidTypeMessage?: string;
  renderResult: (data: TResponse) => React.ReactNode;
  onSuccess?: (data: TResponse) => void;
};

/** Reusable admin card for multipart .xlsx import via FormData POST. */
export function XlsxUploadCard<TResponse>({
  endpoint,
  formFieldName,
  title,
  label,
  inputId,
  submitLabel = "Import",
  loadingLabel = "Importing...",
  accept = ".xlsx",
  description,
  lastImported,
  noFileMessage = "No file selected",
  noFileDescription,
  invalidTypeMessage = "Please select an .xlsx file",
  renderResult,
  onSuccess,
}: XlsxUploadCardProps<TResponse>) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TResponse | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const importMutation = useApiMutation<TResponse, FormData>(endpoint, "POST", {
    onSuccess: (data) => {
      setResult(data);
      setFile(null);
      formRef.current?.reset();
      onSuccess?.(data);
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
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
    importMutation.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: noFileMessage,
        description: noFileDescription,
        variant: "destructive",
      });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "Invalid file type",
        description: invalidTypeMessage,
        variant: "destructive",
      });
      return;
    }

    setResult(null);
    const formData = new FormData();
    formData.set(formFieldName, file);

    try {
      await importMutation.mutate(formData);
    } catch {
      // onError callback already handles the user-facing error state.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {description != null && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
        {lastImported !== undefined && (
          <p className="text-sm text-muted-foreground">
            Last imported:{" "}
            {lastImported != null
              ? new Date(lastImported).toLocaleString()
              : "Never"}
          </p>
        )}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={inputId}>{label}</Label>
            <Input
              id={inputId}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={importMutation.loading}
            />
          </div>
          <Button type="submit" disabled={!file || importMutation.loading}>
            {importMutation.loading ? loadingLabel : submitLabel}
          </Button>
        </form>
        {importMutation.error != null && (
          <Alert variant="destructive">
            <AlertDescription>{importMutation.error}</AlertDescription>
          </Alert>
        )}
        {result != null && (
          <Alert>
            <AlertDescription>{renderResult(result)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
