/**
 * An import records how each member actually got their seat: a created membership takes the
 * canonical entry's `membershipType` rather than a constant. Existing memberships are not
 * rewritten — a reactivation keeps the type it already has.
 */
import type { AuditLog, CommitteeMembership, Prisma } from "@prisma/client";
import { applyRosterImport } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
import { prismaMock } from "../../utils/mocks";
import {
  createMockCommitteeListRow,
  createMockCommitteeTerm,
  createMockGovernanceConfig,
  createMockMembership,
  echoMembershipWrites,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  expectAuditLogCreate,
  expectMembershipCreate,
  expectMembershipUpdate,
  firstCallArg,
  getAuditLogMock,
  getMembershipMock,
  jsonContaining,
  jsonLacking,
  resolvesTo,
  setupRosterImportPrismaMocks,
} from "../../utils/testUtils";
import * as committeeValidation from "~/app/api/lib/committeeValidation";
import type * as CommitteeValidationModule from "~/app/api/lib/committeeValidation";
import * as seatUtils from "~/app/api/lib/seatUtils";

jest.mock("~/app/api/lib/committeeValidation", () => {
  const actual = jest.requireActual<typeof CommitteeValidationModule>(
    "~/app/api/lib/committeeValidation",
  );
  return {
    ...actual,
    getActiveTerm: jest.fn(),
    getGovernanceConfig: jest.fn(),
  };
});

jest.mock("~/app/api/lib/seatUtils", () => ({
  // The activation (seat choice and write) runs for real, so its membership and Seat
  // reads and writes reach prismaMock.
  ...jest.requireActual<typeof seatUtils>("~/app/api/lib/seatUtils"),
  ensureSeatsExist: jest.fn(),
}));

const getActiveTermMock = jest.mocked(committeeValidation.getActiveTerm);
const getGovernanceConfigMock = jest.mocked(
  committeeValidation.getGovernanceConfig,
);
const ensureSeatsExistMock = jest.mocked(seatUtils.ensureSeatsExist);

const seatFlagWrite = (seatNumber = 1) => ({
  where: {
    committeeListId: 101,
    termId: DEFAULT_ACTIVE_TERM_ID,
    seatNumber,
    isPetitioned: false,
  },
  data: { isPetitioned: true },
});

/** The activation's audit row records whether it flagged the seat. */
const expectActivationAudit = (seatPetitioned: boolean) =>
  expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
    expectAuditLogCreate({
      action: "MEMBER_ACTIVATED",
      metadata: seatPetitioned
        ? jsonContaining({ seatPetitioned: true })
        : jsonLacking("seatPetitioned"),
    }),
  );

const rosterEntry = (
  vrcnum: string,
  membershipType: RosterEntry["membershipType"],
): RosterEntry => ({
  vrcnum,
  committee: { cityTown: "TEST CITY", legDistrict: 1, electionDistrict: 1 },
  claimed: {
    name: "JOHN DOE",
    address1: "123 Main St",
    city: "Testville",
    state: "NY",
    zip: "14604",
  },
  membershipType,
  sourceRow: 2,
});

