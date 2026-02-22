import React from 'react';
import type { ChangesReportRow } from '../committeeMappingHelpers';

interface ChangesReportProps {
  rows: ChangesReportRow[];
  dateFrom: string;
  dateTo: string;
  reportAuthor: string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Changes report PDF — table with Date, Member Name, City/Town, LD, ED, Change Type, Details.
 * Grouped by date (descending).
 */
function ChangesReport({ rows, dateFrom, dateTo, reportAuthor }: ChangesReportProps) {
    const byDate = new Map<string, ChangesReportRow[]>();
    for (const r of rows) {
      const list = byDate.get(r.changeDate) ?? [];
      list.push(r);
      byDate.set(r.changeDate, list);
    }
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => (b > a ? 1 : -1));

    const fromFmt = formatDate(dateFrom);
    const toFmt = formatDate(dateTo);
    const generationDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div className="w-[8.5in] min-h-[11in] p-6 font-sans bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        <h1 className="text-xl font-bold mb-2">Committee Changes</h1>
        <p className="text-sm mb-4">
          {fromFmt} — {toFmt}
        </p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-left">Date</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Member Name</th>
              <th className="border border-gray-400 px-2 py-1 text-left">City/Town</th>
              <th className="border border-gray-400 px-2 py-1 text-right">LD</th>
              <th className="border border-gray-400 px-2 py-1 text-right">ED</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Change Type</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedDates.map((dateStr) => {
              const dateRows = (byDate.get(dateStr) ?? []).sort(
                (a, b) =>
                  a.changeType.localeCompare(b.changeType) ||
                  a.memberName.localeCompare(b.memberName),
              );
              const dateFmt = formatDate(dateStr);
              return dateRows.map((r, i) => (
                <tr key={`${dateStr}-${r.memberName}-${r.electionDistrict}-${i}`}>
                  <td className="border border-gray-400 px-2 py-1">{dateFmt}</td>
                  <td className="border border-gray-400 px-2 py-1">{r.memberName}</td>
                  <td className="border border-gray-400 px-2 py-1">{r.cityTown}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right">{r.legDistrict}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right">{r.electionDistrict}</td>
                  <td className="border border-gray-400 px-2 py-1">{r.changeType}</td>
                  <td className="border border-gray-400 px-2 py-1">{r.details}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
        <div className="mt-4 flex justify-between text-xs">
          <span>{generationDate}</span>
          <span>{reportAuthor}</span>
        </div>
      </div>
    );
}

ChangesReport.displayName = 'ChangesReport';
export default ChangesReport;
