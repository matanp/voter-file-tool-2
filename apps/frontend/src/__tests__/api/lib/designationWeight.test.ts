/**
 * SRS 2.7 — Unit tests for calculateDesignationWeight.
 */

import { Prisma } from "@prisma/client";
import { calculateDesignationWeight } from "~/lib/designationWeight";
import { prismaMock } from "../../utils/mocks";
import { DEFAULT_ACTIVE_TERM_ID } from "../../utils/testUtils";

/** Helper to build a mock Seat record. */
function mockSeat(overrides: {
  seatNumber: number;
  isPetitioned?: boolean;
  weight?: number | null;
}) {
  return {
    id: `seat-${String(overrides.seatNumber)}`,
    committeeListId: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    seatNumber: overrides.seatNumber,
    isPetitioned: overrides.isPetitioned ?? false,
    weight:
      overrides.weight != null
        ? new Prisma.Decimal(overrides.weight)
        : null,
  };
}

/** Helper to build a mock active membership on a seat. */
function mockActiveMembership(overrides: {
  seatNumber: number;
  membershipType?: "PETITIONED" | "APPOINTED";
  voterRecordId?: string;
}) {
  return {
    seatNumber: overrides.seatNumber,
    membershipType: overrides.membershipType ?? "PETITIONED",
    voterRecordId: overrides.voterRecordId ?? `voter-${String(overrides.seatNumber)}`,
  };
}

type SeatMock = { findMany: jest.Mock };
type MembershipMock = { findMany: jest.Mock };

function getSeatMock(): SeatMock {
  return prismaMock.seat as unknown as SeatMock;
}

function getMembershipMock(): MembershipMock {
  return (prismaMock as unknown as { committeeMembership: MembershipMock })
    .committeeMembership;
}

