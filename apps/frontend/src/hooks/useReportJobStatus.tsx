import { useState, useEffect, useRef } from "react";
import { JobStatus } from "@prisma/client";

interface JobStatusResponse {
  status: JobStatus;
  url: string | null;
}

interface UseReportJobStatusOptions {
  pollInterval?: number; // milliseconds between polls
  maxPolls?: number; // maximum number of polls before giving up
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
}

interface UseReportJobStatusReturn {
  status: JobStatus | null;
  url: string | null;
  isLoading: boolean;
  error: string | null;
  pollCount: number;
}

export function useReportJobStatus(
  reportJobId: string | null,
  options: UseReportJobStatusOptions = {},
): UseReportJobStatusReturn {
  const {
    pollInterval = 2000, // 2 seconds default
    maxPolls = 150, // 5 minutes max (150 * 2s = 300s)
    onComplete,
    onError,
  } = options;

  const [status, setStatus] = useState<JobStatus | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const pollCountRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!reportJobId) {
      setStatus(null);
      setUrl(null);
      setIsLoading(false);
      setError(null);
      setPollCount(0);
      pollCountRef.current = 0;
      return;
    }

    setIsLoading(true);
    setError(null);
    setPollCount(0);
    pollCountRef.current = 0;

    const pollStatus = async () => {
      if (!isMountedRef.current || !reportJobId) return;

      try {
        const response = await fetch(
          `/api/getReportStatus?jobId=${reportJobId}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: JobStatusResponse = await response.json();

        if (!isMountedRef.current) return;

        setStatus(data.status);
        setUrl(data.url);
        setPollCount(pollCountRef.current);

        // Check if job is complete
        if (data.status === JobStatus.COMPLETED) {
          setIsLoading(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (data.url && onComplete) {
            onComplete(data.url);
          }
          return;
        }

        // Check if job failed
        if (data.status === JobStatus.FAILED) {
          setIsLoading(false);
          setError("Report generation failed");
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onError) {
            onError("Report generation failed");
          }
          return;
        }

        // Check if we've exceeded max polls
        pollCountRef.current += 1;
        if (pollCountRef.current >= maxPolls) {
          setIsLoading(false);
          setError(
            "Report generation is taking longer than expected. Please check the Reports page for updates.",
          );
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onError) {
            onError("Report generation timeout");
          }
          return;
        }

        // Continue polling
        setPollCount(pollCountRef.current);
      } catch (err) {
        if (!isMountedRef.current) return;

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        setIsLoading(false);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        if (onError) {
          onError(errorMessage);
        }
      }
    };

    // Start polling immediately
    void pollStatus();

    // Set up interval for continued polling
    intervalRef.current = setInterval(pollStatus, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [reportJobId, pollInterval, maxPolls, onComplete, onError]);

  return {
    status,
    url,
    isLoading,
    error,
    pollCount,
  };
}
