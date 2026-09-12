import { applyRosterImport } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
import { prismaMock } from "../../utils/mocks";
import type { Prisma } from "@prisma/client";
import {
  createMockCommitteeListRow,
  createMockCommitteeTerm,
  createMockGovernanceConfig,
  createMockMembership,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  expectAuditLogCreate,
  expectMembershipCreate,
  expectMembershipUpdate,
  getAuditLogMock,
  getMembershipMock,
  resolvesTo,
} from "../../utils/testUtils";
import * as committeeValidation from "~/app/api/lib/committeeValidation";
import * as seatUtils from "~/app/api/lib/seatUtils";

jest.mock("~/app/api/lib/committeeValidation", () => {
  const actual = jest.requireActual<
    typeof import("~/app/api/lib/committeeValidation")
  >("~/app/api/lib/committeeValidation");
  return {
    ...actual,
    getActiveTerm: jest.fn(),
    getGovernanceConfig: jest.fn(),
  };
});

jest.mock("~/app/api/lib/seatUtils", () => ({
  ensureSeatsExist: jest.fn(),
  assignNextAvailableSeat: jest.fn(),
}));

const getActiveTermMock = jest.mocked(committeeValidation.getActiveTerm);
const getGovernanceConfigMock = jest.mocked(
  committeeValidation.getGovernanceConfig,
);
const ensureSeatsExistMock = jest.mocked(seatUtils.ensureSeatsExist);
const assignNextAvailableSeatMock = jest.mocked(
  seatUtils.assignNextAvailableSeat,
);

/**
 * A canonical roster entry, as a parser would produce it. The importer sees only these —
 * never a source file's column names.
 */
type RosterEntryOverrides = {
  vrcnum: string;
  cityTown: string;
  legDistrict?: number;
  electionDistrict?: number;
  name?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  membershipType?: RosterEntry["membershipType"];
};

/** What the importer selects from the memberships it reconciles. */
type CommitteeMemberRow = { id: string; voterRecordId: string };

let nextSourceRow = 2;

const rosterEntry = ({
  vrcnum,
  cityTown,
  legDistrict = 1,
  electionDistrict = 1,
  name = "John Doe",
  address1 = "123 Main St",
  city = "Testville",
  state = "NY",
  zip = "14604",
  membershipType = "PETITIONED",
}: RosterEntryOverrides): RosterEntry => ({
  vrcnum,
  committee: { cityTown, legDistrict, electionDistrict },
  claimed: { name, address1, city, state, zip },
  membershipType,
  sourceRow: nextSourceRow++,
});

