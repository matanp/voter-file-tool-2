/**
 * An Admin can find out what an import would do before it changes anything. These are the
 * importer's long-standing scenarios, asserted as plan outcomes rather than as writes.
 */
import {
  applyRosterImport,
  planRosterImport,
} from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
import { prismaMock } from "../../utils/mocks";
import {
  createMockCommitteeTerm,
  createMockGovernanceConfig,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
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

let nextSourceRow = 2;

const rosterEntry = (
  vrcnum: string,
  cityTown: string,
  electionDistrict = 1,
): RosterEntry => ({
  vrcnum,
  committee: { cityTown, legDistrict: 1, electionDistrict },
  claimed: {
    name: "JOHN DOE",
    address1: "123 Main St",
    city: "Testville",
    state: "NY",
    zip: "14604",
  },
  membershipType: "PETITIONED",
  sourceRow: nextSourceRow++,
});

/** A voter whose voter-file record matches what every fixture entry claims. */
const matchingVoter = (VRCNUM: string) =>
  createMockVoterRecord({
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
  });

/** What the importer selects when it looks a committee up. */
type CommitteeIdRow = { id: number };

/** What the importer selects from the memberships it reconciles. */
type ActiveMembershipRow = { voterRecordId: string; committeeListId: number };
type CommitteeMemberRow = { id: string; voterRecordId: string };

/** No CommitteeList row exists for any committee unless a test says otherwise. */
const committeeExists = (
  rows: { cityTown: string; electionDistrict: number; id: number }[],
) => {
  prismaMock.committeeList.findUnique.mockImplementation((args) => {
    const key = (
      args.where as {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown: string;
          electionDistrict: number;
        };
      }
    ).cityTown_legDistrict_electionDistrict_termId;
    const match = rows.find(
      (row) =>
        row.cityTown === key.cityTown &&
        row.electionDistrict === key.electionDistrict,
    );
    return resolvesTo<CommitteeIdRow | null>(
      match ? { id: match.id } : null,
    );
  });
};

const expectNoWrites = () => {
  expect(prismaMock.$transaction).not.toHaveBeenCalled();
  expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
  expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
  expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
  expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalled();
};

