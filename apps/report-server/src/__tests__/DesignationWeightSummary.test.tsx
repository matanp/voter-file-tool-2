import {
  summaryToRow,
  groupWeightSummaries,
} from '../components/DesignationWeightSummary';
import type { DesignationWeightSummary } from '../committeeMappingHelpers';

describe('DesignationWeightSummary', () => {
  describe('summaryToRow', () => {
    it('derives aggregates from DesignationWeightSummary', () => {
      const s: DesignationWeightSummary = {
        committeeListId: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 2,
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
            seatWeight: 1,
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
      expect(row.ltedWeight).toBe(3.5);
      expect(row.designationWeight).toBe(2.5);
      expect(row.missingWeights).toBe('');
    });

    it('formats missingWeightSeatNumbers as comma-separated', () => {
      const s: DesignationWeightSummary = {
        committeeListId: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 1,
        totalWeight: 0,
        totalContributingSeats: 0,
        seats: [],
        missingWeightSeatNumbers: [1, 3, 5],
      };

      const row = summaryToRow(s);

      expect(row.missingWeights).toBe('1, 3, 5');
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
});
