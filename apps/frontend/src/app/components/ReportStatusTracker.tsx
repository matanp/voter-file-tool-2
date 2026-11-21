"use client";

import type * as Ably from "ably";
import { AblyProvider, ChannelProvider, useChannel } from "ably/react";
import { useRef } from "react";
import { getAblyClient } from "~/lib/ably";
import { trackReportStatus } from "~/lib/analytics";

interface ReportStatusTrackerProps {
  reportId: string;
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
}

export function ReportStatusTracker({
  reportId,
  onComplete,
  onError,
}: ReportStatusTrackerProps) {
  const client = getAblyClient();

  // Use a dynamic channel per report
  const channelName = `report-status-${reportId}`;

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={channelName}>
        <ReportStatusSubscriber
          reportId={reportId}
          onComplete={onComplete}
          onError={onError}
          channel={channelName}
        />
      </ChannelProvider>
    </AblyProvider>
  );
}

interface ReportStatusSubscriberProps {
  reportId: string;
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
  channel: string;
}

function ReportStatusSubscriber({
  reportId,
  onComplete,
  onError,
  channel,
}: ReportStatusSubscriberProps) {
  // Record the final status once, even if Ably redelivers it.
  const tracked = useRef(false);
  useChannel(channel, (message: Ably.Message) => {
    const data = message.data as {
      jobId: string;
      status: "PROCESSING" | "COMPLETED" | "FAILED";
      url?: string;
      error?: string;
    };

    if (
      !tracked.current &&
      (data.status === "COMPLETED" || data.status === "FAILED")
    ) {
      tracked.current = true;
      trackReportStatus(reportId, data.status);
    }

    if (data.status === "COMPLETED" && data.url && onComplete) {
      onComplete(data.url);
    }

    if (data.status === "FAILED" && data.error && onError) {
      onError(data.error);
    }
  });

  return null;
}
