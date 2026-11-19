/**
 * An import records how each member actually got their seat: a created membership takes the
 * canonical entry's `membershipType` rather than a constant. Existing memberships are not
 * rewritten — a reactivation keeps the type it already has.
 */
import { applyRosterImport } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
import { prismaMock } from "../../utils/mocks";
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
  jsonContaining,
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
  ensureSeatsExist: jest.fn(),
  assignNextAvailableSeat: jest.fn(),
  markSeatPetitioned: jest.fn(),
}));

const getActiveTermMock = jest.mocked(committeeValidation.getActiveTerm);
const getGovernanceConfigMock = jest.mocked(
  committeeValidation.getGovernanceConfig,
);
const ensureSeatsExistMock = jest.mocked(seatUtils.ensureSeatsExist);
const assignNextAvailableSeatMock = jest.mocked(
  seatUtils.assignNextAvailableSeat,
);
const markSeatPetitionedMock = jest.mocked(seatUtils.markSeatPetitioned);

const seatedAs = (
  membershipType: RosterEntry["membershipType"],
  seatNumber = 1,
) => ({
  committeeListId: 101,
  termId: DEFAULT_ACTIVE_TERM_ID,
  status: "ACTIVE",
  membershipType,
  seatNumber,
});

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
          afterValue: jsonContaining({
            membershipType,
          }),
        }),
      );
      // The seat helper decides from the type; a PETITIONED member flags their seat.
      expect(markSeatPetitionedMock).toHaveBeenCalledWith(
        prismaMock,
        seatedAs(membershipType),
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
    expect(markSeatPetitionedMock).toHaveBeenCalledWith(
      prismaMock,
      seatedAs("APPOINTED"),
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
        afterValue: jsonContaining({
          membershipType: "PETITIONED",
        }),
      }),
    );
    expect(markSeatPetitionedMock).toHaveBeenCalledWith(
      prismaMock,
      seatedAs("PETITIONED"),
    );
  });

  it("keeps the petition result on a member who is already ACTIVE and flags their seat", async () => {
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(
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

    const updateCalls = getMembershipMock(prismaMock).update.mock
      .calls as Array<[{ data: Record<string, unknown> }]>;
    const [update] = updateCalls[0] ?? [];
    if (!update) throw new Error("expected a membership update");
    expect(update.data).toMatchObject({ status: "ACTIVE", seatNumber: 3 });
    expect(update.data).not.toHaveProperty("petitionVoteCount");
    expect(update.data).not.toHaveProperty("petitionPrimaryDate");
    expect(markSeatPetitionedMock).toHaveBeenCalledWith(
      prismaMock,
      seatedAs("PETITIONED", 3),
    );
  });
});