describe("planRosterImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nextSourceRow = 2;

    getActiveTermMock.mockResolvedValue(createMockCommitteeTerm());
    getGovernanceConfigMock.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
    );
    prismaMock.voterRecord.findUnique.mockImplementation((args) =>
      resolvesTo(matchingVoter((args.where as { VRCNUM: string }).VRCNUM)),
    );
    prismaMock.voterRecord.findMany.mockImplementation((args) => {
      const ids = (args?.where?.VRCNUM as { in?: string[] })?.in ?? [];
      return resolvesTo(ids.map((VRCNUM) => matchingVoter(VRCNUM)));
    });
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    committeeExists([]);
    assignNextAvailableSeatMock.mockResolvedValue(1);
    ensureSeatsExistMock.mockResolvedValue(undefined);
  });

  it("plans an activation for every row of a clean roster, and writes nothing", async () => {
    const plan = await planRosterImport({
      entries: [rosterEntry("VRC001", "TEST CITY"), rosterEntry("VRC002", "TEST CITY")],
      rejected: [],
    });

    expect(plan.activations).toEqual([
      {
        voterRecordId: "VRC001",
        committee: {
          cityTown: "TEST CITY",
          legDistrict: 1,
          electionDistrict: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
        },
        membershipType: "PETITIONED",
      },
      {
        voterRecordId: "VRC002",
        committee: {
          cityTown: "TEST CITY",
          legDistrict: 1,
          electionDistrict: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
        },
        membershipType: "PETITIONED",
      },
    ]);
    expect(plan.removals).toEqual([]);
    expect(plan.discrepancies.size).toBe(0);
    expect(plan.capacityFailures).toEqual([]);
    expect(plan.counts).toEqual({
      entries: 2,
      matchedVoters: 2,
      activations: 2,
      removals: 0,
      discrepancies: 0,
      rejectedRows: 0,
    });
    expectNoWrites();
  });

  it("carries the parser's rejected rows onto the plan", async () => {
    const plan = await planRosterImport({
      entries: [rosterEntry("VRC001", "TEST CITY")],
      rejected: [{ sourceRow: 7, reason: "Missing voter id" }],
    });

    expect(plan.rejectedRows).toEqual([
      { sourceRow: 7, reason: "Missing voter id" },
    ]);
    expect(plan.counts.rejectedRows).toBe(1);
    expect(plan.counts.activations).toBe(1);
  });

  it("plans a discrepancy, not a membership, for a voter missing from the voter file", async () => {
    prismaMock.voterRecord.findUnique.mockResolvedValue(null);

    const plan = await planRosterImport({
      entries: [rosterEntry("VRC_MISSING", "TEST CITY")],
      rejected: [],
    });

    expect(plan.activations).toEqual([]);
    expect(plan.discrepancies.get("VRC_MISSING")?.discrepancies.VRCNUM).toEqual(
      expect.objectContaining({ incoming: "VRC_MISSING", existing: "" }),
    );
    expect(plan.counts.matchedVoters).toBe(0);
    expectNoWrites();
  });

  it("plans a discrepancy for a voter already active in another committee this term", async () => {
    committeeExists([
      { cityTown: "TEST CITY", electionDistrict: 1, id: 101 },
      { cityTown: "OTHER CITY", electionDistrict: 2, id: 202 },
    ]);
    getMembershipMock(prismaMock).findMany.mockImplementation((args) => {
      const where = args.where as {
        voterRecordId?: { in?: string[] };
        committeeListId?: number;
      };
      if (where.voterRecordId?.in) {
        return Promise.resolve([
          { voterRecordId: "VRC_ELSEWHERE", committeeListId: 202 },
        ] satisfies ActiveMembershipRow[]);
      }
      return Promise.resolve([]);
    });

    const plan = await planRosterImport({
      entries: [rosterEntry("VRC_ELSEWHERE", "TEST CITY")],
      rejected: [],
    });

    expect(plan.activations).toEqual([]);
    expect(
      plan.discrepancies.get("VRC_ELSEWHERE")?.discrepancies
        .alreadyActiveInAnotherCommittee,
    ).toEqual(
      expect.objectContaining({
        existing: "Voter is already active in another committee for this term",
      }),
    );
    expectNoWrites();
  });

  it("plans a discrepancy for a voter the file places in two committees", async () => {
    const plan = await planRosterImport({
      entries: [
        rosterEntry("VRC_DUP", "CITY ONE", 1),
        rosterEntry("VRC_DUP", "CITY TWO", 2),
      ],
      rejected: [],
    });

    expect(plan.activations).toEqual([]);
    expect(
      plan.discrepancies.get("VRC_DUP")?.discrepancies.committeeAssignmentConflict,
    ).toEqual(
      expect.objectContaining({
        incoming: "CITY ONE-1-1 | CITY TWO-1-2",
        existing: "Voter appears in multiple committees in the same bulk import",
      }),
    );
    expectNoWrites();
  });

  it("keeps both claimed-field and cross-committee reasons and activates the voter nowhere", async () => {
    const mismatchedEntry = rosterEntry("VRC_DUP", "CITY ONE", 1);
    mismatchedEntry.claimed.name = "JANE DOE";

    const plan = await planRosterImport({
      entries: [mismatchedEntry, rosterEntry("VRC_DUP", "CITY TWO", 2)],
      rejected: [],
    });

    expect(plan.activations).toEqual([]);
    const discrepancies = plan.discrepancies.get("VRC_DUP")?.discrepancies;
    expect(discrepancies?.name).toEqual(
      expect.objectContaining({
        incoming: "JANE DOE",
        existing: "JOHN DOE",
      }),
    );
    expect(discrepancies?.committeeAssignmentConflict).toEqual(
      expect.objectContaining({
        incoming: "CITY ONE-1-1 | CITY TWO-1-2",
      }),
    );
    expectNoWrites();
  });

  it("keeps missing-voter and cross-committee reasons and activates the voter nowhere", async () => {
    prismaMock.voterRecord.findUnique.mockResolvedValue(null);

    const plan = await planRosterImport({
      entries: [
        rosterEntry("VRC_MISSING_DUP", "CITY ONE", 1),
        rosterEntry("VRC_MISSING_DUP", "CITY TWO", 2),
      ],
      rejected: [],
    });

    expect(plan.activations).toEqual([]);
    const discrepancies =
      plan.discrepancies.get("VRC_MISSING_DUP")?.discrepancies;
    expect(discrepancies?.VRCNUM).toEqual(
      expect.objectContaining({ incoming: "VRC_MISSING_DUP", existing: "" }),
    );
    expect(discrepancies?.committeeAssignmentConflict).toBeDefined();
    expectNoWrites();
  });

  it("treats identical duplicate rows in one committee as one intended seat", async () => {
    getGovernanceConfigMock.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 1 }),
    );

    const plan = await planRosterImport({
      entries: [
        rosterEntry("VRC_DUP", "TEST CITY"),
        rosterEntry("VRC_DUP", "TEST CITY"),
      ],
      rejected: [],
    });

    expect(plan.committees).toEqual([
      expect.objectContaining({
        members: ["VRC_DUP"],
        importedMembers: ["VRC_DUP"],
      }),
    ]);
    expect(plan.activations).toHaveLength(1);
    expect(plan.capacityFailures).toEqual([]);
    expect(plan.discrepancies.size).toBe(0);
    expectNoWrites();
  });

  it("plans a removal, naming who it is, for an active member the file omits", async () => {
    committeeExists([{ cityTown: "TEST CITY", electionDistrict: 1, id: 301 }]);
    getMembershipMock(prismaMock).findMany.mockImplementation((args) => {
      const where = args.where as {
        voterRecordId?: { in?: string[] };
        committeeListId?: number;
      };
      if (where.committeeListId === 301) {
        return Promise.resolve([
          { id: "m-to-remove", voterRecordId: "VRC_OLD" },
        ] satisfies CommitteeMemberRow[]);
      }
      return Promise.resolve([]);
    });

    const plan = await planRosterImport({
      entries: [rosterEntry("VRC_NEW", "TEST CITY")],
      rejected: [],
    });

    expect(plan.removals).toEqual([
      {
        membershipId: "m-to-remove",
        voterRecordId: "VRC_OLD",
        name: "JOHN DOE",
        committee: {
          cityTown: "TEST CITY",
          legDistrict: 1,
          electionDistrict: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
        },
      },
    ]);
    expect(plan.counts.removals).toBe(1);
    expectNoWrites();
  });

  it("uses intended presence for removals even when the present voter has a field discrepancy", async () => {
    committeeExists([{ cityTown: "TEST CITY", electionDistrict: 1, id: 301 }]);
    getMembershipMock(prismaMock).findMany.mockImplementation(
      (args: {
        where: {
          committeeListId?: number;
        };
      }) => {
        const { where } = args;
        if (where.committeeListId === 301) {
          return Promise.resolve([
            { id: "m-present", voterRecordId: "VRC_PRESENT" },
            { id: "m-absent", voterRecordId: "VRC_ABSENT" },
          ] satisfies CommitteeMemberRow[]);
        }
        return Promise.resolve([]);
      },
    );
    const presentEntry = rosterEntry("VRC_PRESENT", "TEST CITY");
    presentEntry.claimed.name = "JANE DOE";

    const plan = await planRosterImport({
      entries: [presentEntry],
      rejected: [],
    });

    expect(plan.activations).toEqual([]);
    expect(plan.removals).toEqual([
      expect.objectContaining({
        membershipId: "m-absent",
        voterRecordId: "VRC_ABSENT",
      }),
    ]);
    expect(plan.removals).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ voterRecordId: "VRC_PRESENT" }),
      ]),
    );
    expect(
      plan.discrepancies.get("VRC_PRESENT")?.discrepancies.name,
    ).toBeDefined();
    expectNoWrites();
  });

  it("records a committee over the seat maximum as a capacity failure", async () => {
    getGovernanceConfigMock.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 2 }),
    );

    const discrepantEntry = rosterEntry("VRC003", "TEST CITY");
    discrepantEntry.claimed.name = "JANE DOE";

    const plan = await planRosterImport({
      entries: [
        rosterEntry("VRC001", "TEST CITY"),
        rosterEntry("VRC002", "TEST CITY"),
        discrepantEntry,
      ],
      rejected: [],
    });

    expect(plan.capacityFailures).toEqual([
      { committee: "TEST CITY-1-1", memberCount: 3, maxSeats: 2 },
    ]);
    expect(plan.discrepancies.get("VRC003")?.discrepancies.name).toBeDefined();
    expectNoWrites();
  });
});

describe("applyRosterImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nextSourceRow = 2;
    getActiveTermMock.mockResolvedValue(createMockCommitteeTerm());
    getGovernanceConfigMock.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 2 }),
    );
    prismaMock.voterRecord.findUnique.mockImplementation((args) =>
      resolvesTo(matchingVoter((args.where as { VRCNUM: string }).VRCNUM)),
    );
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    committeeExists([]);
  });

  it("fails the whole import, naming the committee, when one is over the seat maximum", async () => {
    const discrepantEntry = rosterEntry("VRC003", "TEST CITY");
    discrepantEntry.claimed.name = "JANE DOE";

    await expect(
      applyRosterImport({
        entries: [
          rosterEntry("VRC001", "TEST CITY"),
          rosterEntry("VRC002", "TEST CITY"),
          discrepantEntry,
        ],
        rejected: [],
      }),
    ).rejects.toMatchObject({
      name: "RosterCapacityError",
      message:
        "Committee TEST CITY-1-1 has 3 members, exceeding maxSeatsPerLted=2",
      capacityFailures: [
        { committee: "TEST CITY-1-1", memberCount: 3, maxSeats: 2 },
      ],
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
  });
});
