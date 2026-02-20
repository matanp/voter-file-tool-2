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

jest.mock("~/app/api/lib/committeeValidation", () => ({
  getActiveTermId: jest.fn(),
  getGovernanceConfig: jest.fn(),
}));

jest.mock("~/app/api/lib/seatUtils", () => ({
  ensureSeatsExist: jest.fn(),
  assignNextAvailableSeat: jest.fn(),
}));

const readFileSyncMock = fs.readFileSync as jest.Mock;
const readWorkbookMock = xlsx.read as jest.Mock;
const sheetToJsonMock = xlsx.utils.sheet_to_json as jest.Mock;
const getActiveTermIdMock = committeeValidation.getActiveTermId as jest.Mock;
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
});
