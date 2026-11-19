import React from 'react';
import ReactDOMServer from 'react-dom/server';
import DesignationWeightSummaryReport, {
  summaryToRow,
  groupWeightSummaries,
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
