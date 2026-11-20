import React from 'react';
import { Prisma } from '@prisma/client';
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
  /** Per-seat weight; null when the committee has no LTED weight. */
  ltedWeight: number | null;
  /** Base Weight: LTED weight × petitioned seats, filled or not. */
  baseWeight: number | null;
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
  // Multiplied as a Decimal so the product is exact before it is rounded.
  const baseWeight =
    s.ltedWeight != null
      ? new Prisma.Decimal(s.ltedWeight).times(petitionedSeats).toNumber()
      : null;

  return {
    cityTown: s.cityTown,
    legDistrict: s.legDistrict,
    electionDistrict: s.electionDistrict,
    totalSeats: s.seats.length,
    petitionedSeats,
    occupiedPetitioned,
    vacantPetitioned,
    appointed,
    ltedWeight: s.ltedWeight,
    baseWeight,
    designationWeight: s.totalWeight,
    missingWeights: s.missingWeightSeatNumbers.length > 0
      ? s.missingWeightSeatNumbers.join(', ')
      : '',
  };
}

/**
 * Adds weights as Decimals. Adding the numbers directly brings binary error
 * back (0.501 + 1.134 is 1.6349999999999998, which formats as "1.63").
 */
export function sumWeights(weights: number[]): number {
  return weights
    .reduce((sum, w) => sum.plus(w), new Prisma.Decimal(0))
    .toNumber();
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
    const subtotalWeight = sumWeights(rows.map((r) => r.designationWeight));
    return { cityTown, legDistrict, rows, subtotalWeight };
  });
}

/** Committee rows on a full page. */
export const MAX_ROWS_PER_PAGE = 20;

/*
 * Page geometry, in CSS px, for the fixed 8.5in landscape page. The page has
 * room for the column header, MAX_ROWS_PER_PAGE rows and the footer, plus the
 * space below the rows that the trailing block (Subtotal, Grand Total, notes)
 * needs. Rows are 25px (text-sm 20px line + py-0.5 + 1px border). These are
 * hand-measured: after changing this template's spacing or fonts, re-check
 * the weights-20, weights-200 and weights-multi-group fixtures in the PDF
 * validation harness (apps/report-server/pdf-validation).
 */
const ROW_PX = 25;
/** Space for rows and the trailing block between the column header and the footer. */
const ROW_AREA_PX = 580;
const SUBTOTAL_PX = ROW_PX;
/** `mt-2` + one text-sm line. */
const GRAND_TOTAL_PX = 28;
/** Conservative characters per text-xs line across the 10.33in content width. */
const NOTE_CHARS_PER_LINE = 110;

/** Height of the missing-weights notes under the Grand Total, or 0 when there are none. */
export function missingWeightsNotesHeight(notesText: string | null): number {
  if (!notesText) return 0;
  const lines = Math.max(1, Math.ceil(notesText.length / NOTE_CHARS_PER_LINE));
  // mt-4, the "— indicates" line, mt-1, then the committee list.
  return 16 + 16 + 4 + lines * 16;
}

/**
 * Splits rows into pages of MAX_ROWS_PER_PAGE. The last page also carries a
 * trailing block of `trailingPx`; when its rows plus that block don't fit, its
 * last row moves to a new page with the trailing block, so a footer is never
 * pushed onto a sheet of its own. Always returns at least one (maybe empty) page.
 * Known limit: a trailing block taller than a whole page (missing-weights
 * notes listing hundreds of committees) still overflows.
 */
export function chunkRows<T>(rows: T[], trailingPx: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += MAX_ROWS_PER_PAGE) {
    chunks.push(rows.slice(i, i + MAX_ROWS_PER_PAGE));
  }
  if (chunks.length === 0) return [[]];

  const lastChunkMaxRows = Math.max(
    0,
    Math.floor((ROW_AREA_PX - trailingPx) / ROW_PX),
  );
  const last = chunks[chunks.length - 1];
  if (last.length > lastChunkMaxRows) {
    const carried = Math.min(1, lastChunkMaxRows);
    chunks[chunks.length - 1] = last.slice(0, last.length - carried);
    chunks.push(last.slice(last.length - carried));
  }
  return chunks;
}

export type WeightSummaryPage = {
  groupIndex: number;
  rows: WeightSummaryRow[];
  /** The group's last page: shows the Subtotal row. */
  isGroupEnd: boolean;
  /** The report's last page: also shows the Grand Total and notes. */
  isReportEnd: boolean;
};

/**
 * Lays out every group's pages. Each group starts a new page; page numbers
 * are the index in the returned list, so "Page N of M" matches the sheets.
 */
