"use client";

import type * as Ably from "ably";
import { AblyProvider, ChannelProvider, useChannel } from "ably/react";
import { getAblyClient } from "~/lib/ably";

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
          onComplete={onComplete}
          onError={onError}
          channel={channelName}
        />
      </ChannelProvider>
    </AblyProvider>
  );
}

interface ReportStatusSubscriberProps {
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
  channel: string;
}

function ReportStatusSubscriber({
  onComplete,
  onError,
  channel,
}: ReportStatusSubscriberProps) {
  useChannel(channel, (message: Ably.Message) => {
    const data = message.data as {
      jobId: string;
      status: "PROCESSING" | "COMPLETED" | "FAILED";
      url?: string;
      error?: string;
    };

    if (data.status === "COMPLETED" && data.url && onComplete) {
      onComplete(data.url);
    }

    if (data.status === "FAILED" && data.error && onError) {
      onError(data.error);
    }
  });

  return null;
}
