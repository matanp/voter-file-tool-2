/**
 * Tests for SRS 1.4 seat utils: assignNextAvailableSeat, ensureSeatsExist, recomputeSeatWeights.
 */

import { Prisma } from "@prisma/client";
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
} from "../../utils/testUtils";

describe("seatUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.committeeGovernanceConfig as { findFirst: jest.Mock }).findFirst =
      jest.fn().mockResolvedValue(createMockGovernanceConfig({ maxSeatsPerLted: 4 }));
  });

  describe("assignNextAvailableSeat", () => {
    it("returns 1 when no seats are occupied", async () => {
      (prismaMock.committeeMembership as { findMany: jest.Mock }).findMany =
        jest.fn().mockResolvedValue([]);

      const result = await assignNextAvailableSeat(1, "term-1");
      expect(result).toBe(1);
    });

    it("returns smallest unused seat when some are occupied", async () => {
      (prismaMock.committeeMembership as { findMany: jest.Mock }).findMany =
        jest.fn().mockResolvedValue([
          createMockMembership({ seatNumber: 1 }),
          createMockMembership({ seatNumber: 3 }),
        ]);

      const result = await assignNextAvailableSeat(1, "term-1");
      expect(result).toBe(2);
    });

    it("throws when all seats are occupied", async () => {
      (prismaMock.committeeMembership as { findMany: jest.Mock }).findMany =
        jest.fn().mockResolvedValue([
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
      (prismaMock.seat as { count: jest.Mock }).count = jest
        .fn()
        .mockResolvedValue(0);
      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockResolvedValue([]);
      (prismaMock.seat as { createMany: jest.Mock }).createMany = jest
        .fn()
        .mockResolvedValue({ count: 4 });

      await ensureSeatsExist(1, "term-1");

      expect((prismaMock.seat as { createMany: jest.Mock }).createMany).toHaveBeenCalledWith(
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

    it("does not create when count already equals maxSeatsPerLted", async () => {
      (prismaMock.seat as { count: jest.Mock }).count = jest
        .fn()
        .mockResolvedValue(4);

      await ensureSeatsExist(1, "term-1");

      expect(prismaMock.seat.createMany).not.toHaveBeenCalled();
    });
  });

  describe("recomputeSeatWeights", () => {
    it("sets weight when ltedWeight is present", async () => {
      const ltedWeight = 128;
      const maxSeatsPerLted = 4; // from createMockGovernanceConfig({ maxSeatsPerLted: 4 })
      const expectedWeight = new Prisma.Decimal(ltedWeight).div(maxSeatsPerLted);

      (prismaMock.committeeList as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue({ ltedWeight });
      (prismaMock.seat as { updateMany: jest.Mock }).updateMany = jest
        .fn()
        .mockResolvedValue({ count: 4 });

      await recomputeSeatWeights(1);

      expect((prismaMock.seat as { updateMany: jest.Mock }).updateMany).toHaveBeenCalledWith(
        expectSeatUpdateMany({
          where: { committeeListId: 1 },
          data: { weight: expectedWeight },
        }),
      );
    });

    it("clears weight when ltedWeight is null", async () => {
      (prismaMock.committeeList as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue({ ltedWeight: null });
      (prismaMock.seat as { updateMany: jest.Mock }).updateMany = jest
        .fn()
        .mockResolvedValue({ count: 4 });

      await recomputeSeatWeights(1);

      expect((prismaMock.seat as { updateMany: jest.Mock }).updateMany).toHaveBeenCalledWith({
        where: { committeeListId: 1 },
        data: { weight: null },
      });
    });

    it("does nothing when committee not found", async () => {
      (prismaMock.committeeList as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue(null);

      await recomputeSeatWeights(999);

      expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
    });
  });
});