export function paginateWeightSummary(
  groups: { rows: WeightSummaryRow[] }[],
  notesText: string | null,
): WeightSummaryPage[] {
  return groups.flatMap((group, groupIndex) => {
    const isLastGroup = groupIndex === groups.length - 1;
    const trailingPx =
      SUBTOTAL_PX +
      (isLastGroup ? GRAND_TOTAL_PX + missingWeightsNotesHeight(notesText) : 0);
    const chunks = chunkRows(group.rows, trailingPx);
    return chunks.map((rows, i) => ({
      groupIndex,
      rows,
      isGroupEnd: i === chunks.length - 1,
      isReportEnd: isLastGroup && i === chunks.length - 1,
    }));
  });
}

/**
 * Formats a weight to 2 places, rounding half up on its decimal digits.
 * `Number#toFixed` rounds the binary value instead, so 1.005 would print
 * "1.00". Shared by the PDF and XLSX so both show the same digits.
 */
export const formatWeight = (weight: number): string =>
  new Prisma.Decimal(weight).toFixed(2);

/** The PDF marks a missing weight with a dash; the XLSX leaves the cell blank. */
const formatOptionalWeight = (weight: number | null) =>
  weight != null ? formatWeight(weight) : '—';

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
          Base Weight
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Designation Weight
        </th>
        <th className="border border-gray-400 px-2 py-1 text-left">
          Missing Weights
        </th>
      </tr>
    );

    /** Body and Subtotal cells: py-0.5 keeps 20 rows, the Subtotal, the Grand Total and the footer on one page. */
    const cell = 'border border-gray-400 px-2 py-0.5';

    const renderRow = (row: WeightSummaryRow) => (
      <tr key={`${row.cityTown}-${row.legDistrict}-${row.electionDistrict}`}>
        <td className={cell}>
          {row.electionDistrict.toString().padStart(3, '0')}
        </td>
        <td className={`${cell} text-right`}>
          {row.totalSeats}
        </td>
        <td className={`${cell} text-right`}>
          {row.petitionedSeats}
        </td>
        <td className={`${cell} text-right`}>
          {row.occupiedPetitioned}
        </td>
        <td className={`${cell} text-right`}>
          {row.vacantPetitioned}
        </td>
        <td className={`${cell} text-right`}>
          {row.appointed}
        </td>
        <td className={`${cell} text-right`}>
          {formatOptionalWeight(row.ltedWeight)}
        </td>
        <td className={`${cell} text-right`}>
          {formatOptionalWeight(row.baseWeight)}
        </td>
        <td className={`${cell} text-right`}>
          {formatWeight(row.designationWeight)}
        </td>
        <td className={cell}>
          {row.missingWeights || '—'}
        </td>
      </tr>
    );

    const missingWeightsText =
      committeesWithMissingWeights.length > 0
        ? committeesWithMissingWeights
            .map(
              (c) =>
                `${c.cityTown} LD${c.legDistrict} ED${c.electionDistrict.toString().padStart(3, '0')}`,
            )
            .join('; ')
        : null;
    const pages = paginateWeightSummary(groups, missingWeightsText);

    return (
      <div ref={ref}>
        {pages.map((page, pageIdx) => {
          const group = groups[page.groupIndex];
          // Rochester gets zero-padded LD (domain-specific). Matches CommitteeReport.tsx.
          // TODO: Extract shared helper if this pattern spreads to more report components.
          const groupLabel =
            group.cityTown === 'ROCHESTER'
              ? `City/Town: ${group.cityTown}, Legislative District: ${group.legDistrict.toString().padStart(2, '0')}`
              : `City/Town: ${group.cityTown}, Legislative District: ${group.legDistrict}`;

          return (
            <div
              key={pageIdx}
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
                      {page.rows.map(renderRow)}
                      {page.isGroupEnd && (
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={8} className={`${cell} text-right`}>
                            Subtotal
                          </td>
                          <td className={`${cell} text-right`}>
                            {formatWeight(group.subtotalWeight)}
                          </td>
                          <td className={cell} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {page.isReportEnd && (
                    <div className="mt-2">
                      <div className="text-sm font-semibold">
                        Grand Total: {formatWeight(grandTotalWeight)}
                      </div>
                      {missingWeightsText && (
                        <div className="mt-4 text-xs text-gray-600">
                          <p>
                            — indicates weight data not available for one or
                            more seats
                          </p>
                          <p className="mt-1">
                            Committees with missing weights:{' '}
                            {missingWeightsText}
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
                    Page {pageIdx + 1} of {pages.length}
                  </span>
                </div>
              </div>
              <div className="page-break" />
            </div>
          );
        })}
      </div>
    );
  },
);

DesignationWeightSummaryReport.displayName = 'DesignationWeightSummaryReport';
export default DesignationWeightSummaryReport;
