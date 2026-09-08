/**
 * How a member won their seat has to survive a discrepancy. A roster entry that says
 * PETITIONED and disagrees with the voter file becomes a `CommitteeUploadDiscrepancy`,
 * and the membership is written only when an Admin accepts that row — so the type has to
 * travel with the row rather than be re-guessed at resolution time.
 *
 * These tests drive the real path: the import route persists the discrepancy, the row it
 * wrote is what the resolution route reads, and undo restores what acceptance replaced.
 */
import * as fs from "fs";
import { POST as bulkLoadPOST } from "~/app/api/admin/bulkLoadCommittees/route";
import { POST as resolvePOST } from "~/app/api/admin/handleCommitteeDiscrepancy/route";
import { POST as undoPOST } from "~/app/api/admin/handleCommitteeDiscrepancy/undo/route";
import {
  type DiscrepancyResolution,
  type MembershipType,
  Prisma,
} from "@prisma/client";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
import {
  createMockCommitteeListRow,
  createMockCommitteeTerm,
  createMockGovernanceConfig,
  createMockMembership,
  createMockRequest,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  authenticateAsAdmin,
  expectAuditLogCreate,
  expectMembershipCreate,
  expectMembershipUpdate,
  firstCallArg,
  getAuditLogMock,
  getDiscrepancyMock,
  getMembershipMock,
  jsonContaining,
  objectContainingMatcher,
  setupRosterImportPrismaMocks,
  type MockMembership,
} from "../../utils/testUtils";
import { prismaMock } from "../../utils/mocks";
import * as committeeValidation from "~/app/api/lib/committeeValidation";
import * as seatUtils from "~/app/api/lib/seatUtils";

