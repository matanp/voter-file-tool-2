/**
 * Tests for SRS 1.4 seat utils: assignNextAvailableSeat, ensureSeatsExist, recomputeSeatWeights.
 */

import {
  type AuditLog,
  type CommitteeMembership,
  Prisma,
} from "@prisma/client";
import {
  assignNextAvailableSeat,
  activateMembershipInSeat,
  ensureSeatsExist,
  recomputeSeatWeights,
  type MembershipActivationInput,
  seatActivationAuditMetadata,
} from "~/app/api/lib/seatUtils";
import { prismaMock } from "../../utils/mocks";
import {
  createMockGovernanceConfig,
  createMockMembership,
  echoMembershipWrites,
  resolvesTo,
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

  describe("activateMembershipInSeat", () => {
    const COMMITTEE = 7;
    const TERM = "term-1";
    const flagWrite = (seatNumber: number) => ({
      where: {
        committeeListId: COMMITTEE,
        termId: TERM,
        seatNumber,
        isPetitioned: false,
      },
      data: { isPetitioned: true },
    });
    const occupiedSeats = (...seatNumbers: number[]) =>
      prismaMock.committeeMembership.findMany.mockImplementation(() =>
        resolvesTo<Array<Pick<CommitteeMembership, "seatNumber">>>(
          seatNumbers.map((seatNumber) => ({ seatNumber })),
        ),
      );
    /** MEMBER_ACTIVATED rows for the membership, newest first (as the query orders them). */
    const activationAudits = (...seatNumbers: Array<number | null>) =>
      prismaMock.auditLog.findMany.mockImplementation(() =>
        resolvesTo<Array<Pick<AuditLog, "afterValue">>>(
          seatNumbers.map((seatNumber) => ({
            afterValue:
              seatNumber === null
                ? { status: "ACTIVE" }
                : { status: "ACTIVE", seatNumber },
          })),
        ),
      );
    const returning = (overrides: Partial<CommitteeMembership> = {}) =>
      createMockMembership({
        id: "m-1",
        committeeListId: COMMITTEE,
        termId: TERM,
        status: "REMOVED",
        membershipType: "PETITIONED",
        seatNumber: null,
        activatedAt: new Date("2026-01-01"),
        ...overrides,
      });
    const reactivate = (
      existing: CommitteeMembership,
      membershipType: MembershipActivationInput["membershipType"] = "PETITIONED",
    ) =>
      activateMembershipInSeat(prismaMock, {
        committeeListId: COMMITTEE,
        termId: TERM,
        maxSeats: 4,
        membershipType,
        existing,
        data: {},
      });

    beforeEach(() => {
      echoMembershipWrites({ committeeListId: COMMITTEE, termId: TERM });
      prismaMock.seat.updateMany.mockResolvedValue({ count: 1 });
      occupiedSeats();
      activationAudits();
    });

    it("a first activation takes the next free seat ACTIVE and flags it", async () => {
      occupiedSeats(1);

      const activation = await activateMembershipInSeat(prismaMock, {
        committeeListId: COMMITTEE,
        termId: TERM,
        maxSeats: 4,
        membershipType: "PETITIONED",
        existing: null,
        data: { voterRecordId: "VRC1" },
      });

      expect(prismaMock.committeeMembership.create).toHaveBeenCalledWith({
        data: {
          voterRecordId: "VRC1",
          committeeListId: COMMITTEE,
          termId: TERM,
          status: "ACTIVE",
          seatNumber: 2,
          membershipType: "PETITIONED",
        },
      });
      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(flagWrite(2));
      expect(activation).toMatchObject({
        seatNumber: 2,
        seatPetitioned: true,
        reusedPreviousSeat: false,
      });
      expect(seatActivationAuditMetadata(activation)).toEqual({
        seatPetitioned: true,
      });
    });

    it("a never-activated row (a submission being confirmed) is a first activation", async () => {
      const activation = await reactivate(
        returning({ status: "SUBMITTED", activatedAt: null }),
      );

      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(flagWrite(1));
      expect(activation).toMatchObject({
        seatNumber: 1,
        seatPetitioned: true,
        reusedPreviousSeat: false,
      });
    });

    it("a returning PETITIONED member goes back to their previous seat from the audit log", async () => {
      occupiedSeats(1);
      activationAudits(null, 3, 2);

      const activation = await reactivate(returning());

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: "CommitteeMembership",
          entityId: "m-1",
          action: "MEMBER_ACTIVATED",
        },
        orderBy: { timestamp: "desc" },
        select: { afterValue: true },
      });
      expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: { status: "ACTIVE", seatNumber: 3, membershipType: "PETITIONED" },
      });
      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(flagWrite(3));
      expect(activation).toMatchObject({
        seatNumber: 3,
        seatPetitioned: true,
        reusedPreviousSeat: true,
      });
      expect(seatActivationAuditMetadata(activation)).toEqual({
        seatPetitioned: true,
        reusedPreviousSeat: true,
      });
    });

    it("prefers the row's seatNumber, then its petitionSeatNumber, over the audit log", async () => {
      activationAudits(4);

      await expect(
        reactivate(returning({ seatNumber: 2, petitionSeatNumber: 3 })),
      ).resolves.toMatchObject({ seatNumber: 2, reusedPreviousSeat: true });
      await expect(
        reactivate(returning({ petitionSeatNumber: 3 })),
      ).resolves.toMatchObject({ seatNumber: 3, reusedPreviousSeat: true });
      expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
    });

    it("reports reuse but no new flag when the previous seat is already petitioned", async () => {
      prismaMock.seat.updateMany.mockResolvedValue({ count: 0 });
      activationAudits(2);

      const activation = await reactivate(returning());

      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(flagWrite(2));
      expect(seatActivationAuditMetadata(activation)).toEqual({
        reusedPreviousSeat: true,
      });
    });

    it("seats a returning member elsewhere without flagging when their previous seat is taken", async () => {
      occupiedSeats(2);
      activationAudits(2);

      const activation = await reactivate(returning());

      expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: { status: "ACTIVE", seatNumber: 1, membershipType: "PETITIONED" },
      });
      expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
      expect(activation).toMatchObject({
        seatNumber: 1,
        seatPetitioned: false,
        reusedPreviousSeat: false,
      });
      expect(seatActivationAuditMetadata(activation)).toEqual({});
    });

    it("seats a returning member without flagging when their previous seat is unknown", async () => {
      activationAudits(null);

      const activation = await reactivate(returning({ activatedAt: null }));

      expect(activation).toMatchObject({
        seatNumber: 1,
        seatPetitioned: false,
        reusedPreviousSeat: false,
      });
      expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
    });

    it("ignores the petitionSeatNumber of a candidate who lost that seat", async () => {
      occupiedSeats(1);

      const activation = await reactivate(
        returning({
          status: "PETITIONED_LOST",
          petitionSeatNumber: 1,
          activatedAt: null,
        }),
      );

      // Never seated before, so this is their first activation.
      expect(activation).toMatchObject({
        seatNumber: 2,
        seatPetitioned: true,
        reusedPreviousSeat: false,
      });
    });

    it("keeps an ACTIVE member's seat and flags it", async () => {
      occupiedSeats(1, 3);

      const activation = await reactivate(
        returning({ status: "ACTIVE", seatNumber: 3 }),
      );

      expect(prismaMock.committeeMembership.findMany).not.toHaveBeenCalled();
      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(flagWrite(3));
      expect(activation).toMatchObject({ seatNumber: 3, reusedPreviousSeat: false });
    });

    it("a non-PETITIONED member takes the next free seat and flags nothing", async () => {
      occupiedSeats(1);
      activationAudits(1);

      const activation = await reactivate(returning(), "APPOINTED");

      expect(activation).toMatchObject({
        seatNumber: 2,
        seatPetitioned: false,
        reusedPreviousSeat: false,
      });
      expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
    });
  });
});
