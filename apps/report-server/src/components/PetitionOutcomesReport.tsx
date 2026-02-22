import React from 'react';
import type { PetitionOutcomeRow } from '../committeeMappingHelpers';

interface PetitionOutcomesReportProps {
  rows: PetitionOutcomeRow[];
  reportAuthor: string;
}

/** Groups petition outcome rows by committee (cityTown, legDistrict, electionDistrict) */
function groupByCommittee(
  rows: PetitionOutcomeRow[],
): { cityTown: string; legDistrict: number; electionDistrict: number; rows: PetitionOutcomeRow[] }[] {
  const map = new Map<
    string,
    { cityTown: string; legDistrict: number; electionDistrict: number; rows: PetitionOutcomeRow[] }
  >();
  for (const r of rows) {
    const key = `${r.cityTown}|${r.legDistrict}|${r.electionDistrict}`;
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(r);
    } else {
      map.set(key, {
        cityTown: r.cityTown,
        legDistrict: r.legDistrict,
        electionDistrict: r.electionDistrict,
        rows: [r],
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      a.cityTown.localeCompare(b.cityTown) ||
      a.legDistrict - b.legDistrict ||
      a.electionDistrict - b.electionDistrict,
  );
}

function rowBgClass(outcome: PetitionOutcomeRow['outcome']): string {
  if (outcome === 'Won' || outcome === 'Unopposed') return 'bg-green-100';
  if (outcome === 'Tie') return 'bg-amber-100';
  return '';
}

/**
 * Petition outcomes PDF — landscape table grouped by committee.
 * Color: Won/Unopposed = green, Tie = amber, Lost = default.
 */
function PetitionOutcomesReport({ rows, reportAuthor }: PetitionOutcomesReportProps) {
    const groups = groupByCommittee(rows);
    const generationDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div className="w-[11in] min-h-[8.5in] p-6 font-sans bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        <h1 className="text-xl font-bold mb-4">Petition Outcomes Report</h1>
        {groups.map((g) => (
          <div key={`${g.cityTown}-${g.legDistrict}-${g.electionDistrict}`} className="mb-6">
            <h2 className="text-sm font-semibold mb-2">
              City/Town: {g.cityTown}, LD {g.legDistrict}, ED {g.electionDistrict}
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-1 text-right">Seat #</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">Candidate Name</th>
                  <th className="border border-gray-400 px-2 py-1 text-right">Vote Count</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">Outcome</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">Primary Date</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={i} className={rowBgClass(r.outcome)}>
                    <td className="border border-gray-400 px-2 py-1 text-right">{r.seatNumber}</td>
                    <td className="border border-gray-400 px-2 py-1">{r.candidateName}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">
                      {r.voteCount != null ? r.voteCount : '—'}
                    </td>
                    <td className="border border-gray-400 px-2 py-1">{r.outcome}</td>
                    <td className="border border-gray-400 px-2 py-1">{r.primaryDate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="mt-4 flex justify-between text-xs">
          <span>{generationDate}</span>
          <span>{reportAuthor}</span>
        </div>
      </div>
    );
}

PetitionOutcomesReport.displayName = 'PetitionOutcomesReport';
export default PetitionOutcomesReport;
