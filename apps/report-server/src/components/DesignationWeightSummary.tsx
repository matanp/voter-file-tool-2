import React from 'react';
import type { DesignationWeightSummary } from '../committeeMappingHelpers';

/** Row-ready summary with derived aggregates for report display */
export type WeightSummaryRow = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  totalSeats: number;
  petitionedSeats: number;
  occupiedPetitioned: number;
  vacantPetitioned: number;
  appointed: number;
  ltedWeight: number;
  designationWeight: number;
  missingWeights: string;
};

/** Group of committees by cityTown + legDistrict */
export type WeightSummaryGroup = {
  cityTown: string;
  legDistrict: number;
  rows: WeightSummaryRow[];
  subtotalWeight: number;
};

interface DesignationWeightSummaryReportProps {
  groups: WeightSummaryGroup[];
  grandTotalWeight: number;
  scopeDescription: string;
  reportAuthor: string;
  committeesWithMissingWeights: { cityTown: string; legDistrict: number; electionDistrict: number }[];
}

/**
 * Derives row aggregates from DesignationWeightSummary.
 */
export function summaryToRow(s: DesignationWeightSummary): WeightSummaryRow {
  const petitionedSeats = s.seats.filter((x) => x.isPetitioned).length;
  const occupiedPetitioned = s.seats.filter(
    (x) => x.isPetitioned && x.isOccupied,
  ).length;
  const vacantPetitioned = petitionedSeats - occupiedPetitioned;
  const appointed = s.seats.filter(
    (x) => x.occupantMembershipType === 'APPOINTED',
  ).length;
  const ltedWeight = s.seats
    .filter((x) => x.isPetitioned && x.seatWeight != null)
    .reduce((sum, x) => sum + (x.seatWeight ?? 0), 0);

  return {
    cityTown: s.cityTown,
    legDistrict: s.legDistrict,
    electionDistrict: s.electionDistrict,
    totalSeats: s.seats.length,
    petitionedSeats,
    occupiedPetitioned,
    vacantPetitioned,
    appointed,
    ltedWeight,
    designationWeight: s.totalWeight,
    missingWeights: s.missingWeightSeatNumbers.length > 0
      ? s.missingWeightSeatNumbers.join(', ')
      : '',
  };
}

/**
 * Groups DesignationWeightSummary[] by (cityTown, legDistrict) and computes subtotals.
 */
export function groupWeightSummaries(
  summaries: DesignationWeightSummary[],
): WeightSummaryGroup[] {
  const map = new Map<string, WeightSummaryRow[]>();

  for (const s of summaries) {
    const key = `${s.cityTown}|${s.legDistrict}`;
    const row = summaryToRow(s);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([key, rows]) => {
    const [cityTown, legStr] = key.split('|');
    const legDistrict = Number.parseInt(legStr ?? '0', 10);
    const subtotalWeight = rows.reduce((sum, r) => sum + r.designationWeight, 0);
    return { cityTown, legDistrict, rows, subtotalWeight };
  });
}

const MAX_ROWS_PER_PAGE = 20;

const DesignationWeightSummaryReport = React.forwardRef<
  HTMLDivElement,
  DesignationWeightSummaryReportProps