describe("calculateDesignationWeight", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns total 0 when no petitioned seats exist", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: false, weight: 0.25 }),
      mockSeat({ seatNumber: 2, isPetitioned: false, weight: 0.25 }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([
      mockActiveMembership({ seatNumber: 1 }),
    ]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    expect(result.totalWeight).toBe(0);
    expect(result.totalContributingSeats).toBe(0);
    expect(result.seats).toHaveLength(2);
    for (const seat of result.seats) {
      expect(seat.contributes).toBe(false);
    }
  });

  it("contributes weight for petitioned + occupied seats", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
      mockSeat({ seatNumber: 2, isPetitioned: true, weight: 0.25 }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([
      mockActiveMembership({ seatNumber: 1, membershipType: "PETITIONED" }),
      mockActiveMembership({ seatNumber: 2, membershipType: "PETITIONED" }),
    ]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    expect(result.totalWeight).toBe(0.5);
    expect(result.totalContributingSeats).toBe(2);
    expect(result.seats[0]?.contributes).toBe(true);
    expect(result.seats[0]?.contributionWeight).toBe(0.25);
    expect(result.seats[1]?.contributes).toBe(true);
    expect(result.seats[1]?.contributionWeight).toBe(0.25);
  });

  it("returns zero contribution for petitioned + vacant seats", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
      mockSeat({ seatNumber: 2, isPetitioned: true, weight: 0.25 }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    expect(result.totalWeight).toBe(0);
    expect(result.totalContributingSeats).toBe(0);
    for (const seat of result.seats) {
      expect(seat.contributes).toBe(false);
      expect(seat.contributionWeight).toBe(0);
      expect(seat.isOccupied).toBe(false);
    }
  });

  it("returns zero contribution for non-petitioned + occupied seats", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: false, weight: 0.25 }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([
      mockActiveMembership({ seatNumber: 1, membershipType: "APPOINTED" }),
    ]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    expect(result.totalWeight).toBe(0);
    expect(result.seats[0]?.isPetitioned).toBe(false);
    expect(result.seats[0]?.isOccupied).toBe(true);
    expect(result.seats[0]?.contributes).toBe(false);
  });

  it("contributes weight for appointed occupant in petitioned seat", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.5 }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([
      mockActiveMembership({ seatNumber: 1, membershipType: "APPOINTED" }),
    ]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    expect(result.totalWeight).toBe(0.5);
    expect(result.totalContributingSeats).toBe(1);
    expect(result.seats[0]?.occupantMembershipType).toBe("APPOINTED");
    expect(result.seats[0]?.contributes).toBe(true);
    expect(result.seats[0]?.contributionWeight).toBe(0.5);
  });

  it("excludes petitioned seats with null weight and reports metadata", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: true, weight: null }),
      mockSeat({ seatNumber: 2, isPetitioned: true, weight: 0.25 }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([
      mockActiveMembership({ seatNumber: 1 }),
      mockActiveMembership({ seatNumber: 2 }),
    ]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    expect(result.totalWeight).toBe(0.25);
    expect(result.totalContributingSeats).toBe(1);
    expect(result.missingWeightSeatNumbers).toEqual([1]);
    expect(result.seats[0]?.seatWeight).toBeNull();
    expect(result.seats[0]?.contributes).toBe(false);
  });

  it("throws on duplicate active memberships for the same seat", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([
      mockActiveMembership({
        seatNumber: 1,
        voterRecordId: "voter-a",
      }),
      mockActiveMembership({
        seatNumber: 1,
        voterRecordId: "voter-b",
      }),
    ]);

    await expect(
      calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID),
    ).rejects.toThrow(/Data integrity error.*duplicate active memberships.*seat 1/);
  });

  it("handles mixed scenario: some petitioned, some not, some vacant", async () => {
    getSeatMock().findMany.mockResolvedValue([
      mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
      mockSeat({ seatNumber: 2, isPetitioned: false, weight: 0.25 }),
      mockSeat({ seatNumber: 3, isPetitioned: true, weight: 0.25 }),
      mockSeat({ seatNumber: 4, isPetitioned: true, weight: null }),
    ]);
    getMembershipMock().findMany.mockResolvedValue([
      mockActiveMembership({ seatNumber: 1, membershipType: "PETITIONED" }),
      mockActiveMembership({ seatNumber: 2, membershipType: "APPOINTED" }),
      // seat 3 vacant, seat 4 also vacant
    ]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    // Only seat 1 contributes (petitioned + occupied)
    expect(result.totalWeight).toBe(0.25);
    expect(result.totalContributingSeats).toBe(1);
    expect(result.missingWeightSeatNumbers).toEqual([4]);

    // Seat 1: petitioned + occupied => contributes
    expect(result.seats[0]?.contributes).toBe(true);
    // Seat 2: not petitioned => doesn't contribute
    expect(result.seats[1]?.contributes).toBe(false);
    // Seat 3: petitioned + vacant => doesn't contribute
    expect(result.seats[2]?.contributes).toBe(false);
    expect(result.seats[2]?.isOccupied).toBe(false);
    // Seat 4: petitioned + null weight => doesn't contribute
    expect(result.seats[3]?.contributes).toBe(false);
  });

  it("defaults to active term when termId is not provided", async () => {
    getSeatMock().findMany.mockResolvedValue([]);
    getMembershipMock().findMany.mockResolvedValue([]);

    const result = await calculateDesignationWeight(1);

    expect(result.totalWeight).toBe(0);
    expect(result.seats).toHaveLength(0);
    // Verify it queried with the default active term
    expect(getSeatMock().findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { committeeListId: 1, termId: DEFAULT_ACTIVE_TERM_ID },
      }) as unknown,
    );
  });

  it("returns empty seats array when no seats exist", async () => {
    getSeatMock().findMany.mockResolvedValue([]);
    getMembershipMock().findMany.mockResolvedValue([]);

    const result = await calculateDesignationWeight(1, DEFAULT_ACTIVE_TERM_ID);

    expect(result.totalWeight).toBe(0);
    expect(result.totalContributingSeats).toBe(0);
    expect(result.seats).toHaveLength(0);
    expect(result.missingWeightSeatNumbers).toEqual([]);
  });
});