describe("membership type written by an import", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getActiveTermMock.mockResolvedValue(createMockCommitteeTerm());
    getGovernanceConfigMock.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
    );
    prismaMock.voterRecord.findUnique.mockImplementation((args) =>
      resolvesTo(
        createMockVoterRecord({
          VRCNUM: (args.where as { VRCNUM: string }).VRCNUM,
          firstName: "JOHN",
          middleInitial: null,
          lastName: "DOE",
          houseNum: 123,
          street: "Main St",
          apartment: null,
          city: "Testville",
          state: "NY",
          zipCode: "14604",
        }),
      ),
    );
    setupRosterImportPrismaMocks(prismaMock);
    prismaMock.committeeList.findUnique.mockResolvedValue(null);
    prismaMock.committeeList.upsert.mockResolvedValue(
      createMockCommitteeListRow({
        id: 101,
        cityTown: "TEST CITY",
        electionDistrict: 1,
      }),
    );
    echoMembershipWrites({ id: "m-new", committeeListId: 101 });
    prismaMock.seat.updateMany.mockResolvedValue({ count: 1 });
    ensureSeatsExistMock.mockResolvedValue(undefined);
  });

  it.each(["PETITIONED", "APPOINTED"] as const)(
    "creates a membership with the entry's %s type",
    async (membershipType) => {
      await applyRosterImport({
        entries: [rosterEntry("VRC001", membershipType)],
        rejected: [],
      });

      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: "VRC001",
          committeeListId: 101,
          status: "ACTIVE",
          membershipType,
          seatNumber: 1,
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_ACTIVATED",
          entityType: "CommitteeMembership",
          afterValue: jsonContaining({
            membershipType,
          }),
        }),
      );
      // Only a PETITIONED member flags their seat, and the audit row says so.
      if (membershipType === "PETITIONED") {
        expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(seatFlagWrite());
      } else {
        expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
      }
      expectActivationAudit(membershipType === "PETITIONED");
    },
  );

  it("keeps the recorded type when reactivating a membership that already has one", async () => {
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(
      createMockMembership({
        id: "m-existing",
        voterRecordId: "VRC002",
        committeeListId: 101,
        termId: DEFAULT_ACTIVE_TERM_ID,
        status: "REMOVED",
        membershipType: "APPOINTED",
        seatNumber: null,
      }),
    );

    await applyRosterImport({
      entries: [rosterEntry("VRC002", "PETITIONED")],
      rejected: [],
    });

    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expectMembershipUpdate(
        { status: "ACTIVE", membershipType: "APPOINTED" },
        { id: "m-existing" },
      ),
    );
    expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
    expectActivationAudit(false);
  });

  it("takes the entry's type when reactivating a membership that has none", async () => {
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(
      createMockMembership({
        id: "m-untyped",
        voterRecordId: "VRC003",
        committeeListId: 101,
        termId: DEFAULT_ACTIVE_TERM_ID,
        status: "REMOVED",
        membershipType: null,
        seatNumber: null,
      }),
    );

    await applyRosterImport({
      entries: [rosterEntry("VRC003", "PETITIONED")],
      rejected: [],
    });

    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expectMembershipUpdate(
        { status: "ACTIVE", membershipType: "PETITIONED" },
        { id: "m-untyped" },
      ),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_ACTIVATED",
        afterValue: jsonContaining({
          membershipType: "PETITIONED",
        }),
      }),
    );
    expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(seatFlagWrite());
    expectActivationAudit(true);
  });

  it("keeps the petition result on a member who is already ACTIVE and flags their seat", async () => {
    prismaMock.committeeMembership.findUnique.mockResolvedValue(
      createMockMembership({
        id: "m-active",
        voterRecordId: "VRC004",
        committeeListId: 101,
        termId: DEFAULT_ACTIVE_TERM_ID,
        status: "ACTIVE",
        membershipType: "PETITIONED",
        seatNumber: 3,
        petitionVoteCount: 120,
        petitionPrimaryDate: new Date("2026-06-23T00:00:00.000Z"),
      }),
    );

    await applyRosterImport({
      entries: [rosterEntry("VRC004", "PETITIONED")],
      rejected: [],
    });

    const update = firstCallArg<Prisma.CommitteeMembershipUpdateArgs>(
      prismaMock.committeeMembership.update,
    );
    expect(update.data).toMatchObject({ status: "ACTIVE", seatNumber: 3 });
    expect(update.data).not.toHaveProperty("petitionVoteCount");
    expect(update.data).not.toHaveProperty("petitionPrimaryDate");
    expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(seatFlagWrite(3));
    expectActivationAudit(true);
  });

  it("does not record a seat flag the seat already had", async () => {
    prismaMock.seat.updateMany.mockResolvedValue({ count: 0 });

    await applyRosterImport({
      entries: [rosterEntry("VRC001", "PETITIONED")],
      rejected: [],
    });

    expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(seatFlagWrite());
    expectActivationAudit(false);
  });

  describe("a returning petition winner", () => {
    const returningWinner = () =>
      prismaMock.committeeMembership.findUnique.mockResolvedValue(
        createMockMembership({
          id: "m-returning",
          voterRecordId: "VRC005",
          committeeListId: 101,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "REMOVED",
          membershipType: "PETITIONED",
          seatNumber: null,
          activatedAt: new Date("2026-01-05T00:00:00.000Z"),
        }),
      );
    const lastSeatedIn = (seatNumber: number) =>
      prismaMock.auditLog.findMany.mockImplementation(() =>
        resolvesTo<Array<Pick<AuditLog, "afterValue">>>([
          { afterValue: { status: "ACTIVE", seatNumber } },
        ]),
      );
    /** Answers only the activation's occupied-seat query; the import's other reads see none. */
    const occupied = (...seatNumbers: number[]) =>
      prismaMock.committeeMembership.findMany.mockImplementation(
        (args?: Prisma.CommitteeMembershipFindManyArgs) =>
          resolvesTo<Array<Pick<CommitteeMembership, "seatNumber">>>(
            args?.where?.status === "ACTIVE" &&
              args.select?.seatNumber === true &&
              Object.keys(args.select).length === 1
              ? seatNumbers.map((seatNumber) => ({ seatNumber }))
              : [],
          ),
      );

    it("goes back to their previous seat, and the audit says so", async () => {
      returningWinner();
      lastSeatedIn(3);

      await applyRosterImport({
        entries: [rosterEntry("VRC005", "PETITIONED")],
        rejected: [],
      });

      const update = firstCallArg<Prisma.CommitteeMembershipUpdateArgs>(
        prismaMock.committeeMembership.update,
      );
      expect(update.data).toMatchObject({ status: "ACTIVE", seatNumber: 3 });
      expect(prismaMock.seat.updateMany).toHaveBeenCalledWith(seatFlagWrite(3));
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_ACTIVATED",
          afterValue: jsonContaining({ seatNumber: 3 }),
          metadata: jsonContaining({
            seatPetitioned: true,
            reusedPreviousSeat: true,
          }),
        }),
      );
    });

    it("is seated elsewhere without flagging a second seat when theirs is taken", async () => {
      returningWinner();
      lastSeatedIn(1);
      occupied(1);

      await applyRosterImport({
        entries: [rosterEntry("VRC005", "PETITIONED")],
        rejected: [],
      });

      const update = firstCallArg<Prisma.CommitteeMembershipUpdateArgs>(
        prismaMock.committeeMembership.update,
      );
      expect(update.data).toMatchObject({ status: "ACTIVE", seatNumber: 2 });
      expect(prismaMock.seat.updateMany).not.toHaveBeenCalled();
      expectActivationAudit(false);
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_ACTIVATED",
          metadata: jsonLacking("reusedPreviousSeat"),
        }),
      );
    });
  });
});
