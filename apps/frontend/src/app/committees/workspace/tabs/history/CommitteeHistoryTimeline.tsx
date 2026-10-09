"use client";
import React from "react";

import type { HistoryEvent } from "~/lib/validations/committee";
import {
  describeActor,
  describeHistoryEvent,
  describeMember,
} from "./historyModel";

export type CommitteeHistoryTimelineProps = {
  /** Already filtered for the acting role; newest first. */
  events: readonly HistoryEvent[];
  hasMore: boolean;
  /** Acting Admin or above: show staff names, notes and reasons the server sent. */
  showAdminDetail: boolean;
};

function formatInstant(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * **Committee history**: one newest-first timeline of the membership events
 * the audit trail recorded for this committee and term.
 */
export function CommitteeHistoryTimeline({
  events,
  hasMore,
  showAdminDetail,
}: CommitteeHistoryTimelineProps) {
  return (
    <section aria-labelledby="committee-history-heading" className="space-y-2">
      <h3 id="committee-history-heading" className="font-semibold">
        Committee history
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No committee history recorded for this term yet.
        </p>
      ) : (
        <ol aria-label="Committee history, newest first" className="space-y-3">
          {events.map((event) => {
            const view = describeHistoryEvent(event, showAdminDetail);
            return (
              <li
                key={event.id}
                className="border-l-2 border-slate-200 pl-3 text-sm dark:border-slate-700"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <time dateTime={event.at}>{formatInstant(event.at)}</time>
                  {" · "}
                  {describeActor(event.actor, showAdminDetail)}
                </div>
                <div className="font-medium">{view.title}</div>
                <div>{describeMember(event.member)}</div>
                {view.details.length > 0 && (
                  <ul className="text-slate-600 dark:text-slate-300">
                    {view.details.map((line, i) => (
                      <li key={i} className="break-words">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {hasMore && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Showing the most recent events only. Older history for this term is
          not shown here.
        </p>
      )}
    </section>
  );
}
