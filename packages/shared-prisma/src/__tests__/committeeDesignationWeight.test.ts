/**
 * Unit tests for the shared designation-weight engine.
 */
import { Prisma } from '@prisma/client';
import {
  computeDesignationWeight,
  indexActiveMembershipsBySeat,
} from '../committeeDesignationWeight';

const CONTEXT = { committeeListId: 42, termId: 'term-2025' };

function seat(
  seatNumber: number,
  overrides: { isPetitioned?: boolean; weight?: number | null } = {},
) {
  return {
    seatNumber,
    isPetitioned: overrides.isPetitioned ?? false,
    weight:
      overrides.weight != null ? new Prisma.Decimal(overrides.weight) : null,
  };
}

function membership(
  seatNumber: number | null,
  membershipType: string | null = 'PETITIONED',
) {
  return { seatNumber, membershipType };
}

describe('indexActiveMembershipsBySeat', () => {
  it('skips memberships with null seatNumber', () => {
    const map = indexActiveMembershipsBySeat([
      membership(null, 'PETITIONED'),
      membership(1, 'APPOINTED'),
    ]);
    expect(map.size).toBe(1);
    expect(map.get(1)?.membershipType).toBe('APPOINTED');
  });

  it('throws a deterministic error for duplicate seat assignments', () => {
    expect(() =>
      indexActiveMembershipsBySeat(
        [membership(2, 'PETITIONED'), membership(2, 'APPOINTED')],
        CONTEXT,
      ),
    ).toThrow(
      'Data integrity error: duplicate active memberships on seat 2 for committee 42 term term-2025',
    );
  });
});

describe('computeDesignationWeight', () => {
  it('returns zero when no petitioned seats exist', () => {
    const result = computeDesignationWeight({
      seats: [
        seat(1, { isPetitioned: false, weight: 0.25 }),
        seat(2, { isPetitioned: false, weight: 0.25 }),
      ],
      memberships: [membership(1, 'PETITIONED')],
      context: CONTEXT,
    });

    expect(result.totalWeight).toBe(0);
    expect(result.totalContributingSeats).toBe(0);
    expect(result.missingWeightSeatNumbers).toEqual([]);
    for (const row of result.seats) {
      expect(row.contributes).toBe(false);
    }
  });

  it('contributes weight for petitioned and occupied seats', () => {
    const result = computeDesignationWeight({
      seats: [
        seat(1, { isPetitioned: true, weight: 0.25 }),
        seat(2, { isPetitioned: true, weight: 0.25 }),
      ],
      memberships: [
        membership(1, 'PETITIONED'),
        membership(2, 'APPOINTED'),
      ],
      context: CONTEXT,
    });

    expect(result.totalWeight).toBe(0.5);
    expect(result.totalContributingSeats).toBe(2);
    expect(result.seats[0]).toMatchObject({
      seatNumber: 1,
      contributes: true,
      contributionWeight: 0.25,
      occupantMembershipType: 'PETITIONED',
    });
    expect(result.seats[1]).toMatchObject({
      seatNumber: 2,
      contributes: true,
      contributionWeight: 0.25,
      occupantMembershipType: 'APPOINTED',
    });
  });

  it('returns zero contribution for petitioned but vacant seats', () => {
    const result = computeDesignationWeight({
      seats: [seat(1, { isPetitioned: true, weight: 0.25 })],
      memberships: [],
      context: CONTEXT,
    });

    expect(result.totalWeight).toBe(0);
    expect(result.totalContributingSeats).toBe(0);
    expect(result.seats[0]).toMatchObject({
      isOccupied: false,
      contributes: false,
      contributionWeight: 0,
    });
  });

  it('tracks petitioned seats with null weight in missingWeightSeatNumbers', () => {
    const result = computeDesignationWeight({
      seats: [
        seat(1, { isPetitioned: true, weight: null }),
        seat(2, { isPetitioned: true, weight: 0.25 }),
      ],
      memberships: [membership(2, 'PETITIONED')],
      context: CONTEXT,
    });

    expect(result.missingWeightSeatNumbers).toEqual([1]);
    expect(result.totalWeight).toBe(0.25);
    expect(result.seats[0]).toMatchObject({
      seatNumber: 1,
      seatWeight: null,
      contributes: false,
    });
  });

  it('normalizes unknown membership types to null occupantMembershipType', () => {
    const result = computeDesignationWeight({
      seats: [seat(1, { isPetitioned: true, weight: 0.25 })],
      memberships: [membership(1, 'UNKNOWN')],
      context: CONTEXT,
    });

    expect(result.seats[0]?.occupantMembershipType).toBeNull();
    expect(result.seats[0]?.contributes).toBe(true);
  });

  it('sorts seats by seatNumber regardless of input order', () => {
    const result = computeDesignationWeight({
      seats: [
        seat(3, { isPetitioned: true, weight: 0.25 }),
        seat(1, { isPetitioned: true, weight: 0.25 }),
      ],
      memberships: [membership(1, 'PETITIONED')],
      context: CONTEXT,
    });

    expect(result.seats.map((s) => s.seatNumber)).toEqual([1, 3]);
  });

  it('reuses a pre-indexed seatOccupants map when provided', () => {
    const seatOccupants = new Map([
      [1, { seatNumber: 1, membershipType: 'PETITIONED' as const }],
    ]);

    const result = computeDesignationWeight({
      seats: [seat(1, { isPetitioned: true, weight: 0.25 })],
      memberships: [],
      seatOccupants,
      context: CONTEXT,
    });

    expect(result.totalWeight).toBe(0.25);
    expect(result.seats[0]?.isOccupied).toBe(true);
  });

  it('throws when duplicate seats are present and no prebuilt map is supplied', () => {
    expect(() =>
      computeDesignationWeight({
        seats: [seat(1, { isPetitioned: true, weight: 0.25 })],
        memberships: [
          membership(1, 'PETITIONED'),
          membership(1, 'APPOINTED'),
        ],
        context: CONTEXT,
      }),
    ).toThrow(/Data integrity error/);
  });
});
