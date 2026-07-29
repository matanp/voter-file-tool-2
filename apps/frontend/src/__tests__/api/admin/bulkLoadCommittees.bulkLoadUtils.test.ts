import { loadCommitteeLists } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import { prismaMock } from "../../utils/mocks";
import type { Prisma } from "@prisma/client";
import {
  createMockMembership,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  expectAuditLogCreate,
  expectMembershipCreate,
  expectMembershipUpdate,
  getAuditLogMock,
  getMembershipMock,
} from "../../utils/testUtils";
import * as committeeValidation from "~/app/api/lib/committeeValidation";
import * as fs from "fs";
import * as seatUtils from "~/app/api/lib/seatUtils";
import * as xlsx from "xlsx";

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

jest.mock("xlsx", () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

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

const readFileSyncMock = fs.readFileSync as jest.Mock;
const readWorkbookMock = xlsx.read as jest.Mock;
const sheetToJsonMock = xlsx.utils.sheet_to_json as jest.Mock;
const getActiveTermMock = committeeValidation.getActiveTerm as jest.Mock;
const getGovernanceConfigMock = committeeValidation.getGovernanceConfig as jest.Mock;
const ensureSeatsExistMock = seatUtils.ensureSeatsExist as jest.Mock;
const assignNextAvailableSeatMock = seatUtils.assignNextAvailableSeat as jest.Mock;

describe("bulkLoadCommittees/loadCommitteeLists utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    readFileSyncMock.mockReturnValue(Buffer.from("fake-xlsx"));
    readWorkbookMock.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });
    getActiveTermMock.mockResolvedValue({
      id: DEFAULT_ACTIVE_TERM_ID,
      label: "2024–2026",
    });
    getGovernanceConfigMock.mockResolvedValue({
      id: "mcdc-default",
      maxSeatsPerLted: 4,
    });
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    prismaMock.voterRecord.findMany.mockImplementation((args) => {
      const ids = (args?.where?.VRCNUM as { in?: string[] })?.in ?? [];
      return Promise.resolve(
        ids.map((VRCNUM) => createMockVoterRecord({ VRCNUM })),
      ) as never;
    });
    assignNextAvailableSeatMock.mockResolvedValue(1);
    ensureSeatsExistMock.mockResolvedValue(undefined);
  });

  it("creates CommitteeMembership records and does not write legacy voterRecord.committeeId", async () => {
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "Test City",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC001",
        name: "John Doe",
        "res address1": "123 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

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

    prismaMock.committeeList.upsert.mockResolvedValue({
      id: 101,
      cityTown: "TEST CITY",
      legDistrict: 1,
      electionDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      ltedWeight: null,
    } as never);
    prismaMock.$queryRaw.mockResolvedValue([] as never);

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

    const discrepancies = await loadCommitteeLists();

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
        membershipType: "APPOINTED",
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

  it("re-activates existing membership instead of writing legacy fields", async () => {
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "Test City",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC002",
        name: "Jane Doe",
        "res address1": "123 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

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

    prismaMock.committeeList.upsert.mockResolvedValue({
      id: 102,
      cityTown: "TEST CITY",
      legDistrict: 1,
      electionDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      ltedWeight: null,
    } as never);
    prismaMock.$queryRaw.mockResolvedValue([] as never);

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

    await loadCommitteeLists();

    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expectMembershipUpdate(
        {
          status: "ACTIVE",
          membershipType: "APPOINTED",
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
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "City One",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC_DUP",
        name: "Casey Doe",
        "res address1": "123 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
      {
        Committee: "City Two",
        "Serve LT": "1",
        "Serve ED": "2",
        "voter id": "VRC_DUP",
        name: "Casey Doe",
        "res address1": "123 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

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
      .mockResolvedValueOnce({
        id: 201,
        cityTown: "CITY ONE",
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      } as never)
      .mockResolvedValueOnce({
        id: 202,
        cityTown: "CITY TWO",
        legDistrict: 1,
        electionDistrict: 2,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      } as never);

    const discrepancies = await loadCommitteeLists();

    expect(prismaMock.committeeList.upsert).toHaveBeenCalledTimes(2);
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    expect(discrepancies.has("VRC_DUP")).toBe(true);
    expect(
      discrepancies.get("VRC_DUP")?.discrepancies.committeeAssignmentConflict,
    ).toEqual(
      expect.objectContaining({
        existing: "Voter appears in multiple committees in the same bulk import",
      }),
    );
  });

  it("preserves single-active-membership invariant: duplicate assignments in same term create discrepancies only and never a second ACTIVE membership", async () => {
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "City A",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC_SAME",
        name: "Same Voter",
        "res address1": "1 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
      {
        Committee: "City B",
        "Serve LT": "1",
        "Serve ED": "2",
        "voter id": "VRC_SAME",
        name: "Same Voter",
        "res address1": "1 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

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
      .mockResolvedValueOnce({
        id: 401,
        cityTown: "CITY A",
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      } as never)
      .mockResolvedValueOnce({
        id: 402,
        cityTown: "CITY B",
        legDistrict: 1,
        electionDistrict: 2,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      } as never);

    const discrepancies = await loadCommitteeLists();

    expect(discrepancies.has("VRC_SAME")).toBe(true);
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    expect(
      discrepancies.get("VRC_SAME")?.discrepancies.committeeAssignmentConflict,
    ).toBeDefined();
  });

  it("flags missing voter records as discrepancies and skips CommitteeMembership creation", async () => {
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "Test City",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC_MISSING",
        name: "Ghost Voter",
        "res address1": "999 Nowhere St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

    prismaMock.voterRecord.findUnique.mockResolvedValue(null);
    prismaMock.committeeList.upsert.mockResolvedValue({
      id: 501,
      cityTown: "TEST CITY",
      legDistrict: 1,
      electionDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      ltedWeight: null,
    } as never);

    const discrepancies = await loadCommitteeLists();

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

  it("logs MEMBER_REMOVED when sync removes an active member not present in import", async () => {
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "Test City",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC_NEW",
        name: "New Member",
        "res address1": "10 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

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

    prismaMock.committeeList.upsert.mockResolvedValue({
      id: 301,
      cityTown: "TEST CITY",
      legDistrict: 1,
      electionDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      ltedWeight: null,
    } as never);
    prismaMock.$queryRaw.mockResolvedValue([] as never);

    getMembershipMock(prismaMock).findMany
      .mockResolvedValueOnce([]) // initial cross-committee snapshot
      .mockResolvedValueOnce([
        { id: "m-to-remove", voterRecordId: "VRC_OLD" },
      ] as never); // existing active memberships in committee
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

    await loadCommitteeLists();

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
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "Test City",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC_NEW",
        name: "New Member",
        "res address1": "10 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

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

    prismaMock.committeeList.upsert.mockResolvedValue({
      id: 301,
      cityTown: "TEST CITY",
      legDistrict: 1,
      electionDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      ltedWeight: null,
    } as never);
    prismaMock.$queryRaw.mockResolvedValue([] as never);

    getMembershipMock(prismaMock).findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "m-to-remove", voterRecordId: "VRC_OLD" },
      ] as never);
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

    await expect(loadCommitteeLists()).rejects.toThrow("Audit write failed");
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("commits earlier committees and aborts the batch when a later committee's audit fails", async () => {
    // Two committees, each processed in its own per-committee transaction.
    // The first committee's audit succeeds (committed); the second's audit
    // fails, so its transaction rolls back and the batch aborts — proving the
    // rollback scope is per-committee, not the whole import.
    sheetToJsonMock.mockReturnValue([
      {
        Committee: "Alpha City",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC_A",
        name: "Alpha Member",
        "res address1": "10 Main St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
      {
        Committee: "Beta City",
        "Serve LT": "1",
        "Serve ED": "1",
        "voter id": "VRC_B",
        name: "Beta Member",
        "res address1": "20 Oak St",
        "res city": "Testville",
        "res state": "NY",
        "res zip": "14604",
      },
    ]);

    prismaMock.voterRecord.findUnique.mockImplementation((args) => {
      const vrcnum = (args?.where as { VRCNUM?: string })?.VRCNUM;
      if (vrcnum === "VRC_A") {
        return Promise.resolve(
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
        ) as never;
      }
      return Promise.resolve(
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
      ) as never;
    });

    prismaMock.committeeList.upsert.mockImplementation((args) => {
      const cityTown = (
        args.where as {
          cityTown_legDistrict_electionDistrict_termId: { cityTown: string };
        }
      ).cityTown_legDistrict_electionDistrict_termId.cityTown;
      return Promise.resolve({
        id: cityTown === "ALPHA CITY" ? 401 : 402,
        cityTown,
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      }) as never;
    });
    prismaMock.$queryRaw.mockResolvedValue([] as never);

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
    getAuditLogMock(prismaMock).create
      .mockResolvedValueOnce({} as never)
      .mockRejectedValue(new Error("Audit write failed"));

    await expect(loadCommitteeLists()).rejects.toThrow("Audit write failed");

    // Both committees entered a transaction and attempted their membership
    // write: the first committed, the second aborted on the audit failure.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(getMembershipMock(prismaMock).create).toHaveBeenCalledTimes(2);
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledTimes(2);
  });
});