describe("bulkLoadCommittees import from canonical roster entries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nextSourceRow = 2;

    getActiveTermMock.mockResolvedValue(createMockCommitteeTerm());
    getGovernanceConfigMock.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
    );
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    prismaMock.voterRecord.findMany.mockImplementation((args) => {
      const ids = (args?.where?.VRCNUM as { in?: string[] })?.in ?? [];
      return resolvesTo(ids.map((VRCNUM) => createMockVoterRecord({ VRCNUM })));
    });
    assignNextAvailableSeatMock.mockResolvedValue(1);
    ensureSeatsExistMock.mockResolvedValue(undefined);
  });

  it("creates CommitteeMembership records and does not write legacy voterRecord.committeeId", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC001",
        cityTown: "TEST CITY",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        VRCNUM: "VRC001",
        firstName: "John",
        middleInitial: null,
        lastName: "Doe",
        houseNum: 123,
        street: "Main St",
        apartment: null,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      }),
    );

    prismaMock.committeeList.upsert.mockResolvedValue(createMockCommitteeListRow({
      id: 101,
      cityTown: "TEST CITY",
      electionDistrict: 1,
    }));
    prismaMock.$queryRaw.mockResolvedValue([]);

    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
    getMembershipMock(prismaMock).create.mockResolvedValue(
      createMockMembership({
        voterRecordId: "VRC001",
        committeeListId: 101,
        status: "ACTIVE",
        seatNumber: 1,
      }),
    );

    const {
      applied: { discrepancies },
    } = await applyRosterImport({ entries, rejected: [] });

    expect(discrepancies.size).toBe(0);
    expect(prismaMock.committeeList.upsert).toHaveBeenCalled();
    expect(ensureSeatsExistMock).toHaveBeenCalledWith(
      101,
      DEFAULT_ACTIVE_TERM_ID,
      expect.objectContaining({
        tx: prismaMock,
        maxSeats: 4,
      }),
    );
    expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
      expectMembershipCreate({
        voterRecordId: "VRC001",
        committeeListId: 101,
        termId: DEFAULT_ACTIVE_TERM_ID,
        status: "ACTIVE",
        membershipType: "PETITIONED",
        seatNumber: 1,
      }),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_ACTIVATED",
        entityType: "CommitteeMembership",
        metadata: expect.objectContaining({
          source: "bulk_import_sync",
        }) as Prisma.InputJsonValue,
      }),
    );
    expect(prismaMock.voterRecord.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.committeeList.deleteMany).not.toHaveBeenCalled();
  });

  it("reports a live active-elsewhere conflict as skipped rather than as an activation", async () => {
    const entries = [
      rosterEntry({ vrcnum: "VRC_OK", cityTown: "TEST CITY" }),
      rosterEntry({ vrcnum: "VRC_RACED", cityTown: "TEST CITY" }),
    ];

    prismaMock.voterRecord.findUnique.mockImplementation(
      ((args: { where: { VRCNUM: string } }) =>
        resolvesTo(
          createMockVoterRecord({
            VRCNUM: args.where.VRCNUM,
            firstName: "John",
            middleInitial: null,
            lastName: "Doe",
            houseNum: 123,
            street: "Main St",
            apartment: null,
            city: "Testville",
            state: "NY",
            zipCode: "14604",
          }),
        )) as never,
    );
    prismaMock.committeeList.upsert.mockResolvedValue(
      createMockCommitteeListRow({
        id: 101,
        cityTown: "TEST CITY",
        electionDistrict: 1,
      }),
    );
    prismaMock.$queryRaw.mockResolvedValue([]);

    // Planning reads the active memberships in bulk and sees none; by the time the
    // committee transaction checks each voter, VRC_RACED has become active elsewhere.
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getMembershipMock(prismaMock).findFirst.mockImplementation(
      ((args: { where: { voterRecordId: string } }) =>
        resolvesTo(
          args.where.voterRecordId === "VRC_RACED"
            ? createMockMembership({
                id: "m-elsewhere",
                voterRecordId: "VRC_RACED",
                committeeListId: 999,
                status: "ACTIVE",
              })
            : null,
        )) as never,
    );
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
    getMembershipMock(prismaMock).create.mockResolvedValue(
      createMockMembership({
        voterRecordId: "VRC_OK",
        committeeListId: 101,
        status: "ACTIVE",
        seatNumber: 1,
      }),
    );

    const { plan, applied } = await applyRosterImport({
      entries,
      rejected: [],
    });

    // The plan still says what was planned.
    expect(plan.counts.activations).toBe(2);
    expect(plan.counts.discrepancies).toBe(0);
    expect(plan.discrepancies.has("VRC_RACED")).toBe(false);

    // The applied summary says what happened.
    expect(applied.counts).toEqual({
      activations: 1,
      removals: 0,
      discrepancies: 1,
      skippedActivations: 1,
    });
    expect(applied.activations).toEqual([
      expect.objectContaining({ voterRecordId: "VRC_OK", seatNumber: 1 }),
    ]);
    expect(applied.skippedActivations).toEqual([
      expect.objectContaining({
        voterRecordId: "VRC_RACED",
        membershipType: "PETITIONED",
        reason: "active-elsewhere",
      }),
    ]);
    expect(applied.discrepancies.size).toBe(plan.discrepancies.size + 1);
    expect(
      applied.discrepancies.get("VRC_RACED")?.discrepancies
        .alreadyActiveInAnotherCommittee,
    ).toBeDefined();

    expect(getMembershipMock(prismaMock).create).toHaveBeenCalledTimes(1);
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ voterRecordId: "VRC_RACED" }),
      }),
    );
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
  });

  it("re-activates existing membership instead of writing legacy fields", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC002",
        cityTown: "TEST CITY",
        name: "Jane Doe",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        VRCNUM: "VRC002",
        firstName: "Jane",
        middleInitial: null,
        lastName: "Doe",
        houseNum: 123,
        street: "Main St",
        apartment: null,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      }),
    );

    prismaMock.committeeList.upsert.mockResolvedValue(createMockCommitteeListRow({
      id: 102,
      cityTown: "TEST CITY",
      electionDistrict: 1,
    }));
    prismaMock.$queryRaw.mockResolvedValue([]);

    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(
      createMockMembership({
        id: "m-existing",
        voterRecordId: "VRC002",
        committeeListId: 102,
        termId: DEFAULT_ACTIVE_TERM_ID,
        status: "REMOVED",
        membershipType: null,
        seatNumber: null,
      }),
    );
    assignNextAvailableSeatMock.mockResolvedValue(2);

    await applyRosterImport({ entries, rejected: [] });

    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expectMembershipUpdate(
        {
          status: "ACTIVE",
          membershipType: "PETITIONED",
          seatNumber: 2,
        },
        { id: "m-existing" },
      ),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_ACTIVATED",
        entityType: "CommitteeMembership",
        metadata: expect.objectContaining({
          source: "bulk_import_sync",
        }) as Prisma.InputJsonValue,
      }),
    );
    expect(prismaMock.voterRecord.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.committeeList.deleteMany).not.toHaveBeenCalled();
  });

  it("flags duplicate voter assignments across committees and avoids activation", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC_DUP",
        cityTown: "CITY ONE",
        name: "Wrong Name",
      }),
      rosterEntry({
        vrcnum: "VRC_DUP",
        cityTown: "CITY TWO",
        electionDistrict: 2,
        name: "Casey Doe",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        VRCNUM: "VRC_DUP",
        firstName: "Casey",
        middleInitial: null,
        lastName: "Doe",
        houseNum: 123,
        street: "Main St",
        apartment: null,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      }),
    );

    prismaMock.committeeList.upsert
      .mockResolvedValueOnce(createMockCommitteeListRow({
        id: 201,
        cityTown: "CITY ONE",
        electionDistrict: 1,
      }))
      .mockResolvedValueOnce(createMockCommitteeListRow({
        id: 202,
        cityTown: "CITY TWO",
        electionDistrict: 2,
      }));

    const {
      applied: { discrepancies },
    } = await applyRosterImport({ entries, rejected: [] });

    expect(prismaMock.committeeList.upsert).toHaveBeenCalledTimes(2);
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    expect(discrepancies.has("VRC_DUP")).toBe(true);
    expect(
      discrepancies.get("VRC_DUP")?.discrepancies.committeeAssignmentConflict,
    ).toEqual(
      expect.objectContaining({
        existing:
          "Voter appears in multiple committees in the same bulk import",
      }),
    );
    expect(discrepancies.get("VRC_DUP")?.discrepancies.name).toEqual(
      expect.objectContaining({ incoming: "Wrong Name", existing: "Casey Doe" }),
    );
  });

  it("preserves single-active-membership invariant: duplicate assignments in same term create discrepancies only and never a second ACTIVE membership", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC_SAME",
        cityTown: "CITY A",
        name: "Same Voter",
        address1: "1 Main St",
      }),
      rosterEntry({
        vrcnum: "VRC_SAME",
        cityTown: "CITY B",
        electionDistrict: 2,
        name: "Same Voter",
        address1: "1 Main St",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        VRCNUM: "VRC_SAME",
        firstName: "Same",
        middleInitial: null,
        lastName: "Voter",
        houseNum: 1,
        street: "Main St",
        apartment: null,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      }),
    );

    prismaMock.committeeList.upsert
      .mockResolvedValueOnce(createMockCommitteeListRow({
        id: 401,
        cityTown: "CITY A",
        electionDistrict: 1,
      }))
      .mockResolvedValueOnce(createMockCommitteeListRow({
        id: 402,
        cityTown: "CITY B",
        electionDistrict: 2,
      }));

    const {
      applied: { discrepancies },
    } = await applyRosterImport({ entries, rejected: [] });

    expect(discrepancies.has("VRC_SAME")).toBe(true);
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    expect(
      discrepancies.get("VRC_SAME")?.discrepancies.committeeAssignmentConflict,
    ).toBeDefined();
  });

  it("flags missing voter records as discrepancies and skips CommitteeMembership creation", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC_MISSING",
        cityTown: "TEST CITY",
        name: "Ghost Voter",
        address1: "999 Nowhere St",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(null);
    prismaMock.committeeList.upsert.mockResolvedValue(createMockCommitteeListRow({
      id: 501,
      cityTown: "TEST CITY",
      electionDistrict: 1,
    }));

    const {
      applied: { discrepancies },
    } = await applyRosterImport({ entries, rejected: [] });

    expect(discrepancies.has("VRC_MISSING")).toBe(true);
    expect(discrepancies.get("VRC_MISSING")?.discrepancies.VRCNUM).toEqual(
      expect.objectContaining({
        incoming: "VRC_MISSING",
        existing: "",
      }),
    );
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("keeps a discrepant present member active while removing a genuinely absent member", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC_PRESENT",
        cityTown: "TEST CITY",
        name: "Wrong Name",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        VRCNUM: "VRC_PRESENT",
        firstName: "Actual",
        middleInitial: null,
        lastName: "Name",
        houseNum: 123,
        street: "Main St",
        apartment: null,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      }),
    );
    prismaMock.committeeList.findUnique.mockImplementation(() =>
      resolvesTo<{ id: number }>({ id: 601 }),
    );
    prismaMock.committeeList.upsert.mockResolvedValue(
      createMockCommitteeListRow({
        id: 601,
        cityTown: "TEST CITY",
        electionDistrict: 1,
      }),
    );
    prismaMock.$queryRaw.mockResolvedValue([]);
    getMembershipMock(prismaMock).findMany.mockImplementation(
      (args: { where: { committeeListId?: number } }) => {
        const { where } = args;
        if (where.committeeListId === 601) {
          return Promise.resolve([
            { id: "m-present", voterRecordId: "VRC_PRESENT" },
            { id: "m-absent", voterRecordId: "VRC_ABSENT" },
          ] satisfies CommitteeMemberRow[]);
        }
        return Promise.resolve([]);
      },
    );

    const { plan, applied } = await applyRosterImport({
      entries,
      rejected: [],
    });

    expect(plan.activations).toEqual([]);
    expect(applied.activations).toEqual([]);
    expect(applied.removals).toEqual([
      {
        membershipId: "m-absent",
        voterRecordId: "VRC_ABSENT",
        committee: expect.any(Object) as unknown,
      },
    ]);
    expect(applied.counts).toEqual({
      activations: 0,
      removals: 1,
      discrepancies: applied.discrepancies.size,
      skippedActivations: 0,
    });
    expect(plan.removals).toEqual([
      expect.objectContaining({
        membershipId: "m-absent",
        voterRecordId: "VRC_ABSENT",
      }),
    ]);
    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledTimes(1);
    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expectMembershipUpdate(
        { status: "REMOVED", removalReason: "OTHER" },
        { id: "m-absent" },
      ),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledTimes(1);
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        entityType: "CommitteeMembership",
        metadata: expect.objectContaining({
          source: "bulk_import_sync",
          reason: "not_in_import_file",
        }) as Prisma.InputJsonValue,
      }),
    );
  });

  it("logs MEMBER_REMOVED when sync removes an active member not present in import", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC_NEW",
        cityTown: "TEST CITY",
        name: "New Member",
        address1: "10 Main St",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        VRCNUM: "VRC_NEW",
        firstName: "New",
        middleInitial: null,
        lastName: "Member",
        houseNum: 10,
        street: "Main St",
        apartment: null,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      }),
    );

    prismaMock.committeeList.upsert.mockResolvedValue(createMockCommitteeListRow({
      id: 301,
      cityTown: "TEST CITY",
      electionDistrict: 1,
    }));
    prismaMock.$queryRaw.mockResolvedValue([]);

    getMembershipMock(prismaMock)
      .findMany.mockResolvedValueOnce([]) // initial cross-committee snapshot
      .mockResolvedValueOnce([
        { id: "m-to-remove", voterRecordId: "VRC_OLD" },
      ] satisfies CommitteeMemberRow[]); // existing active memberships in committee
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
    getMembershipMock(prismaMock).create.mockResolvedValue(
      createMockMembership({
        id: "m-new",
        voterRecordId: "VRC_NEW",
        committeeListId: 301,
        status: "ACTIVE",
        seatNumber: 1,
      }),
    );

    await applyRosterImport({ entries, rejected: [] });

    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expectMembershipUpdate(
        {
          status: "REMOVED",
          removalReason: "OTHER",
        },
        { id: "m-to-remove" },
      ),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        entityType: "CommitteeMembership",
        metadata: expect.objectContaining({
          source: "bulk_import_sync",
          reason: "not_in_import_file",
        }) as Prisma.InputJsonValue,
      }),
    );
  });

  it("rolls back committee sync when audit write fails", async () => {
    const entries = [
      rosterEntry({
        vrcnum: "VRC_NEW",
        cityTown: "TEST CITY",
        name: "New Member",
        address1: "10 Main St",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        VRCNUM: "VRC_NEW",
        firstName: "New",
        middleInitial: null,
        lastName: "Member",
        houseNum: 10,
        street: "Main St",
        apartment: null,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      }),
    );

    prismaMock.committeeList.upsert.mockResolvedValue(createMockCommitteeListRow({
      id: 301,
      cityTown: "TEST CITY",
      electionDistrict: 1,
    }));
    prismaMock.$queryRaw.mockResolvedValue([]);

    getMembershipMock(prismaMock)
      .findMany.mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "m-to-remove", voterRecordId: "VRC_OLD" },
      ] satisfies CommitteeMemberRow[]);
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
    getMembershipMock(prismaMock).create.mockResolvedValue(
      createMockMembership({
        id: "m-new",
        voterRecordId: "VRC_NEW",
        committeeListId: 301,
        status: "ACTIVE",
        seatNumber: 1,
      }),
    );
    getAuditLogMock(prismaMock).create.mockRejectedValue(
      new Error("Audit write failed"),
    );

    await expect(applyRosterImport({ entries, rejected: [] })).rejects.toThrow(
      "Audit write failed",
    );
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("commits earlier committees and aborts the batch when a later committee's audit fails", async () => {
    // Two committees, each processed in its own per-committee transaction.
    // The first committee's audit succeeds (committed); the second's audit
    // fails, so its transaction rolls back and the batch aborts — proving the
    // rollback scope is per-committee, not the whole import.
    const entries = [
      rosterEntry({
        vrcnum: "VRC_A",
        cityTown: "ALPHA CITY",
        name: "Alpha Member",
        address1: "10 Main St",
      }),
      rosterEntry({
        vrcnum: "VRC_B",
        cityTown: "BETA CITY",
        name: "Beta Member",
        address1: "20 Oak St",
      }),
    ];

    prismaMock.voterRecord.findUnique.mockImplementation((args) => {
      const vrcnum = (args?.where as { VRCNUM?: string })?.VRCNUM;
      if (vrcnum === "VRC_A") {
        return resolvesTo(
          createMockVoterRecord({
            VRCNUM: "VRC_A",
            firstName: "Alpha",
            middleInitial: null,
            lastName: "Member",
            houseNum: 10,
            street: "Main St",
            apartment: null,
            city: "Testville",
            state: "NY",
            zipCode: "14604",
          }),
        );
      }
      return resolvesTo(
        createMockVoterRecord({
          VRCNUM: "VRC_B",
          firstName: "Beta",
          middleInitial: null,
          lastName: "Member",
          houseNum: 20,
          street: "Oak St",
          apartment: null,
          city: "Testville",
          state: "NY",
          zipCode: "14604",
        }),
      );
    });

    prismaMock.committeeList.upsert.mockImplementation((args) => {
      const cityTown = (
        args.where as {
          cityTown_legDistrict_electionDistrict_termId: { cityTown: string };
        }
      ).cityTown_legDistrict_electionDistrict_termId.cityTown;
      return resolvesTo(
        createMockCommitteeListRow({
          id: cityTown === "ALPHA CITY" ? 401 : 402,
          cityTown,
        }),
      );
    });
    prismaMock.$queryRaw.mockResolvedValue([]);

    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
    getMembershipMock(prismaMock).create.mockResolvedValue(
      createMockMembership({
        id: "m-new",
        status: "ACTIVE",
        seatNumber: 1,
      }),
    );

    // First committee's activation audit succeeds; the second one fails.
    getAuditLogMock(prismaMock)
      .create.mockResolvedValueOnce({})
      .mockRejectedValue(new Error("Audit write failed"));

    await expect(applyRosterImport({ entries, rejected: [] })).rejects.toThrow(
      "Audit write failed",
    );

    // Both committees entered a transaction and attempted their membership
    // write: the first committed, the second aborted on the audit failure.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(getMembershipMock(prismaMock).create).toHaveBeenCalledTimes(2);
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledTimes(2);
  });
});
