"use client";
/**
 * Meeting records an Admin can accept a submission at. `handleRequest`
 * requires a `meetingRecordId` to accept (rejects need none), so the list is
 * loaded from `GET /api/admin/meetings` (Admin-only, newest first) only once an
 * Admin first opens an accept.
 */
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { formatCalendarDateForDisplay } from "~/lib/dateUtils";

/** The newest meetings offered; older ones are a bulk-review job for Meetings. */
export const MEETING_OPTIONS_LIMIT = 20;

export const MEETINGS_URL = `/api/admin/meetings?limit=${MEETING_OPTIONS_LIMIT}`;

const meetingsResponseSchema = z.object({
  meetings: z.array(
    z.object({
      id: z.string(),
      meetingDate: z.string(),
      meetingType: z.string(),
    }),
  ),
});

export type MeetingOption = { id: string; label: string };

export type MeetingOptionsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; meetings: MeetingOption[] }
  | { status: "error"; error: string };

const MEETING_TYPE_LABELS: Record<string, string> = {
  EXECUTIVE_COMMITTEE: "Executive committee",
  OTHER: "Other meeting",
};

export function meetingLabel(meeting: {
  meetingDate: string;
  meetingType: string;
}): string {
  const type = MEETING_TYPE_LABELS[meeting.meetingType] ?? meeting.meetingType;
  return `${formatCalendarDateForDisplay(meeting.meetingDate)} · ${type}`;
}

export function useMeetingOptions(): MeetingOptionsState & {
  /** Starts the load if it has not started (or retries after a failure). */
  load: () => void;
} {
  const [state, setState] = useState<MeetingOptionsState>({ status: "idle" });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (generation === 0) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    void (async () => {
      try {
        const response = await fetch(MEETINGS_URL, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Could not load meetings (status ${response.status})`);
        }
        const { meetings } = meetingsResponseSchema.parse(await response.json());
        if (controller.signal.aborted) return;
        setState({
          status: "ready",
          meetings: meetings.map((m) => ({ id: m.id, label: meetingLabel(m) })),
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: err instanceof Error ? err.message : "Could not load meetings",
        });
      }
    })();
    return () => controller.abort();
  }, [generation]);

  const status = state.status;
  const load = useCallback(() => {
    if (status === "idle" || status === "error") setGeneration((g) => g + 1);
  }, [status]);

  return { ...state, load };
}
