"use client";
/**
 * Per-seat designation-weight breakdown (occupancy verification): for each
 * seat, whether it is petitioned and occupied, its weight, and what it
 * contributes. Values come from the server's `designationWeightSummary`.
 */
import React from "react";

import type { DesignationWeightSummary } from "~/lib/validations/committee";
import { seatBreakdownRow } from "./seatsWeightDisplay";

export function SeatWeightBreakdown({ summary }: { summary: DesignationWeightSummary }) {
  if (summary.seats.length === 0) {
    return <p className="text-slate-500">This committee has no seats yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-[640px] border text-left text-sm">
        <caption className="sr-only">Designation weight by seat</caption>
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th scope="col" className="px-2 py-1 font-medium">Seat</th>
            <th scope="col" className="px-2 py-1 font-medium">Petitioned</th>
            <th scope="col" className="px-2 py-1 font-medium">Occupied</th>
            <th scope="col" className="px-2 py-1 font-medium">Seat weight</th>
            <th scope="col" className="px-2 py-1 font-medium">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {summary.seats.map((seat) => {
            const row = seatBreakdownRow(seat);
            return (
              <tr key={row.seatNumber} className="border-t">
                <td className="px-2 py-1">{row.seatNumber}</td>
                <td className="px-2 py-1">{row.petitioned}</td>
                <td className="px-2 py-1">{row.occupied}</td>
                <td className="px-2 py-1">{row.seatWeight}</td>
                <td className="px-2 py-1">{row.contribution}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
