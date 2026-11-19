/**
 * Tests for SRS 1.4 seat utils: assignNextAvailableSeat, ensureSeatsExist, recomputeSeatWeights.
 */

import { Prisma, type CommitteeList, type Seat } from "@prisma/client";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
  recomputeSeatWeights,
} from "~/app/api/lib/seatUtils";
import { prismaMock } from "../../utils/mocks";
import {
  createMockGovernanceConfig,
  createMockMembership,
  expectSeatCreateMany,
  expectSeatUpdateMany,
  selectedRow,
} from "../../utils/testUtils";

type LtedWeightRow = Pick<CommitteeList, "ltedWeight">;
type SeatNumberRow = Pick<Seat, "seatNumber">;

describe("seatUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
    );
  });

  describe("assignNextAvailableSeat", () => {
    it("returns 1 when no seats are occupied", async () => {
      prismaMock.committeeMembership.findMany.mockResolvedValue([]);

      const result = await assignNextAvailableSeat(1, "term-1");
      expect(result).toBe(1);
    });

    it("returns smallest unused seat when some are occupied", async () => {
      prismaMock.committeeMembership.findMany.mockResolvedValue([
        createMockMembership({ seatNumber: 1 }),
        createMockMembership({ seatNumber: 3 }),
      ]);

      const result = await assignNextAvailableSeat(1, "term-1");
      expect(result).toBe(2);
    });

    it("throws when all seats are occupied", async () => {
      prismaMock.committeeMembership.findMany.mockResolvedValue([
        createMockMembership({ seatNumber: 1 }),
        createMockMembership({ seatNumber: 2 }),
        createMockMembership({ seatNumber: 3 }),
        createMockMembership({ seatNumber: 4 }),
      ]);

      await expect(assignNextAvailableSeat(1, "term-1")).rejects.toThrow(
        /All 4 seats are occupied/,
      );
    });
  });

  describe("ensureSeatsExist", () => {
    it("creates seats when count < maxSeatsPerLted", async () => {
      prismaMock.seat.count.mockResolvedValue(0);
      prismaMock.seat.findMany.mockResolvedValue([]);
      prismaMock.seat.createMany.mockResolvedValue({ count: 4 });

      prismaMock.committeeList.findUnique.mockResolvedValue(
        selectedRow<LtedWeightRow>({ ltedWeight: null }),
      );

      await ensureSeatsExist(1, "term-1");

      expect(prismaMock.seat.createMany).toHaveBeenCalledWith(
        expectSeatCreateMany({
          data: [1, 2, 3, 4].map((seatNumber) => ({
            committeeListId: 1,
            termId: "term-1",
            seatNumber,
            isPetitioned: false,
            weight: null,
          })),
        }),
      );
    });

    it("gives new seats the committee's LTED weight, which is the per-seat weight", async () => {
      prismaMock.seat.count.mockResolvedValue(2);
      prismaMock.seat.findMany.mockResolvedValue(
        selectedRow<SeatNumberRow[]>([{ seatNumber: 1 }, { seatNumber: 2 }]),
      );
      prismaMock.seat.createMany.mockResolvedValue({ count: 2 });
      prismaMock.committeeList.findUnique.mockResolvedValue(
        selectedRow<LtedWeightRow>({ ltedWeight: new Prisma.Decimal("128.5") }),
      );

      await ensureSeatsExist(1, "term-1");

      expect(prismaMock.seat.createMany).toHaveBeenCalledWith(
        expectSeatCreateMany({
          data: [3, 4].map((seatNumber) => ({
            committeeListId: 1,
            termId: "term-1",
            seatNumber,
            isPetitioned: false,
            weight: new Prisma.Decimal("128.5"),
          })),
        }),
      );
    });

    it("does not create when count already equals maxSeatsPerLted", async () => {
      prismaMock.seat.count.mockResolvedValue(4);

      await ensureSeatsExist(1, "term-1");

      expect(prismaMock.seat.createMany).not.toHaveBeenCalled();
    });
  });

  describe("recomputeSeatWeights", () => {
    it("sets every seat's weight to the LTED weight, not a share of it", async () => {
      const ltedWeight = 128.5;
      const expectedWeight = new Prisma.Decimal(ltedWeight);

      prismaMock.committeeList.findUnique.mockResolvedValue(
        selectedRow<LtedWeightRow>({
          ltedWeight: new Prisma.Decimal(ltedWeight),
        }),
      );
      prismaMock.seat.updateMany.mockResolvedValue({ count: 4 });

      await recomputeSeatWeights(1);

      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(
        expectSeatUpdateMany({
          where: { committeeListId: 1 },
          data: { weight: expectedWeight },
        }),
      );
    });

    it("clears weight when ltedWeight is null", async () => {
      prismaMock.committeeList.findUnique.mockResolvedValue(
        selectedRow<LtedWeightRow>({ ltedWeight: null }),
      );
      prismaMock.seat.updateMany.mockResolvedValue({ count: 4 });

      await recomputeSeatWeights(1);

      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith({
        where: { committeeListId: 1 },
        data: { weight: null },
      });
    });

    it("does nothing when committee not found", async () => {
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      await recomputeSeatWeights(999);

      expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
    });
  });
});
