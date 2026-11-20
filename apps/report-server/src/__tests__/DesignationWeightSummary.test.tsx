import React from 'react';
import ReactDOMServer from 'react-dom/server';
import DesignationWeightSummaryReport, {
  formatWeight,
  summaryToRow,
  groupWeightSummaries,
  sumWeights,
  chunkRows,
  paginateWeightSummary,
  missingWeightsNotesHeight,
} from '../components/DesignationWeightSummary';
import type { DesignationWeightSummary } from '../committeeMappingHelpers';


/** A committee with four seats, the first `petitioned` of them petitioned and filled. */
function committee({
  ltedWeight,
  petitioned,
  electionDistrict = 1,
}: {
  ltedWeight: number | null;
  petitioned: number;
  electionDistrict?: number;
}): DesignationWeightSummary {
  const seats = [1, 2, 3, 4].map((seatNumber) => {
    const isPetitioned = seatNumber <= petitioned;
    return {
      seatNumber,
      isPetitioned,
      isOccupied: true,
      occupantMembershipType: 'PETITIONED' as const,
      seatWeight: ltedWeight,
      contributes: isPetitioned && ltedWeight != null,
      contributionWeight: isPetitioned ? (ltedWeight ?? 0) : 0,
    };
  });
  return {
    committeeListId: electionDistrict,
    cityTown: 'ROCHESTER',
    legDistrict: 17,
    electionDistrict,
    ltedWeight,
    totalWeight: (ltedWeight ?? 0) * petitioned,
    totalContributingSeats: ltedWeight != null ? petitioned : 0,
    seats,
    missingWeightSeatNumbers:
      ltedWeight == null ? seats.filter((x) => x.isPetitioned).map((x) => x.seatNumber) : [],
  };
}

