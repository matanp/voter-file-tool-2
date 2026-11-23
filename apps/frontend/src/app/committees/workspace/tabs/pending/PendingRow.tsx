/**
 * The compact row the Admin requests page uses for both submissions and
 * Exit Reports, so one list shows one visual language: the person (with seat)
 * and a kind chip plus reported date on the left, decision controls on the
 * right. Extra context (notes, warnings, letter) goes in small lines under the
 * summary. Rows sit in a `divide-y` list; the row draws no border of its own.
 */
import React from "react";

export type PendingRowProps = {
  /** Id for the name line; the row is labelled by it. */
  labelId: string;
  busy: boolean;
  name: string;
  /** Shown after the name as "Seat N"; null shows nothing. */
  seatNumber: number | null;
  chip: React.ReactNode;
  /** The reported/submitted date line, next to the chip. */
  meta: React.ReactNode;
  details?: React.ReactNode;
  /** Decision controls, or the "Confirmed. Updating…" line. */
  actions?: React.ReactNode;
  /** Rendered after the row content, e.g. the decision dialog. */
  children?: React.ReactNode;
};

export function PendingRow({
  labelId,
  busy,
  name,
  seatNumber,
  chip,
  meta,
  details,
  actions,
  children,
}: PendingRowProps) {
  return (
    <li className="px-3 py-2" aria-labelledby={labelId} aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <p id={labelId} className="break-words font-medium">
            {name}
            {seatNumber !== null && (
              <span className="font-normal text-slate-500">
                {" "}
                · Seat {seatNumber}
              </span>
            )}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            {chip}
            <span>{meta}</span>
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {details && (
        <div className="mt-1 space-y-0.5 text-xs text-slate-600 [overflow-wrap:anywhere]">
          {details}
        </div>
      )}
      {children}
    </li>
  );
}
