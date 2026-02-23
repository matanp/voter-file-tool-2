"use client";

import { useState, useCallback } from "react";

interface UseFileUploadConfig {
  endpoint: string;
  maxSize?: number;
}

interface UseFileUploadReturn {
  file: File | null;
  fileKey: string | null;
  isUploading: boolean;
  error: string | null;
  setFile: (file: File | null) => void;
  upload: () => Promise<string>;
  reset: () => void;
}

export function useFileUpload({
  endpoint,
  maxSize,
}: UseFileUploadConfig): UseFileUploadReturn {
  const [file, setFileState] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFile = useCallback(
    (newFile: File | null) => {
      setError(null);
      setFileKey(null);

      if (newFile && maxSize && newFile.size > maxSize) {
        setError(
          `File is too large (${(newFile.size / 1024 / 1024).toFixed(2)} MB). Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)} MB.`,
        );
        setFileState(null);
        return;
      }

      setFileState(newFile);
    },
    [maxSize],
  );

  const upload = useCallback(async (): Promise<string> => {
    if (!file) throw new Error("No file selected");

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const { uploadUrl, fileKey: key } = (await response.json()) as {
        uploadUrl: string;
        fileKey: string;
      };

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "text/plain" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      setFileKey(key);
      return key;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [file, endpoint]);

  const reset = useCallback(() => {
    setFileState(null);
    setFileKey(null);
    setIsUploading(false);
    setError(null);
  }, []);

  return { file, fileKey, isUploading, error, setFile, upload, reset };
}
