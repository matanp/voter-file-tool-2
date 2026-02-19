import { loadCommitteeLists } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import { prismaMock } from "../../utils/mocks";
import {
  createMockMembership,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  expectAuditLogCreate,
  getAuditLogMock,
  getMembershipMock,
} from "../../utils/testUtils";

const readFileSyncMock = jest.fn();
const readWorkbookMock = jest.fn();
const sheetToJsonMock = jest.fn();
const getActiveTermIdMock = jest.fn();
const getGovernanceConfigMock = jest.fn();
const ensureSeatsExistMock = jest.fn();
const assignNextAvailableSeatMock = jest.fn();

jest.mock("fs", () => ({
  readFileSync: (...args: unknown[]) => readFileSyncMock(...args),
}));

jest.mock("xlsx", () => ({
  read: (...args: unknown[]) => readWorkbookMock(...args),
  utils: {
    sheet_to_json: (...args: unknown[]) => sheetToJsonMock(...args),
  },
}));

jest.mock("~/app/api/lib/committeeValidation", () => ({
  getActiveTermId: () => getActiveTermIdMock(),
  getGovernanceConfig: () => getGovernanceConfigMock(),
}));

jest.mock("~/app/api/lib/seatUtils", () => ({
  ensureSeatsExist: (...args: unknown[]) => ensureSeatsExistMock(...args),
  assignNextAvailableSeat: (...args: unknown[]) =>
    assignNextAvailableSeatMock(...args),
}));

describe("bulkLoadCommittees/loadCommitteeLists utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    readFileSyncMock.mockReturnValue(Buffer.from("fake-xlsx"));
    readWorkbookMock.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });
    getActiveTermIdMock.mockResolvedValue(DEFAULT_ACTIVE_TERM_ID);
    getGovernanceConfigMock.mockResolvedValue({
      id: "mcdc-default",
      maxSeatsPerLted: 4,
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
      expect.objectContaining({
        data: expect.objectContaining({
          voterRecordId: "VRC001",
          committeeListId: 101,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      }),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_ACTIVATED",
        entityType: "CommitteeMembership",
        metadata: expect.objectContaining({
          source: "bulk_import_sync",
        }) as unknown,
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
      expect.objectContaining({
        where: { id: "m-existing" },
        data: expect.objectContaining({
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 2,
        }),
      }),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_ACTIVATED",
        entityType: "CommitteeMembership",
        metadata: expect.objectContaining({
          source: "bulk_import_sync",
        }) as unknown,
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
      expect.objectContaining({
        where: { id: "m-to-remove" },
        data: expect.objectContaining({
          status: "REMOVED",
          removalReason: "OTHER",
        }),
      }),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        entityType: "CommitteeMembership",
        metadata: expect.objectContaining({
          source: "bulk_import_sync",
          reason: "not_in_import_file",
        }) as unknown,
      }),
    );
  });
});