>(
  (
    {
      groups,
      grandTotalWeight,
      scopeDescription,
      reportAuthor,
      committeesWithMissingWeights,
    },
    ref,
  ) => {
    const generationDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const headerTitle = `Designation Weight Summary — ${scopeDescription} — ${generationDate}`;

    const colHeader = (
      <tr className="bg-gray-100">
        <th className="border border-gray-400 px-2 py-1 text-left">ED</th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Total Seats
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Petitioned Seats
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Occupied Petitioned
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Vacant Petitioned
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Appointed
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          LTED Weight
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Designation Weight
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Missing Weights
        </th>
      </tr>
    );

    const renderRow = (row: WeightSummaryRow) => (
      <tr key={`${row.cityTown}-${row.legDistrict}-${row.electionDistrict}`}>
        <td className="border border-gray-400 px-2 py-1">
          {row.electionDistrict.toString().padStart(3, '0')}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {row.totalSeats}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {row.petitionedSeats}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {row.occupiedPetitioned}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {row.vacantPetitioned}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {row.appointed}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {row.ltedWeight.toFixed(2)}
        </td>
        <td className="border border-gray-400 px-2 py-1 text-right">
          {row.designationWeight.toFixed(2)}
        </td>
        <td className="border border-gray-400 px-2 py-1">
          {row.missingWeights || '—'}
        </td>
      </tr>
    );

    return (
      <div ref={ref}>
        {groups.map((group, groupIdx) => {
          // Rochester gets zero-padded LD (domain-specific). Matches CommitteeReport.tsx.
          // TODO: Extract shared helper if this pattern spreads to more report components.
          const groupLabel =
            group.cityTown === 'ROCHESTER'
              ? `City/Town: ${group.cityTown}, Legislative District: ${group.legDistrict.toString().padStart(2, '0')}`
              : `City/Town: ${group.cityTown}, Legislative District: ${group.legDistrict}`;

          const rows = group.rows;
          const pageChunks: WeightSummaryRow[][] = [];
          for (let i = 0; i < rows.length; i += MAX_ROWS_PER_PAGE) {
            pageChunks.push(rows.slice(i, i + MAX_ROWS_PER_PAGE));
          }
          if (pageChunks.length === 0) pageChunks.push([]);

          return pageChunks.map((chunk, pageIdx) => (
            <div
              key={`${groupIdx}-${pageIdx}`}
              className="w-[11in] h-[8.5in] p-8 font-sans bg-white mx-auto"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <div className="flex flex-col h-full">
                <div>
                  <h2 className="text-center text-lg font-black pt-4">
                    {headerTitle}
                  </h2>
                  <h3 className="text-base font-semibold mt-4 mb-2">
                    {groupLabel}
                  </h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>{colHeader}</thead>
                    <tbody>
                      {chunk.map(renderRow)}
                      {pageIdx === pageChunks.length - 1 && (
                        <tr className="bg-gray-50 font-semibold">
                          <td
                            colSpan={7}
                            className="border border-gray-400 px-2 py-1 text-right"
                          >
                            Subtotal
                          </td>
                          <td className="border border-gray-400 px-2 py-1 text-right">
                            {group.subtotalWeight.toFixed(2)}
                          </td>
                          <td className="border border-gray-400 px-2 py-1" />
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {groupIdx === groups.length - 1 &&
                    pageIdx === pageChunks.length - 1 && (
                      <div className="mt-2">
                        <div className="text-sm font-semibold">
                          Grand Total: {grandTotalWeight.toFixed(2)}
                        </div>
                        {committeesWithMissingWeights.length > 0 && (
                          <div className="mt-4 text-xs text-gray-600">
                            <p>
                              — indicates weight data not available for one or
                              more seats
                            </p>
                            <p className="mt-1">
                              Committees with missing weights:{' '}
                              {committeesWithMissingWeights
                                .map(
                                  (c) =>
                                    `${c.cityTown} LD${c.legDistrict} ED${c.electionDistrict.toString().padStart(3, '0')}`,
                                )
                                .join('; ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                </div>
                <div className="mt-auto pt-4 flex w-full text-xs justify-between">
                  <span>{generationDate}</span>
                  <span>{reportAuthor}</span>
                  <span>
                    Page{' '}
                    {groups
                      .slice(0, groupIdx)
                      .reduce(
                        (acc, g) =>
                          acc +
                          Math.ceil(g.rows.length / MAX_ROWS_PER_PAGE),
                        0,
                      ) +
                      pageIdx +
                      1}{' '}
                    of{' '}
                    {groups.reduce(
                      (acc, g) =>
                        acc + Math.ceil(g.rows.length / MAX_ROWS_PER_PAGE),
                      0,
                    )}
                  </span>
                </div>
              </div>
              <div className="page-break" />
            </div>
          ));
        })}
      </div>
    );
  },
);

DesignationWeightSummaryReport.displayName = 'DesignationWeightSummaryReport';
export default DesignationWeightSummaryReport;
