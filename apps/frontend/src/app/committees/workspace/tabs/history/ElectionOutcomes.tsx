"use client";
import React from "react";
import Link from "next/link";

import type { PetitionOutcomeContext } from "~/lib/validations/committee";
import { electionOutcomeCounts, electionOutcomeRows } from "./historyModel";

export type ElectionOutcomesProps = {
  committeeListId: number;
  termId: string;
  /** `detail.petitionContext`: Admin-only, complete for the term (not capped like history). */
  petitionContext: readonly PetitionOutcomeContext[];
};

/**
 * **Election outcomes**: every petition candidate's primary result for this
 * committee and term. Admin-only; the caller renders it only for an acting
 * Admin and only when the server sent `petitionContext`.
 */
export function ElectionOutcomes({
  committeeListId,
  termId,
  petitionContext,
}: ElectionOutcomesProps) {
  const rows = electionOutcomeRows(petitionContext);
  const counts = electionOutcomeCounts(rows);
  const href = `/admin/petition-outcomes?${new URLSearchParams({
    committeeListId: String(committeeListId),
    termId,
  }).toString()}`;

  return (
    <section aria-labelledby="election-outcomes-heading" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="election-outcomes-heading" className="font-semibold">
          Election outcomes
        </h3>
        <Link href={href} className="text-sm underline underline-offset-2">
          Open in petition outcomes
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No election outcomes recorded for this committee this term.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {counts.won} won · {counts.lost} lost · {counts.tie} tied
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Election outcomes by petition seat
              </caption>
              <thead className="text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">Seat</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Candidate</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Result</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Votes</th>
                  <th scope="col" className="py-1 font-medium">Primary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    <td className="py-1 pr-3 tabular-nums">{r.seat ?? "—"}</td>
                    <td className="py-1 pr-3">{r.candidate}</td>
                    <td className="py-1 pr-3">{r.outcome}</td>
                    <td className="py-1 pr-3 tabular-nums">{r.votes ?? "—"}</td>
                    <td className="py-1 whitespace-nowrap">{r.primaryDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
