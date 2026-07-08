/**
 * Unit tests for active-term seat reconciliation when maxSeatsPerLted changes.
 */

import { MembershipStatus, Prisma } from "@prisma/client";
import {
  reconcileSeatsForMaxSeatsChange,
  SeatDecreaseConflictError,
} from "~/app/api/lib/seatReconciliation";
import { prismaMock } from "../../utils/mocks";
import {
  createMockGovernanceConfig,
  DEFAULT_ACTIVE_TERM_ID,
  expectSeatCreateMany,
  expectSeatUpdateMany,
} from "../../utils/testUtils";

const HISTORICAL_TERM_ID = "term-historical-2022-2024";

type CommitteeListRow = {
  id: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

type SeatRow = {
  id: string;
  committeeListId: number;
  termId: string;
  seatNumber: number;
  isPetitioned: boolean;
  weight: Prisma.Decimal | null;
};

type MembershipRow = {
  committeeListId: number;
  termId: string;
  status: MembershipStatus;
  seatNumber: number | null;
  committeeList?: CommitteeListRow;
};

function setupCommitteeListMock(committees: CommitteeListRow[]): void {
  (prismaMock.committeeList as { findMany: jest.Mock }).findMany = jest
    .fn()
    .mockResolvedValue(committees.map(({ id }) => ({ id })));
  (prismaMock.committeeList as { findUnique: jest.Mock }).findUnique = jest
    .fn()
    .mockImplementation(async ({ where }: { where: { id: number } }) => {
      const committee = committees.find((row) => row.id === where.id);
      return committee ? { ltedWeight: 128 } : null;
    });
}

function setupGovernanceConfigMock(maxSeatsPerLted: number): void {
  (prismaMock.committeeGovernanceConfig as { findFirst: jest.Mock }).findFirst =
    jest
      .fn()
      .mockResolvedValue(createMockGovernanceConfig({ maxSeatsPerLted }));
}

describe("seatReconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupGovernanceConfigMock(4);
    (prismaMock.seat as { updateMany: jest.Mock }).updateMany = jest
      .fn()
      .mockResolvedValue({ count: 4 });
  });

  describe("reconcileSeatsForMaxSeatsChange increase", () => {
    it("4 -> 6 creates seats 5 and 6 for committees missing them", async () => {
      const committees = [{ id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 1 }];
      setupCommitteeListMock(committees);

      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockResolvedValue(
          [1, 2, 3, 4].map((seatNumber) => ({
            committeeListId: 1,
            termId: DEFAULT_ACTIVE_TERM_ID,
            seatNumber,
          })),
        );
      (prismaMock.seat as { createMany: jest.Mock }).createMany = jest
        .fn()
        .mockResolvedValue({ count: 2 });

      const summary = await reconcileSeatsForMaxSeatsChange(prismaMock, {
        termId: DEFAULT_ACTIVE_TERM_ID,
        oldMaxSeats: 4,
        newMaxSeats: 6,
      });

      expect(summary).toEqual({
        direction: "increase",
        committeeCount: 1,
        createdSeatCount: 2,
        deletedSeatCount: 0,
        recomputedCommitteeCount: 1,
      });
      expect(
        (prismaMock.seat as { createMany: jest.Mock }).createMany,
      ).toHaveBeenCalledWith(
        expectSeatCreateMany({
          data: [
            {
              committeeListId: 1,
              termId: DEFAULT_ACTIVE_TERM_ID,
              seatNumber: 5,
              isPetitioned: false,
              weight: null,
            },
            {
              committeeListId: 1,
              termId: DEFAULT_ACTIVE_TERM_ID,
              seatNumber: 6,
              isPetitioned: false,
              weight: null,
            },
          ],
        }),
      );
    });

    it("4 -> 6 fills gaps when seats 1, 2, and 4 exist", async () => {
      setupCommitteeListMock([
        { id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 1 },
      ]);

      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockResolvedValue(
          [1, 2, 4].map((seatNumber) => ({
            committeeListId: 1,
            termId: DEFAULT_ACTIVE_TERM_ID,
            seatNumber,
          })),
        );
      (prismaMock.seat as { createMany: jest.Mock }).createMany = jest
        .fn()
        .mockResolvedValue({ count: 3 });

      await reconcileSeatsForMaxSeatsChange(prismaMock, {
        termId: DEFAULT_ACTIVE_TERM_ID,
        oldMaxSeats: 4,
        newMaxSeats: 6,
      });

      expect(
        (prismaMock.seat as { createMany: jest.Mock }).createMany,
      ).toHaveBeenCalledWith(
        expectSeatCreateMany({
          data: [
            {
              committeeListId: 1,
              termId: DEFAULT_ACTIVE_TERM_ID,
              seatNumber: 3,
            },
            {
              committeeListId: 1,
              termId: DEFAULT_ACTIVE_TERM_ID,
              seatNumber: 5,
            },
            {
              committeeListId: 1,
              termId: DEFAULT_ACTIVE_TERM_ID,
              seatNumber: 6,
            },
          ],
        }),
      );
    });
  });

  describe("reconcileSeatsForMaxSeatsChange decrease blockers", () => {
    function setupDecreaseMocks(
      memberships: MembershipRow[],
      seats: SeatRow[] = [],
    ): void {
      setupCommitteeListMock([
        { id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 1 },
      ]);

      (prismaMock.committeeMembership as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockImplementation(
          async ({
            where,
          }: {
            where: {
              termId?: string;
              status?: MembershipStatus;
              seatNumber?: { gt?: number; not?: null };
            };
          }) => {
            let rows = memberships;
            if (where.termId) {
              rows = rows.filter((row) => row.termId === where.termId);
            }
            if (where.status) {
              rows = rows.filter((row) => row.status === where.status);
            }
            if (where.seatNumber?.gt != null) {
              rows = rows.filter(
                (row) =>
                  row.seatNumber != null &&
                  row.seatNumber > where.seatNumber!.gt!,
              );
            }
            if (where.seatNumber?.not === null) {
              rows = rows.filter((row) => row.seatNumber != null);
            }
            return rows;
          },
        );

      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockImplementation(
          async ({
            where,
          }: {
            where: {
              termId?: string;
              seatNumber?: { gt?: number };
              isPetitioned?: boolean;
            };
          }) => {
            let rows = seats;
            if (where.termId) {
              rows = rows.filter((row) => row.termId === where.termId);
            }
            if (where.seatNumber?.gt != null) {
              rows = rows.filter((row) => row.seatNumber > where.seatNumber!.gt!);
            }
            if (where.isPetitioned != null) {
              rows = rows.filter((row) => row.isPetitioned === where.isPetitioned);
            }
            return rows;
          },
        );
    }

    it("4 -> 2 rejects when an active-term active membership has seat 3 or 4", async () => {
      setupDecreaseMocks([
        {
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: MembershipStatus.ACTIVE,
          seatNumber: 4,
          committeeList: {
            id: 1,
            cityTown: "GREECE",
            legDistrict: 1,
            electionDistrict: 1,
          },
        },
      ]);

      await expect(
        reconcileSeatsForMaxSeatsChange(prismaMock, {
          termId: DEFAULT_ACTIVE_TERM_ID,
          oldMaxSeats: 4,
          newMaxSeats: 2,
        }),
      ).rejects.toBeInstanceOf(SeatDecreaseConflictError);
    });

    it("4 -> 2 does not reject because of a historical-term active membership with seat 3 or 4", async () => {
      setupDecreaseMocks([
        {
          committeeListId: 1,
          termId: HISTORICAL_TERM_ID,
          status: MembershipStatus.ACTIVE,
          seatNumber: 4,
        },
      ]);

      (prismaMock.seat as { deleteMany: jest.Mock }).deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 2 });
      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockImplementation(
          async ({
            where,
          }: {
            where: {
              termId?: string;
              seatNumber?: { gt?: number };
              isPetitioned?: boolean;
            };
          }) => {
            if (where.isPetitioned === true) {
              return [];
            }
            if (where.seatNumber?.gt != null) {
              return [
                {
                  id: "seat-3",
                  committeeListId: 1,
                  termId: DEFAULT_ACTIVE_TERM_ID,
                  seatNumber: 3,
                  isPetitioned: false,
                },
                {
                  id: "seat-4",
                  committeeListId: 1,
                  termId: DEFAULT_ACTIVE_TERM_ID,
                  seatNumber: 4,
                  isPetitioned: false,
                },
              ];
            }
            return [];
          },
        );

      const summary = await reconcileSeatsForMaxSeatsChange(prismaMock, {
        termId: DEFAULT_ACTIVE_TERM_ID,
        oldMaxSeats: 4,
        newMaxSeats: 2,
      });

      expect(summary.direction).toBe("decrease");
      expect(summary.deletedSeatCount).toBe(2);
    });

    it("4 -> 2 rejects when an active-term seat 3 or 4 is petitioned", async () => {
      setupDecreaseMocks([], [
        {
          id: "seat-3",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          seatNumber: 3,
          isPetitioned: true,
          weight: null,
          committeeList: {
            id: 1,
            cityTown: "GREECE",
            legDistrict: 1,
            electionDistrict: 1,
          },
        } as SeatRow & { committeeList: CommitteeListRow },
      ]);

      await expect(
        reconcileSeatsForMaxSeatsChange(prismaMock, {
          termId: DEFAULT_ACTIVE_TERM_ID,
          oldMaxSeats: 4,
          newMaxSeats: 2,
        }),
      ).rejects.toBeInstanceOf(SeatDecreaseConflictError);
    });

    it("4 -> 2 does not reject because of a historical-term petitioned seat 3 or 4", async () => {
      setupDecreaseMocks(
        [],
        [
          {
            id: "seat-hist-3",
            committeeListId: 1,
            termId: HISTORICAL_TERM_ID,
            seatNumber: 3,
            isPetitioned: true,
            weight: null,
          },
        ],
      );

      (prismaMock.seat as { deleteMany: jest.Mock }).deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 2 });

      const summary = await reconcileSeatsForMaxSeatsChange(prismaMock, {
        termId: DEFAULT_ACTIVE_TERM_ID,
        oldMaxSeats: 4,
        newMaxSeats: 2,
      });

      expect(summary.direction).toBe("decrease");
    });
  });

  describe("reconcileSeatsForMaxSeatsChange decrease deletes", () => {
    it("4 -> 2 deletes vacant non-petitioned active-term seats 3 and 4", async () => {
      setupCommitteeListMock([
        { id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 1 },
      ]);

      (prismaMock.committeeMembership as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockResolvedValue([]);

      const activeTermSeats: SeatRow[] = [
        {
          id: "seat-1",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          seatNumber: 1,
          isPetitioned: false,
          weight: null,
        },
        {
          id: "seat-2",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          seatNumber: 2,
          isPetitioned: false,
          weight: null,
        },
        {
          id: "seat-3",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          seatNumber: 3,
          isPetitioned: false,
          weight: null,
        },
        {
          id: "seat-4",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          seatNumber: 4,
          isPetitioned: false,
          weight: null,
        },
      ];

      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockImplementation(
          async ({
            where,
          }: {
            where: {
              termId?: string;
              seatNumber?: { gt?: number };
              isPetitioned?: boolean;
            };
          }) => {
            let rows = activeTermSeats;
            if (where.termId) {
              rows = rows.filter((row) => row.termId === where.termId);
            }
            if (where.seatNumber?.gt != null) {
              rows = rows.filter((row) => row.seatNumber > where.seatNumber!.gt!);
            }
            if (where.isPetitioned != null) {
              rows = rows.filter((row) => row.isPetitioned === where.isPetitioned);
            }
            return rows;
          },
        );

      (prismaMock.seat as { deleteMany: jest.Mock }).deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 2 });

      const summary = await reconcileSeatsForMaxSeatsChange(prismaMock, {
        termId: DEFAULT_ACTIVE_TERM_ID,
        oldMaxSeats: 4,
        newMaxSeats: 2,
      });

      expect(summary.deletedSeatCount).toBe(2);
      expect(
        (prismaMock.seat as { deleteMany: jest.Mock }).deleteMany,
      ).toHaveBeenCalledWith({
        where: { id: { in: ["seat-3", "seat-4"] } },
      });
    });

    it("4 -> 2 leaves historical-term seats unchanged", async () => {
      setupCommitteeListMock([
        { id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 1 },
      ]);

      (prismaMock.committeeMembership as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockResolvedValue([]);

      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockResolvedValue([]);

      (prismaMock.seat as { deleteMany: jest.Mock }).deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 0 });

      await reconcileSeatsForMaxSeatsChange(prismaMock, {
        termId: DEFAULT_ACTIVE_TERM_ID,
        oldMaxSeats: 4,
        newMaxSeats: 2,
      });

      expect(
        (prismaMock.seat as { deleteMany: jest.Mock }).deleteMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe("reconcileSeatsForMaxSeatsChange weights", () => {
    it("recomputes weights using ltedWeight / newMaxSeats", async () => {
      setupCommitteeListMock([
        { id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 1 },
      ]);
      setupGovernanceConfigMock(6);

      (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
        .fn()
        .mockResolvedValue(
          [1, 2, 3, 4].map((seatNumber) => ({
            committeeListId: 1,
            termId: DEFAULT_ACTIVE_TERM_ID,
            seatNumber,
          })),
        );
      (prismaMock.seat as { createMany: jest.Mock }).createMany = jest
        .fn()
        .mockResolvedValue({ count: 2 });

      await reconcileSeatsForMaxSeatsChange(prismaMock, {
        termId: DEFAULT_ACTIVE_TERM_ID,
        oldMaxSeats: 4,
        newMaxSeats: 6,
      });

      const expectedWeight = new Prisma.Decimal(128).div(6);
      expect(
        (prismaMock.seat as { updateMany: jest.Mock }).updateMany,
      ).toHaveBeenCalledWith(
        expectSeatUpdateMany({
          where: { committeeListId: 1 },
          data: { weight: expectedWeight },
        }),
      );
    });
  });
});
