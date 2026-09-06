/**
 * An import records how each member actually got their seat: a created membership takes the
 * canonical entry's `membershipType` rather than a constant. Existing memberships are not
 * rewritten — a reactivation keeps the type it already has.
 */
import { applyRosterImport } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
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

const getActiveTermMock = committeeValidation.getActiveTerm as jest.Mock;
const getGovernanceConfigMock =
  committeeValidation.getGovernanceConfig as jest.Mock;
const ensureSeatsExistMock = seatUtils.ensureSeatsExist as jest.Mock;
const assignNextAvailableSeatMock = seatUtils.assignNextAvailableSeat as jest.Mock;

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

    getActiveTermMock.mockResolvedValue({
      id: DEFAULT_ACTIVE_TERM_ID,
      label: "2024–2026",
    });
    getGovernanceConfigMock.mockResolvedValue({
      id: "mcdc-default",
      maxSeatsPerLted: 4,
    });
    prismaMock.voterRecord.findUnique.mockImplementation((args) =>
      Promise.resolve(
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
      ) as never,
    );
    prismaMock.voterRecord.findMany.mockImplementation((args) => {
      const ids = (args?.where?.VRCNUM as { in?: string[] })?.in ?? [];
      return Promise.resolve(
        ids.map((VRCNUM) => createMockVoterRecord({ VRCNUM })),
      ) as never;
    });
    prismaMock.committeeList.findUnique.mockResolvedValue(null as never);
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
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
    getMembershipMock(prismaMock).create.mockResolvedValue(
      createMockMembership({ id: "m-new", status: "ACTIVE", seatNumber: 1 }),
    );
    assignNextAvailableSeatMock.mockResolvedValue(1);
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
          afterValue: expect.objectContaining({
            membershipType,
          }) as Prisma.InputJsonValue,
        }),
      );
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
        afterValue: expect.objectContaining({
          membershipType: "PETITIONED",
        }) as Prisma.InputJsonValue,
      }),
    );
  });
});