describe('DesignationWeightSummary', () => {
  describe('summaryToRow', () => {
    it('derives aggregates from DesignationWeightSummary', () => {
      const s: DesignationWeightSummary = {
        committeeListId: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 2,
        ltedWeight: 1.25,
        totalWeight: 2.5,
        totalContributingSeats: 2,
        seats: [
          {
            seatNumber: 1,
            isPetitioned: true,
            isOccupied: true,
            occupantMembershipType: 'PETITIONED',
            seatWeight: 1.25,
            contributes: true,
            contributionWeight: 1.25,
          },
          {
            seatNumber: 2,
            isPetitioned: true,
            isOccupied: true,
            occupantMembershipType: 'APPOINTED',
            seatWeight: 1.25,
            contributes: true,
            contributionWeight: 1.25,
          },
          {
            seatNumber: 3,
            isPetitioned: true,
            isOccupied: false,
            occupantMembershipType: null,
            seatWeight: 1.25,
            contributes: false,
            contributionWeight: 0,
          },
        ],
        missingWeightSeatNumbers: [],
      };

      const row = summaryToRow(s);

      expect(row.totalSeats).toBe(3);
      expect(row.petitionedSeats).toBe(3);
      expect(row.occupiedPetitioned).toBe(2);
      expect(row.vacantPetitioned).toBe(1);
      expect(row.appointed).toBe(1);
      expect(row.ltedWeight).toBe(1.25);
      // Base weight: per-seat weight x petitioned seats, filled or not.
      expect(row.baseWeight).toBe(3.75);
      expect(row.designationWeight).toBe(2.5);
      expect(row.missingWeights).toBe('');
    });

    it('formats missingWeightSeatNumbers as comma-separated', () => {
      const s: DesignationWeightSummary = {
        committeeListId: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 1,
        ltedWeight: null,
        totalWeight: 0,
        totalContributingSeats: 0,
        seats: [],
        missingWeightSeatNumbers: [1, 3, 5],
      };

      const row = summaryToRow(s);

      expect(row.missingWeights).toBe('1, 3, 5');
    });

    it('has no LTED or base weight when the committee has no LTED weight', () => {
      const row = summaryToRow(committee({ ltedWeight: null, petitioned: 2 }));

      expect(row.ltedWeight).toBeNull();
      expect(row.baseWeight).toBeNull();
    });

    it('gives a zero base weight when no seat is petitioned', () => {
      const row = summaryToRow(committee({ ltedWeight: 128.5, petitioned: 0 }));

      expect(row.ltedWeight).toBe(128.5);
      expect(row.baseWeight).toBe(0);
    });
  });

  describe('groupWeightSummaries', () => {
    it('groups by cityTown and legDistrict with subtotals', () => {
      const summaries: DesignationWeightSummary[] = [
        {
          committeeListId: 1,
          cityTown: 'ROCHESTER',
          legDistrict: 1,
          electionDistrict: 1,
          ltedWeight: null,
          totalWeight: 10,
          totalContributingSeats: 2,
          seats: [],
          missingWeightSeatNumbers: [],
        },
        {
          committeeListId: 2,
          cityTown: 'ROCHESTER',
          legDistrict: 1,
          electionDistrict: 2,
          ltedWeight: null,
          totalWeight: 5,
          totalContributingSeats: 1,
          seats: [],
          missingWeightSeatNumbers: [],
        },
        {
          committeeListId: 3,
          cityTown: 'BRIGHTON',
          legDistrict: 2,
          electionDistrict: 1,
          ltedWeight: null,
          totalWeight: 3,
          totalContributingSeats: 1,
          seats: [],
          missingWeightSeatNumbers: [],
        },
      ];

      const groups = groupWeightSummaries(summaries);

      expect(groups).toHaveLength(2);
      const rochesterGroup = groups.find(
        (g) => g.cityTown === 'ROCHESTER' && g.legDistrict === 1,
      );
      const brightonGroup = groups.find(
        (g) => g.cityTown === 'BRIGHTON' && g.legDistrict === 2,
      );
      expect(rochesterGroup?.subtotalWeight).toBe(15);
      expect(rochesterGroup?.rows).toHaveLength(2);
      expect(brightonGroup?.subtotalWeight).toBe(3);
      expect(brightonGroup?.rows).toHaveLength(1);
    });
  });
  describe('formatWeight', () => {
    it('rounds half up on the decimal digits, not the binary value', () => {
      // (1.005).toFixed(2) is "1.00" because 1.005 is stored as 1.00499...
      expect(formatWeight(1.005)).toBe('1.01');
      expect(formatWeight(128.5)).toBe('128.50');
      expect(formatWeight(0.1 + 0.2)).toBe('0.30');
    });

    it('rounds the base weight from its exact product', () => {
      // 1.005 * 3 is 3.0149999999999997 as a float; the exact product is 3.015.
      const row = summaryToRow(committee({ ltedWeight: 1.005, petitioned: 3 }));
      expect(formatWeight(row.baseWeight!)).toBe('3.02');
    });
  });
  describe('sumWeights', () => {
    it('adds weights exactly, so the total rounds like the rows', () => {
      // 0.501 + 1.134 is 1.6349999999999998 as floats; exactly it is 1.635.
      expect(formatWeight(sumWeights([0.501, 1.134]))).toBe('1.64');
      expect(sumWeights([])).toBe(0);
    });

    it('subtotals each group exactly', () => {
      const [group] = groupWeightSummaries([
        { ...committee({ ltedWeight: null, petitioned: 0, electionDistrict: 1 }), totalWeight: 0.501 },
        { ...committee({ ltedWeight: null, petitioned: 0, electionDistrict: 2 }), totalWeight: 1.134 },
      ]);
      expect(formatWeight(group!.subtotalWeight)).toBe('1.64');
    });
  });
  describe('pagination', () => {
    const range = (n: number) => Array.from({ length: n }, (_, i) => i);
    const sizes = (chunks: unknown[][]) => chunks.map((c) => c.length);
    /** Subtotal + Grand Total, the trailing block on a one-group report without notes. */
    const finalTrailingPx = 25 + 28;

    it.each([
      [19, [19]],
      [20, [20]],
      [21, [20, 1]],
      [40, [20, 20]],
    ])('keeps %i rows with their subtotal and grand total as %j', (n, expected) => {
      expect(sizes(chunkRows(range(n), finalTrailingPx))).toEqual(expected);
    });

    it('returns one empty page when there are no rows', () => {
      expect(chunkRows([], finalTrailingPx)).toEqual([[]]);
    });

    it('carries the last row over when a full last page has no room for the trailing block', () => {
      const tallNotes = 'X'.repeat(110 * 3);
      const trailingPx = finalTrailingPx + missingWeightsNotesHeight(tallNotes);
      expect(sizes(chunkRows(range(20), trailingPx))).toEqual([19, 1]);
      expect(sizes(chunkRows(range(40), trailingPx))).toEqual([20, 19, 1]);
      // A short last page that still fits is left alone.
      expect(sizes(chunkRows(range(25), trailingPx))).toEqual([20, 5]);
    });

    it('numbers pages across groups from the same chunks it renders', () => {
      const group = (n: number) => ({ rows: range(n).map(() => ({}) as never) });
      const pages = paginateWeightSummary([group(20), group(40), group(3)], null);
      expect(pages.map((p) => [p.groupIndex, p.rows.length, p.isGroupEnd, p.isReportEnd])).toEqual([
        [0, 20, true, false],
        [1, 20, false, false],
        [1, 20, true, false],
        [2, 3, true, true],
      ]);
    });

    it('prints "Page N of M" matching the pages it renders', () => {
      const rows = Array.from({ length: 20 }, (_, i) =>
        committee({ ltedWeight: 1, petitioned: 2, electionDistrict: i + 1 }),
      );
      const html = ReactDOMServer.renderToStaticMarkup(
        <DesignationWeightSummaryReport
          groups={groupWeightSummaries(rows)}
          grandTotalWeight={40}
          scopeDescription="ROCHESTER"
          reportAuthor="Test"
          committeesWithMissingWeights={[]}
        />,
      );
      expect(html.match(/Page \d+ of \d+/g)).toEqual(['Page 1 of 1']);
      expect(html).toContain('Subtotal');
      expect(html).toContain('Grand Total: 40.00');
    });
  });
  describe('report', () => {
    const cellsOf = (html: string) =>
      Array.from(html.matchAll(/<tr[^>]*>(.*?)<\/tr>/g), ([, row]) =>
        Array.from(row!.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/g), ([, cell]) => cell),
      );

    it('shows the per-seat LTED weight and the base weight for each ED', () => {
      const groups = groupWeightSummaries([
        committee({ ltedWeight: 128.5, petitioned: 4, electionDistrict: 1 }),
        committee({ ltedWeight: null, petitioned: 2, electionDistrict: 2 }),
      ]);
      const html = ReactDOMServer.renderToStaticMarkup(
        <DesignationWeightSummaryReport
          groups={groups}
          grandTotalWeight={514}
          scopeDescription="ROCHESTER"
          reportAuthor="Test"
          committeesWithMissingWeights={[]}
        />,
      );

      const [header, full, unweighted, subtotal] = cellsOf(html);
      expect(header).toEqual([
        'ED',
        'Total Seats',
        'Petitioned Seats',
        'Occupied Petitioned',
        'Vacant Petitioned',
        'Appointed',
        'LTED Weight',
        'Base Weight',
        'Designation Weight',
        'Missing Weights',
      ]);
      expect(full).toEqual(['001', '4', '4', '4', '0', '0', '128.50', '514.00', '514.00', '—']);
      expect(unweighted?.slice(6, 8)).toEqual(['—', '—']);
      // The subtotal still sits under Designation Weight.
      expect(subtotal?.slice(-2)).toEqual(['514.00', '']);
    });
  });
});