jest.mock("fs", () => ({
  ...jest.requireActual<typeof import("fs")>("fs"),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock("~/app/api/lib/committeeValidation", () => {
  const actual = jest.requireActual<
    typeof import("~/app/api/lib/committeeValidation")
  >("~/app/api/lib/committeeValidation");
  return {
    ...actual,
    getActiveTermId: jest.fn(),
    getActiveTerm: jest.fn(),
    getGovernanceConfig: jest.fn(),
  };
});

jest.mock("~/app/api/lib/seatUtils", () => ({
  ensureSeatsExist: jest.fn(),
  assignNextAvailableSeat: jest.fn(),
}));

const parseWithFormatMock = jest.fn();
jest.mock("~/app/api/admin/bulkLoadCommittees/rosterFormats", () => {
  const actual = jest.requireActual<
    typeof import("~/app/api/admin/bulkLoadCommittees/rosterFormats")
  >("~/app/api/admin/bulkLoadCommittees/rosterFormats");
  return {
    ...actual,
    parseWithFormat: (...args: unknown[]): unknown =>
      parseWithFormatMock(...args),
  };
});

const existsSyncMock = jest.mocked(fs.existsSync);
const readFileSyncMock = jest.mocked(fs.readFileSync);
const getActiveTermIdMock = jest.mocked(committeeValidation.getActiveTermId);
const getActiveTermMock = jest.mocked(committeeValidation.getActiveTerm);
const getGovernanceConfigMock = jest.mocked(
  committeeValidation.getGovernanceConfig,
);
const ensureSeatsExistMock = jest.mocked(seatUtils.ensureSeatsExist);
const assignNextAvailableSeatMock = jest.mocked(
  seatUtils.assignNextAvailableSeat,
);

const VRCNUM = "VRC-PETITIONED-1";
const COMMITTEE_ID = 101;
const ADMIN_USER_ID = "admin-user";

/** A roster row for a voter the file and the voter file disagree about. */
const rosterEntry = (membershipType: MembershipType): RosterEntry => ({
  vrcnum: VRCNUM,
  committee: { cityTown: "TEST CITY", legDistrict: 1, electionDistrict: 1 },
  claimed: {
    name: "JOHNATHAN DOE",
    address1: "123 Main St",
    city: "Testville",
    state: "NY",
    zip: "14604",
  },
  membershipType,
  sourceRow: 2,
});

/** The voter file's version of that person: same VRCNUM, a different name. */
const votersName = {
  VRCNUM,
  firstName: "JOHN",
  middleInitial: null,
  lastName: "DOE",
  houseNum: 123,
  street: "Main St",
  apartment: null,
  city: "Testville",
  state: "NY",
  zipCode: "14604",
};

/** Every route under test runs as the same Admin the fixtures name. */
const authenticateAdmin = () => authenticateAsAdmin(ADMIN_USER_ID);

type DiscrepancyRowShape = {
  id: string;
  VRCNUM: string;
  committeeId: number;
  discrepancy: Prisma.JsonValue;
  incomingMembershipType: MembershipType | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: DiscrepancyResolution | null;
  resolutionMetadata: Prisma.JsonValue | null;
  committee: {
    id: number;
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
    termId: string;
    term: { id: string; label: string };
  };
};

/** The stored row as the resolution route reads it back. */
const storedDiscrepancy = (
  overrides: Partial<DiscrepancyRowShape> = {},
): DiscrepancyRowShape => ({
  id: "discrepancy-id-1",
  VRCNUM,
  committeeId: COMMITTEE_ID,
  discrepancy: { name: { incoming: "JOHNATHAN DOE", existing: "JOHN DOE" } },
  incomingMembershipType: "PETITIONED",
  resolvedAt: null,
  resolvedBy: null,
  resolution: null,
  resolutionMetadata: null,
  committee: {
    id: COMMITTEE_ID,
    cityTown: "TEST CITY",
    legDistrict: 1,
    electionDistrict: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    term: { id: DEFAULT_ACTIVE_TERM_ID, label: "2024–2026" },
  },
  ...overrides,
});

/** The discrepancy row the import route upserts, as the store and assertions read it. */
type DiscrepancyUpsertArgs = {
  where: { VRCNUM: string };
  create: {
    VRCNUM: string;
    discrepancy: Prisma.JsonValue;
    incomingMembershipType: MembershipType | null;
  };
  update: {
    discrepancy: Prisma.JsonValue;
    incomingMembershipType: MembershipType | null;
  };
};

/**
 * In-memory CommitteeUploadDiscrepancy rows. `setupCommonMocks` reinstalls the
 * Prisma implementations against this map without clearing it, so an import that
 * upserts a row can be followed by a resolution that findUnique's the same row.
 */
const discrepancyRows = new Map<string, DiscrepancyRowShape>();

/** Reads upsert args at the Prisma mock boundary. */
const discrepancyUpsertArgs = (args: unknown): DiscrepancyUpsertArgs =>
  args as DiscrepancyUpsertArgs;

/** Reads the VRCNUM a findUnique uses to look up a stored discrepancy. */
const discrepancyFindUniqueVrcnum = (args: unknown): string =>
  (args as { where: { VRCNUM: string } }).where.VRCNUM;

/** Retains upserted discrepancy rows and serves them back from findUnique. */
const wireStatefulDiscrepancyMock = () => {
  const mock = getDiscrepancyMock(prismaMock);
  mock.upsert.mockImplementation((args: unknown) => {
    const upsertArgs = discrepancyUpsertArgs(args);
    const existing = discrepancyRows.get(upsertArgs.where.VRCNUM);
    const row = existing
      ? {
          ...existing,
          discrepancy: upsertArgs.update.discrepancy,
          incomingMembershipType: upsertArgs.update.incomingMembershipType,
          resolvedAt: null,
          resolvedBy: null,
          resolution: null,
          resolutionMetadata: null,
        }
      : storedDiscrepancy({
          VRCNUM: upsertArgs.create.VRCNUM,
          discrepancy: upsertArgs.create.discrepancy,
          incomingMembershipType: upsertArgs.create.incomingMembershipType,
        });
    discrepancyRows.set(row.VRCNUM, row);
    return Promise.resolve({ id: row.id });
  });
  mock.findUnique.mockImplementation((args: unknown) =>
    Promise.resolve(
      discrepancyRows.get(discrepancyFindUniqueVrcnum(args)) ?? null,
    ),
  );
};

/** P2002 from the one-active-membership-per-term partial unique index. */
const activeMembershipPerTermConflict = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint", {
    code: "P2002",
    clientVersion: "5.0.0",
    meta: { target: ["voterRecordId", "termId"] },
  });

/** Mocks every read the two routes make, with nobody seated anywhere yet. */
const setupCommonMocks = () => {
  getActiveTermIdMock.mockResolvedValue(DEFAULT_ACTIVE_TERM_ID);
  getActiveTermMock.mockResolvedValue(createMockCommitteeTerm());
  getGovernanceConfigMock.mockResolvedValue(
    createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
  );
  assignNextAvailableSeatMock.mockResolvedValue(1);
  ensureSeatsExistMock.mockResolvedValue(undefined);

  existsSyncMock.mockReturnValue(true);
  readFileSyncMock.mockReturnValue(Buffer.from("roster bytes"));

  setupRosterImportPrismaMocks(prismaMock);
  prismaMock.committeeTerm.findUnique.mockResolvedValue(
    createMockCommitteeTerm(),
  );
  prismaMock.voterRecord.findUnique.mockResolvedValue(
    createMockVoterRecord(votersName),
  );
  prismaMock.committeeList.findUnique.mockResolvedValue(
    createMockCommitteeListRow({ id: COMMITTEE_ID }),
  );
  prismaMock.committeeList.upsert.mockResolvedValue(
    createMockCommitteeListRow({ id: COMMITTEE_ID }),
  );
  getDiscrepancyMock(prismaMock).deleteMany.mockResolvedValue({ count: 0 });
  wireStatefulDiscrepancyMock();
  getDiscrepancyMock(prismaMock).update.mockResolvedValue({});
};

/** Runs the import route for one roster row and reports the discrepancy it wrote. */
const importRosterEntry = async (membershipType: MembershipType) => {
  parseWithFormatMock.mockReturnValue({
    entries: [rosterEntry(membershipType)],
    rejected: [],
  });

  const response = await bulkLoadPOST(
    createMockRequest({
      format: "boe-elected-list",
      fileName: "Elected County Committee List.csv",
      dryRun: false,
    }),
  );
  expect(response.status).toBe(200);

  return firstCallArg<DiscrepancyUpsertArgs>(
    getDiscrepancyMock(prismaMock).upsert,
  );
};

/**
 * Import a roster row that matches the voter file, so planning queues an
 * activation and only an apply-time conflict can produce a discrepancy.
 */
const importMatchingRosterEntry = async (membershipType: MembershipType) => {
  prismaMock.voterRecord.findUnique.mockResolvedValue(
    createMockVoterRecord({ ...votersName, firstName: "JOHNATHAN" }),
  );
  return importRosterEntry(membershipType);
};

/** Accepts a discrepancy, injecting a row only when the caller supplies one. */
const acceptDiscrepancy = async (row?: DiscrepancyRowShape) => {
  if (row) {
    getDiscrepancyMock(prismaMock).findUnique.mockResolvedValue(row);
  }
  return resolvePOST(createMockRequest({ VRCNUM, accept: true }));
};

describe("membership type through discrepancy resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    discrepancyRows.clear();
    setupCommonMocks();
    authenticateAdmin();
  });

  describe("the import route persists the roster's type on the discrepancy", () => {
    it.each(["PETITIONED", "APPOINTED"] as const)(
      "writes %s for a row the voter file disagrees with",
      async (membershipType) => {
        const upsertArgs = await importRosterEntry(membershipType);

        expect(upsertArgs.where).toEqual({ VRCNUM });
        expect(upsertArgs.create.incomingMembershipType).toBe(membershipType);
        // The reset path an already-present row takes has to say it too.
        expect(upsertArgs.update.incomingMembershipType).toBe(membershipType);
        // The roster row alone never seats anybody.
        expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
      },
    );

    it("writes the type for a VRCNUM that is not in the voter file", async () => {
      prismaMock.voterRecord.findUnique.mockResolvedValue(null);

      const upsertArgs = await importRosterEntry("PETITIONED");

      expect(upsertArgs.create.incomingMembershipType).toBe("PETITIONED");
    });

    it("writes the type when the voter is already active in another committee", async () => {
      getMembershipMock(prismaMock).findMany.mockResolvedValue([
        createMockMembership({
          id: "m-elsewhere",
          voterRecordId: VRCNUM,
          committeeListId: 999,
          status: "ACTIVE",
        }),
      ]);

      const upsertArgs = await importMatchingRosterEntry("PETITIONED");

      expect(upsertArgs.create.incomingMembershipType).toBe("PETITIONED");
    });
  });

  describe("apply-time conflicts persist the roster type", () => {
    it("writes the type when the write transaction finds the voter active elsewhere", async () => {
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(
        createMockMembership({
          id: "m-elsewhere",
          voterRecordId: VRCNUM,
          committeeListId: 999,
          status: "ACTIVE",
        }),
      );

      const upsertArgs = await importMatchingRosterEntry("PETITIONED");

      expect(upsertArgs.create.incomingMembershipType).toBe("PETITIONED");
      expect(upsertArgs.update.incomingMembershipType).toBe("PETITIONED");
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("writes the type when membership create hits a unique-conflict error", async () => {
      getMembershipMock(prismaMock).create.mockRejectedValue(
        activeMembershipPerTermConflict(),
      );

      const upsertArgs = await importMatchingRosterEntry("PETITIONED");

      expect(upsertArgs.create.incomingMembershipType).toBe("PETITIONED");
      expect(upsertArgs.update.incomingMembershipType).toBe("PETITIONED");
    });

    it("writes the type when membership reactivation hits a unique-conflict error", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "m-existing",
          voterRecordId: VRCNUM,
          committeeListId: COMMITTEE_ID,
          status: "REMOVED",
          membershipType: null,
          seatNumber: null,
        }),
      );
      getMembershipMock(prismaMock).update.mockRejectedValue(
        activeMembershipPerTermConflict(),
      );

      const upsertArgs = await importMatchingRosterEntry("PETITIONED");

      expect(upsertArgs.create.incomingMembershipType).toBe("PETITIONED");
      expect(upsertArgs.update.incomingMembershipType).toBe("PETITIONED");
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });
  });

  describe("accepting the discrepancy writes that type", () => {
    it("creates a PETITIONED membership from an imported PETITIONED row", async () => {
      await importRosterEntry("PETITIONED");
      jest.clearAllMocks();
      setupCommonMocks();
      authenticateAdmin();
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership({
          id: "m-new",
          voterRecordId: VRCNUM,
          committeeListId: COMMITTEE_ID,
          status: "ACTIVE",
          membershipType: "PETITIONED",
          seatNumber: 1,
        }),
      );

      const response = await acceptDiscrepancy();

      expect(response.status).toBe(200);
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: VRCNUM,
          committeeListId: COMMITTEE_ID,
          status: "ACTIVE",
          membershipType: "PETITIONED",
          seatNumber: 1,
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_ACTIVATED",
          entityType: "CommitteeMembership",
          afterValue: jsonContaining({ membershipType: "PETITIONED" }),
          metadata: jsonContaining({
            subject: objectContainingMatcher({
              membershipType: "PETITIONED",
            }),
          }),
        }),
      );
    });

    it("creates an APPOINTED membership from an APPOINTED row", async () => {
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership({
          id: "m-new",
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );

      await acceptDiscrepancy(
        storedDiscrepancy({ incomingMembershipType: "APPOINTED" }),
      );

      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: VRCNUM,
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );
    });

    it("falls back to APPOINTED for a legacy row with no incoming type", async () => {
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership({
          id: "m-new",
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );

      await acceptDiscrepancy(
        storedDiscrepancy({ incomingMembershipType: null }),
      );

      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: VRCNUM,
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );
    });

    it("keeps the recorded type when reactivating a typed membership", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "m-existing",
          voterRecordId: VRCNUM,
          committeeListId: COMMITTEE_ID,
          status: "REMOVED",
          membershipType: "APPOINTED",
          seatNumber: null,
        }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({
          id: "m-existing",
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );

      await acceptDiscrepancy(
        storedDiscrepancy({ incomingMembershipType: "PETITIONED" }),
      );

      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "ACTIVE", membershipType: "APPOINTED" },
          { id: "m-existing" },
        ),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_ACTIVATED",
          afterValue: jsonContaining({ membershipType: "APPOINTED" }),
        }),
      );
    });

    it("takes the incoming type when reactivating an untyped membership", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "m-untyped",
          voterRecordId: VRCNUM,
          committeeListId: COMMITTEE_ID,
          status: "REMOVED",
          membershipType: null,
          seatNumber: null,
        }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({
          id: "m-untyped",
          status: "ACTIVE",
          membershipType: "PETITIONED",
          seatNumber: 1,
        }),
      );

      await acceptDiscrepancy(
        storedDiscrepancy({ incomingMembershipType: "PETITIONED" }),
      );

      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "ACTIVE", membershipType: "PETITIONED" },
          { id: "m-untyped" },
        ),
      );
    });

    it("falls back to APPOINTED when reactivating an untyped membership from a legacy row", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "m-untyped",
          voterRecordId: VRCNUM,
          committeeListId: COMMITTEE_ID,
          status: "REMOVED",
          membershipType: null,
          seatNumber: null,
        }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({
          id: "m-untyped",
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );

      await acceptDiscrepancy(
        storedDiscrepancy({ incomingMembershipType: null }),
      );

      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "ACTIVE", membershipType: "APPOINTED" },
          { id: "m-untyped" },
        ),
      );
    });
  });

  it("rejecting writes no membership and leaves the incoming type on the row", async () => {
    getDiscrepancyMock(prismaMock).findUnique.mockResolvedValue(
      storedDiscrepancy({ incomingMembershipType: "PETITIONED" }),
    );

    const response = await resolvePOST(
      createMockRequest({ VRCNUM, accept: false }),
    );

    expect(response.status).toBe(200);
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();

    const updateArgs = firstCallArg<{ data: Record<string, unknown> }>(
      getDiscrepancyMock(prismaMock).update,
    );
    expect(updateArgs.data.resolution).toBe("REJECTED");
    // The resolution never rewrites what the import stated.
    expect(updateArgs.data).not.toHaveProperty("incomingMembershipType");
  });

  describe("undoing an acceptance restores the membership it changed", () => {
    /** Replays the accept's resolutionMetadata into the undo route. */
    const undoLastAccept = async (
      currentMembership: MockMembership,
      restored: MockMembership,
    ) => {
      const { data } = firstCallArg<{
        data: { resolutionMetadata: Prisma.JsonValue };
      }>(getDiscrepancyMock(prismaMock).update);
      const resolutionMetadata = data.resolutionMetadata;

      jest.clearAllMocks();
      setupCommonMocks();
      authenticateAdmin();
      getDiscrepancyMock(prismaMock).findUnique.mockResolvedValue(
        storedDiscrepancy({
          resolvedAt: new Date("2026-01-02T00:00:00.000Z"),
          resolvedBy: ADMIN_USER_ID,
          resolution: "ACCEPTED",
          resolutionMetadata,
        }),
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        currentMembership,
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(restored);

      return undoPOST(createMockRequest({ VRCNUM }));
    };

    it("removes a membership the acceptance created", async () => {
      const created = createMockMembership({
        id: "m-new",
        voterRecordId: VRCNUM,
        committeeListId: COMMITTEE_ID,
        status: "ACTIVE",
        membershipType: "PETITIONED",
        seatNumber: 1,
        activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });
      getMembershipMock(prismaMock).create.mockResolvedValue(created);
      await acceptDiscrepancy(
        storedDiscrepancy({ incomingMembershipType: "PETITIONED" }),
      );

      const response = await undoLastAccept(
        created,
        createMockMembership({
          id: "m-new",
          status: "REMOVED",
          seatNumber: null,
        }),
      );

      expect(response.status).toBe(200);
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "REMOVED", seatNumber: null },
          { id: "m-new" },
        ),
      );
    });

    it("restores the prior state of a membership the acceptance reactivated", async () => {
      const before = createMockMembership({
        id: "m-untyped",
        voterRecordId: VRCNUM,
        committeeListId: COMMITTEE_ID,
        status: "REMOVED",
        membershipType: null,
        seatNumber: 2,
        activatedAt: new Date("2024-03-01T00:00:00.000Z"),
        confirmedAt: new Date("2024-03-15T00:00:00.000Z"),
        resignedAt: new Date("2025-05-01T00:00:00.000Z"),
        removedAt: new Date("2025-06-01T00:00:00.000Z"),
        rejectedAt: new Date("2025-05-15T00:00:00.000Z"),
        rejectionNote: "Did not meet attendance",
        resignationDateReceived: new Date("2025-05-02T00:00:00.000Z"),
        resignationMethod: "EMAIL",
        removalReason: "OTHER",
        removalNotes: "Left the district",
        petitionVoteCount: 42,
        petitionPrimaryDate: new Date("2024-06-25T00:00:00.000Z"),
      });
      const reactivated = createMockMembership({
        id: "m-untyped",
        voterRecordId: VRCNUM,
        committeeListId: COMMITTEE_ID,
        status: "ACTIVE",
        membershipType: "PETITIONED",
        seatNumber: 1,
        activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(before);
      getMembershipMock(prismaMock).update.mockResolvedValue(reactivated);
      await acceptDiscrepancy(
        storedDiscrepancy({ incomingMembershipType: "PETITIONED" }),
      );

      const response = await undoLastAccept(reactivated, before);

      expect(response.status).toBe(200);
      const updateArgs = firstCallArg<{
        where: { id: string };
        data: Record<string, unknown>;
      }>(getMembershipMock(prismaMock).update);
      expect(updateArgs.where).toEqual({ id: "m-untyped" });
      expect(updateArgs.data).toEqual({
        status: "REMOVED",
        membershipType: null,
        seatNumber: 2,
        activatedAt: new Date("2024-03-01T00:00:00.000Z"),
        confirmedAt: new Date("2024-03-15T00:00:00.000Z"),
        resignedAt: new Date("2025-05-01T00:00:00.000Z"),
        removedAt: new Date("2025-06-01T00:00:00.000Z"),
        rejectedAt: new Date("2025-05-15T00:00:00.000Z"),
        rejectionNote: "Did not meet attendance",
        resignationDateReceived: new Date("2025-05-02T00:00:00.000Z"),
        resignationMethod: "EMAIL",
        removalReason: "OTHER",
        removalNotes: "Left the district",
        petitionVoteCount: 42,
        petitionPrimaryDate: new Date("2024-06-25T00:00:00.000Z"),
      });
    });
  });
});
