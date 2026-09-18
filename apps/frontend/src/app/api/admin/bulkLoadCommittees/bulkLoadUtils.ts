import prisma from "~/lib/prisma";
import {
  PrivilegeLevel,
  type CommitteeList,
  type MembershipType,
  type Prisma,
  type VoterRecord,
} from "@prisma/client";

import {
  type Discrepancy,
  type DiscrepanciesAndCommittee,
  findDiscrepancies,
  getName,
} from "../../lib/utils";
import type {
  RejectedRosterRow,
  RosterEntry,
  RosterParseResult,
} from "./rosterFormats/types";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  getActiveTerm,
  getGovernanceConfig,
  isActiveMembershipPerTermConflict,
  isVoterActiveInAnotherCommittee,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import { logAuditEventOrThrow, SYSTEM_USER_ID } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
  type AuditMembershipSubject,
} from "~/lib/auditMembershipSubject";

export type CommitteeAccumulationEntry = {
  data: Prisma.CommitteeListCreateManyInput;
  /**
   * Every canonical source row for each intended voter assignment. Keeping the rows here
   * makes identical duplicates one intended seat without throwing away where they came from.
   */
  sourceEntriesByVoter: Map<string, RosterEntry[]>;
};

/** Add a canonical source row to the in-memory LT/ED assignment index. */
export function accumulateCommitteeMember(
  committeeData: Map<string, CommitteeAccumulationEntry>,
  mapKey: string,
  committeeListInput: Prisma.CommitteeListCreateManyInput,
  entry: RosterEntry,
): void {
  const existingEntry = committeeData.get(mapKey);
  if (existingEntry) {
    const sourceEntries = existingEntry.sourceEntriesByVoter.get(entry.vrcnum);
    if (sourceEntries) {
      sourceEntries.push(entry);
    } else {
      existingEntry.sourceEntriesByVoter.set(entry.vrcnum, [entry]);
    }
    return;
  }

  committeeData.set(mapKey, {
    data: committeeListInput,
    sourceEntriesByVoter: new Map([[entry.vrcnum, [entry]]]),
  });
}

type CommitteeIdentity = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  termId: string;
};

type BulkLoadActor = {
  userId: string;
  userRole: PrivilegeLevel;
  activeTermId?: string;
};

/** One committee's share of an import, as planning worked it out. */
export type PlannedCommittee = {
  committee: CommitteeIdentity;
  /** The existing CommitteeList row, or null when the import would create it. */
  committeeListId: number | null;
  /** Every VRCNUM the file places here, including any the import will not activate. */
  members: string[];
  /** The VRCNUMs the import would activate here. */
  importedMembers: string[];
};

export type PlannedRemoval = {
  membershipId: string;
  voterRecordId: string;
  name: string;
  committee: CommitteeIdentity;
};

export type PlannedCapacityFailure = {
  committee: string;
  memberCount: number;
  maxSeats: number;
};

/**
 * What an import would do, computed without writing. Every field is data an Admin can read
 * before deciding to apply; nothing here is persisted.
 */
export type ImportPlan = {
  term: { id: string; label: string };
  maxSeatsPerLted: number;
  committees: PlannedCommittee[];
  /** The memberships the import would activate, and how each member won their seat. */
  activations: {
    voterRecordId: string;
    committee: CommitteeIdentity;
    membershipType: MembershipType;
  }[];
  removals: PlannedRemoval[];
  discrepancies: Map<string, DiscrepanciesAndCommittee>;
  rejectedRows: RejectedRosterRow[];
  /** Non-empty means the import fails rather than overfilling a committee. */
  capacityFailures: PlannedCapacityFailure[];
  counts: {
    entries: number;
    matchedVoters: number;
    activations: number;
    removals: number;
    discrepancies: number;
    rejectedRows: number;
  };
};

/**
 * What an apply actually did, accumulated from writes that committed. Kept apart from the
 * plan: the live guards inside each committee transaction can turn a planned activation
 * into a discrepancy, and the plan must go on saying what was planned so the two can be
 * compared rather than one silently rewritten to match the other.
 */
export type AppliedSummary = {
  activations: {
    voterRecordId: string;
    committee: CommitteeIdentity;
    membershipType: MembershipType;
    seatNumber: number | null;
  }[];
  removals: {
    membershipId: string;
    voterRecordId: string;
    committee: CommitteeIdentity;
  }[];
  /** Planned activations a live guard refused; each is also a discrepancy. */
  skippedActivations: {
    voterRecordId: string;
    committee: CommitteeIdentity;
    membershipType: MembershipType;
    reason: "active-elsewhere";
  }[];
  /** The plan's discrepancies plus any the live guards added. */
  discrepancies: Map<string, DiscrepanciesAndCommittee>;
  counts: {
    activations: number;
    removals: number;
    discrepancies: number;
    skippedActivations: number;
  };
};

export type ApplyRosterImportResult = {
  plan: ImportPlan;
  applied: AppliedSummary;
};

function formatCommitteeIdentity(committee: CommitteeIdentity): string {
  return `${committee.cityTown}-${committee.legDistrict}-${committee.electionDistrict}`;
}

/**
 * The row as the discrepancy record describes it, for an Admin resolving a VRCNUM that is
 * not in the voter file. Keys are the discrepancy record's own vocabulary, not any source
 * file's column names.
 */
function describeRosterEntry(entry: RosterEntry): Record<string, string> {
  return {
    name: entry.claimed.name,
    Add1: entry.claimed.address1,
    City: entry.claimed.city,
    State: entry.claimed.state,
    Zip: entry.claimed.zip,
    CityTown: entry.committee.cityTown,
    LT: String(entry.committee.legDistrict),
    ED: String(entry.committee.electionDistrict),
    sourceRow: String(entry.sourceRow),
  };
}

function ensureImportDiscrepancy(
  discrepanciesMap: Map<string, DiscrepanciesAndCommittee>,
  voterRecordId: string,
  committee: CommitteeIdentity,
  incomingMembershipType: MembershipType | null,
  key: string,
  incoming: string,
  existing: string,
) {
  mergeImportDiscrepancies(
    discrepanciesMap,
    voterRecordId,
    committee,
    incomingMembershipType,
    {
      [key]: {
        incoming,
        existing,
      },
    },
  );
}

/** Add reasons to a voter's discrepancy without losing reasons found in another pass. */
function mergeImportDiscrepancies(
  discrepanciesMap: Map<string, DiscrepanciesAndCommittee>,
  voterRecordId: string,
  committee: CommitteeIdentity,
  incomingMembershipType: MembershipType | null,
  discrepancies: Discrepancy,
): void {
  const existingEntry = discrepanciesMap.get(voterRecordId);
  const nextDiscrepancies = {
    ...(existingEntry?.discrepancies ?? {}),
    ...discrepancies,
  };

  discrepanciesMap.set(voterRecordId, {
    discrepancies: nextDiscrepancies,
    committee: existingEntry?.committee ?? {
      id: 0,
      cityTown: committee.cityTown,
      legDistrict: committee.legDistrict,
      electionDistrict: committee.electionDistrict,
      termId: committee.termId,
      ltedWeight: null,
    },
    incomingMembershipType:
      existingEntry?.incomingMembershipType ?? incomingMembershipType,
  });
}

const ALREADY_ACTIVE_ELSEWHERE =
  "Voter is already active in another committee for this term";

/**
 * Signals that one voter's activation hit the one-active-per-term unique index.
 * Thrown out of the committee transaction so Prisma rolls it back; catching
 * P2002 and continuing would leave PostgreSQL in an aborted-transaction state.
 */
class RosterActivationConflict extends Error {
  readonly voterRecordId: string;
  /** Where the activation was; a move activates outside the committee whose transaction runs. */
  readonly committee: CommitteeIdentity;
  readonly membershipType: MembershipType;

  constructor(
    voterRecordId: string,
    committee: CommitteeIdentity,
    membershipType: MembershipType,
  ) {
    super(ALREADY_ACTIVE_ELSEWHERE);
    this.name = "RosterActivationConflict";
    this.voterRecordId = voterRecordId;
    this.committee = committee;
    this.membershipType = membershipType;
  }
}

/** Unwraps a roster activation conflict, including when Prisma nests it as `cause`. */
function asRosterActivationConflict(
  error: unknown,
): RosterActivationConflict | null {
  if (error instanceof RosterActivationConflict) {
    return error;
  }
  if (
    error instanceof Error &&
    error.cause instanceof RosterActivationConflict
  ) {
    return error.cause;
  }
  return null;
}

/**
 * Converts a one-active-per-term unique-constraint failure into a typed conflict.
 * Always throws: the transaction is already aborted and must not be reused.
 */
function throwActivationConflict(
  error: unknown,
  voterRecordId: string,
  committee: CommitteeIdentity,
  membershipType: MembershipType,
): never {
  if (isActiveMembershipPerTermConflict(error)) {
    throw new RosterActivationConflict(
      voterRecordId,
      committee,
      membershipType,
    );
  }
  throw error;
}

function flagActiveElsewhere(
  discrepanciesMap: Map<string, DiscrepanciesAndCommittee>,
  voterRecordId: string,
  committee: CommitteeIdentity,
  incomingMembershipType: MembershipType | null,
) {
  ensureImportDiscrepancy(
    discrepanciesMap,
    voterRecordId,
    committee,
    incomingMembershipType,
    "alreadyActiveInAnotherCommittee",
    formatCommitteeIdentity(committee),
    ALREADY_ACTIVE_ELSEWHERE,
  );
}

async function resolveActiveTerm(
  actor: BulkLoadActor,
): Promise<{ id: string; label: string }> {
  if (actor.activeTermId != null) {
    const term = await prisma.committeeTerm.findUnique({
      where: { id: actor.activeTermId },
      select: { id: true, label: true },
    });
    if (!term) {
      throw new Error("Active term not found");
    }
    return term;
  }
  const term = await getActiveTerm();
  return { id: term.id, label: term.label };
}

const DEFAULT_ACTOR: BulkLoadActor = {
  userId: SYSTEM_USER_ID,
  userRole: PrivilegeLevel.Admin,
};

/**
 * Works out what importing these entries would do, reading the database but writing
 * nothing. Applying an import recomputes this rather than trusting a plan handed back to
 * it, because the database can change between the two.
 */
export async function planRosterImport(
  parseResult: RosterParseResult,
  actor: BulkLoadActor = DEFAULT_ACTOR,
): Promise<ImportPlan> {
  const { entries, rejected } = parseResult;
  const activeTerm = await resolveActiveTerm(actor);
  const activeTermId = activeTerm.id;
  const config = await getGovernanceConfig();

  const committeeData = new Map<string, CommitteeAccumulationEntry>();
  const discrepanciesMap = new Map<string, DiscrepanciesAndCommittee>();
  // How the file says each voter won their seat, for the memberships the import creates.
  const membershipTypeByVoter = new Map<string, MembershipType>();
  let matchedVoters = 0;

  // Build source presence first. Voter-file comparison must not erase the fact that a
  // structurally valid row assigns this VRCNUM to this committee.
  for (const entry of entries) {
    const { cityTown, legDistrict, electionDistrict } = entry.committee;
    const VRCNUM = entry.vrcnum;
    membershipTypeByVoter.set(VRCNUM, entry.membershipType);

    accumulateCommitteeMember(
      committeeData,
      `${cityTown}-${legDistrict}-${electionDistrict}`,
      {
        cityTown,
        legDistrict,
        electionDistrict,
        termId: activeTermId,
      },
      entry,
    );
  }

  const voterAssignments = new Map<string, CommitteeIdentity[]>();

  for (const value of committeeData.values()) {
    const committeeIdentity: CommitteeIdentity = {
      cityTown: value.data.cityTown,
      legDistrict: value.data.legDistrict,
      electionDistrict: value.data.electionDistrict,
      termId: activeTermId,
    };
    for (const voterRecordId of value.sourceEntriesByVoter.keys()) {
      const existingAssignments = voterAssignments.get(voterRecordId) ?? [];
      existingAssignments.push(committeeIdentity);
      voterAssignments.set(voterRecordId, existingAssignments);
    }
  }

  const activationIneligibleVoters = new Set<string>();
  for (const [voterRecordId, assignments] of voterAssignments.entries()) {
    if (assignments.length <= 1) continue;
    activationIneligibleVoters.add(voterRecordId);
    ensureImportDiscrepancy(
      discrepanciesMap,
      voterRecordId,
      assignments[0]!,
      membershipTypeByVoter.get(voterRecordId) ?? null,
      "committeeAssignmentConflict",
      assignments
        .map((assignment) => formatCommitteeIdentity(assignment))
        .join(" | "),
      "Voter appears in multiple committees in the same bulk import",
    );
  }

  // Compare claims only after the complete source-assignment index exists. Ordinary
  // discrepancies add another reason and make the voter ineligible for activation, but
  // they do not change intended presence or capacity.
  for (const entry of entries) {
    const { cityTown, legDistrict, electionDistrict } = entry.committee;
    const VRCNUM = entry.vrcnum;
    const committee: CommitteeIdentity = {
      cityTown,
      legDistrict,
      electionDistrict,
      termId: activeTermId,
    };

    const existingRecord = await prisma.voterRecord.findUnique({
      where: {
        VRCNUM,
      },
    });

    if (existingRecord) {
      matchedVoters++;
      const discrepancies = findDiscrepancies(entry.claimed, existingRecord);

      if (discrepancies && Object.keys(discrepancies).length > 0) {
        mergeImportDiscrepancies(
          discrepanciesMap,
          VRCNUM,
          committee,
          entry.membershipType,
          discrepancies,
        );
        activationIneligibleVoters.add(VRCNUM);
      }
    } else {
      mergeImportDiscrepancies(
        discrepanciesMap,
        VRCNUM,
        committee,
        entry.membershipType,
        {
          VRCNUM: {
            incoming: VRCNUM,
            existing: "",
            fullRow: describeRosterEntry(entry),
          },
        },
      );
      // Missing voter rows are discrepancies only — never create CommitteeMembership.
      activationIneligibleVoters.add(VRCNUM);
    }
  }

  const importedVoterIds = Array.from(voterAssignments.keys()).filter(
    (voterRecordId) => !activationIneligibleVoters.has(voterRecordId),
  );

  const activeMemberships = importedVoterIds.length
    ? await prisma.committeeMembership.findMany({
        where: {
          voterRecordId: { in: importedVoterIds },
          termId: activeTermId,
          status: ACTIVE_MEMBERSHIP_STATUS,
        },
        select: {
          voterRecordId: true,
          committeeListId: true,
        },
      })
    : [];

  const initiallyActiveCommittees = new Map<string, Set<number>>();
  for (const membership of activeMemberships) {
    const existing = initiallyActiveCommittees.get(membership.voterRecordId);
    if (existing) {
      existing.add(membership.committeeListId);
      continue;
    }
    initiallyActiveCommittees.set(
      membership.voterRecordId,
      new Set([membership.committeeListId]),
    );
  }

  // Which CommitteeList rows the file's committees already have, resolved up front so the
  // active-elsewhere check can tell a committee this file reconciles from one it never
  // mentions.
  const committeeListIdByKey = new Map<string, number | null>();
  for (const [mapKey, value] of committeeData.entries()) {
    const existingCommittee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown: value.data.cityTown,
          legDistrict: value.data.legDistrict,
          electionDistrict: value.data.electionDistrict,
          termId: activeTermId,
        },
      },
      select: { id: true },
    });
    committeeListIdByKey.set(mapKey, existingCommittee?.id ?? null);
  }
  const committeeListIdsInFile = new Set(
    Array.from(committeeListIdByKey.values()).filter(
      (id): id is number => id !== null,
    ),
  );

  const committees: PlannedCommittee[] = [];
  const activations: ImportPlan["activations"] = [];
  const capacityFailures: PlannedCapacityFailure[] = [];
  const removalsWithoutNames: Omit<PlannedRemoval, "name">[] = [];

  for (const [mapKey, value] of committeeData.entries()) {
    const committee: CommitteeIdentity = {
      cityTown: value.data.cityTown,
      legDistrict: value.data.legDistrict,
      electionDistrict: value.data.electionDistrict,
      termId: activeTermId,
    };
    const members = Array.from(value.sourceEntriesByVoter.keys());
    const activationCandidates = members.filter(
      (voterRecordId) => !activationIneligibleVoters.has(voterRecordId),
    );

    const committeeListId = committeeListIdByKey.get(mapKey) ?? null;

    // Over capacity stops the import before any writes, so the active-elsewhere check below
    // is skipped here and importedMembers may be slightly optimistic on the dry-run plan.
    if (members.length > config.maxSeatsPerLted) {
      capacityFailures.push({
        committee: formatCommitteeIdentity(committee),
        memberCount: members.length,
        maxSeats: config.maxSeatsPerLted,
      });
      committees.push({
        committee,
        committeeListId,
        members,
        importedMembers: activationCandidates,
      });
      continue;
    }

    // Anyone currently active here whom the file does not list would be removed.
    if (committeeListId !== null) {
      const memberSet = new Set(members);
      const existingActiveMemberships =
        await prisma.committeeMembership.findMany({
          where: {
            committeeListId,
            termId: activeTermId,
            status: ACTIVE_MEMBERSHIP_STATUS,
          },
          select: { id: true, voterRecordId: true },
        });

      for (const membership of existingActiveMemberships) {
        if (memberSet.has(membership.voterRecordId)) continue;
        removalsWithoutNames.push({
          membershipId: membership.id,
          voterRecordId: membership.voterRecordId,
          committee,
        });
      }
    }

    const importedMembers: string[] = [];
    for (const voterRecordId of activationCandidates) {
      // A committee the file also names is one this plan reconciles: an activation
      // candidate cannot be listed there too (that would be an assignment conflict
      // above), so the plan removes them from it and they are moving, not blocked.
      // Only a committee the file never mentions holds a seat the import will not free.
      const activeElsewhere = Array.from(
        initiallyActiveCommittees.get(voterRecordId) ?? [],
      ).some(
        (otherCommitteeId) =>
          otherCommitteeId !== committeeListId &&
          !committeeListIdsInFile.has(otherCommitteeId),
      );

      if (activeElsewhere) {
        flagActiveElsewhere(
          discrepanciesMap,
          voterRecordId,
          committee,
          membershipTypeByVoter.get(voterRecordId) ?? null,
        );
        continue;
      }

      importedMembers.push(voterRecordId);
      activations.push({
        voterRecordId,
        committee,
        membershipType: membershipTypeByVoter.get(voterRecordId) ?? "APPOINTED",
      });
    }

    committees.push({ committee, committeeListId, members, importedMembers });
  }

  const removals = await attachRemovalNames(removalsWithoutNames);

  return {
    term: activeTerm,
    maxSeatsPerLted: config.maxSeatsPerLted,
    committees,
    activations,
    removals,
    discrepancies: discrepanciesMap,
    rejectedRows: rejected,
    capacityFailures,
    counts: {
      entries: entries.length,
      matchedVoters,
      activations: activations.length,
      removals: removals.length,
      discrepancies: discrepanciesMap.size,
      rejectedRows: rejected.length,
    },
  };
}

/** Names the people an import would remove, so a mass removal announces who it is. */
async function attachRemovalNames(
  removals: Omit<PlannedRemoval, "name">[],
): Promise<PlannedRemoval[]> {
  if (removals.length === 0) return [];

  const voters = await prisma.voterRecord.findMany({
    where: {
      VRCNUM: { in: Array.from(new Set(removals.map((r) => r.voterRecordId))) },
    },
    select: {
      VRCNUM: true,
      firstName: true,
      middleInitial: true,
      lastName: true,
    },
  });
  const nameById = new Map(
    voters.map((voter) => [voter.VRCNUM, getName(voter)]),
  );

  return removals.map((removal) => ({
    ...removal,
    name: nameById.get(removal.voterRecordId) ?? "",
  }));
}

/**
 * An apply request refused because the plan would overfill at least one committee. Thrown
 * before any write, and carrying every failure so the route can answer with all of them
 * rather than only the committee the message names.
 */
export class RosterCapacityError extends Error {
  readonly capacityFailures: PlannedCapacityFailure[];

  constructor(capacityFailures: PlannedCapacityFailure[]) {
    const failure = capacityFailures[0]!;
    super(
      `Committee ${failure.committee} has ${failure.memberCount} members, exceeding maxSeatsPerLted=${failure.maxSeats}`,
    );
    this.name = "RosterCapacityError";
    this.capacityFailures = capacityFailures;
  }
}

function assertWithinCapacity(plan: ImportPlan): void {
  if (plan.capacityFailures.length === 0) return;
  throw new RosterCapacityError(plan.capacityFailures);
}

/** Marks an active membership removed because the file no longer lists it, and audits that. */
async function removeMembershipForSync(
  tx: Prisma.TransactionClient,
  actor: BulkLoadActor,
  membership: { id: string; voterRecordId: string },
  context: { committeeId: number; subject: AuditMembershipSubject },
): Promise<void> {
  await tx.committeeMembership.update({
    where: { id: membership.id },
    data: {
      status: "REMOVED",
      removedAt: new Date(),
      removalReason: "OTHER",
      removalNotes: "Removed by bulk import synchronization",
      seatNumber: null,
    },
  });
  await logAuditEventOrThrow(
    actor.userId,
    actor.userRole,
    "MEMBER_REMOVED",
    "CommitteeMembership",
    membership.id,
    { status: ACTIVE_MEMBERSHIP_STATUS },
    { status: "REMOVED", removalReason: "OTHER" },
    mergeAuditMetadata(
      {
        source: "bulk_import_sync",
        reason: "not_in_import_file",
        committeeId: context.committeeId,
      },
      context.subject,
    ),
    tx,
  );
}

type PlannedMoveRemoval = PlannedRemoval & { committeeListId: number };

/**
 * One voter's planned move: the source membership(s) the file no longer lists and the
 * committee in the file that now claims them. Keeping both halves together lets whichever
 * committee's transaction reaches the move first perform it whole: either the voter moves
 * and both audit events commit, or neither does.
 */
type PlannedMove = {
  voterRecordId: string;
  membershipType: MembershipType;
  destination: PlannedCommittee;
  removals: PlannedMoveRemoval[];
};

/** Every planned move, keyed by the moving voter. */
function plannedMovesByVoter(plan: ImportPlan): Map<string, PlannedMove> {
  const plannedByKey = new Map(
    plan.committees.map(
      (planned) =>
        [formatCommitteeIdentity(planned.committee), planned] as const,
    ),
  );
  const removalsByVoter = new Map<string, PlannedMoveRemoval[]>();
  for (const removal of plan.removals) {
    const committeeListId = plannedByKey.get(
      formatCommitteeIdentity(removal.committee),
    )?.committeeListId;
    if (committeeListId === undefined || committeeListId === null) continue;
    const removals = removalsByVoter.get(removal.voterRecordId) ?? [];
    removals.push({ ...removal, committeeListId });
    removalsByVoter.set(removal.voterRecordId, removals);
  }

  const moves = new Map<string, PlannedMove>();
  for (const activation of plan.activations) {
    const removals = removalsByVoter.get(activation.voterRecordId);
    const destination = plannedByKey.get(
      formatCommitteeIdentity(activation.committee),
    );
    if (!removals || !destination) continue;
    moves.set(activation.voterRecordId, {
      voterRecordId: activation.voterRecordId,
      membershipType: activation.membershipType,
      destination,
      removals,
    });
  }
  return moves;
}

/**
 * Locks the given committee rows, always in numeric order so that transactions sharing
 * committees cannot deadlock. Re-locking a row this transaction already holds is a no-op.
 */
async function lockCommittees(
  tx: Prisma.TransactionClient,
  committeeIds: Iterable<number>,
): Promise<void> {
  const ids = Array.from(new Set(committeeIds)).sort(
    (left, right) => left - right,
  );
  for (const committeeId of ids) {
    await tx.$queryRaw`
      SELECT id
      FROM "CommitteeList"
      WHERE id = ${committeeId}
      FOR UPDATE
    `;
  }
}

type CommitteeRow = Pick<
  CommitteeList,
  "id" | "cityTown" | "legDistrict" | "electionDistrict"
>;
type VoterNameRow = Pick<
  VoterRecord,
  "VRCNUM" | "firstName" | "middleInitial" | "lastName"
>;

type ActivationContext = {
  tx: Prisma.TransactionClient;
  actor: BulkLoadActor;
  term: ImportPlan["term"];
  maxSeats: number;
};

/**
 * Seats one voter in a committee and audits it. A membership row that already exists for
 * this voter and committee is reactivated in place; otherwise one is created. Throws
 * RosterActivationConflict when the one-active-per-term index refuses the write.
 */
async function activateMember(
  { tx, actor, term, maxSeats }: ActivationContext,
  committee: CommitteeRow,
  voterRecord: VoterNameRow,
  plannedMembershipType: MembershipType,
): Promise<AppliedSummary["activations"][number]> {
  const voterRecordId = voterRecord.VRCNUM;
  const committeeIdentity: CommitteeIdentity = {
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
    termId: term.id,
  };
  const subject = (seatNumber: number | null): AuditMembershipSubject =>
    buildMembershipAuditSubject({
      voterRecord,
      committee,
      term,
      seatNumber,
    });

  const existingMembership = await tx.committeeMembership.findUnique({
    where: {
      voterRecordId_committeeListId_termId: {
        voterRecordId,
        committeeListId: committee.id,
        termId: term.id,
      },
    },
  });

  let seatNumber = existingMembership?.seatNumber ?? null;
  if (
    !(
      existingMembership?.status === ACTIVE_MEMBERSHIP_STATUS &&
      seatNumber !== null
    )
  ) {
    seatNumber = await assignNextAvailableSeat(committee.id, term.id, {
      tx,
      maxSeats,
    });
  }

  if (existingMembership) {
    // Existing memberships are not rewritten: a membership that already records how
    // its member won the seat keeps that, and only an untyped one takes the file's.
    const membershipType: MembershipType =
      existingMembership.membershipType ?? plannedMembershipType;
    try {
      await tx.committeeMembership.update({
        where: { id: existingMembership.id },
        data: {
          status: ACTIVE_MEMBERSHIP_STATUS,
          activatedAt: existingMembership.activatedAt ?? new Date(),
          membershipType,
          seatNumber,
          confirmedAt: null,
          resignedAt: null,
          removedAt: null,
          rejectedAt: null,
          rejectionNote: null,
          resignationDateReceived: null,
          resignationMethod: null,
          removalReason: null,
          removalNotes: null,
          petitionVoteCount: null,
          petitionPrimaryDate: null,
        },
      });
    } catch (error) {
      throwActivationConflict(
        error,
        voterRecordId,
        committeeIdentity,
        plannedMembershipType,
      );
    }
    await logAuditEventOrThrow(
      actor.userId,
      actor.userRole,
      "MEMBER_ACTIVATED",
      "CommitteeMembership",
      existingMembership.id,
      { status: existingMembership.status },
      {
        status: ACTIVE_MEMBERSHIP_STATUS,
        membershipType,
        seatNumber,
      },
      mergeAuditMetadata(
        {
          source: "bulk_import_sync",
          committeeId: committee.id,
        },
        subject(seatNumber),
      ),
      tx,
    );
    return {
      voterRecordId,
      committee: committeeIdentity,
      membershipType,
      seatNumber,
    };
  }

  const membershipType: MembershipType = plannedMembershipType;
  let createdMembership;
  try {
    createdMembership = await tx.committeeMembership.create({
      data: {
        voterRecordId,
        committeeListId: committee.id,
        termId: term.id,
        status: ACTIVE_MEMBERSHIP_STATUS,
        activatedAt: new Date(),
        membershipType,
        seatNumber,
      },
    });
  } catch (error) {
    throwActivationConflict(
      error,
      voterRecordId,
      committeeIdentity,
      plannedMembershipType,
    );
  }
  await logAuditEventOrThrow(
    actor.userId,
    actor.userRole,
    "MEMBER_ACTIVATED",
    "CommitteeMembership",
    createdMembership.id,
    null,
    {
      status: ACTIVE_MEMBERSHIP_STATUS,
      membershipType,
      seatNumber,
    },
    mergeAuditMetadata(
      {
        source: "bulk_import_sync",
        committeeId: committee.id,
      },
      subject(seatNumber),
    ),
    tx,
  );
  return {
    voterRecordId,
    committee: committeeIdentity,
    membershipType,
    seatNumber,
  };
}

/**
 * Removes the destination's active members the file no longer lists, so a mover seated
 * from the source committee's transaction finds the same free seats the destination's
 * own transaction would have made. Members that are themselves planned moves are left
 * for their own move to clear.
 */
async function removeStaleMembers(
  { tx, actor, term }: ActivationContext,
  committee: CommitteeRow,
  intendedMembers: Iterable<string>,
  isPlannedMoveSource: (membershipId: string) => boolean,
): Promise<AppliedSummary["removals"]> {
  const intendedSet = new Set(intendedMembers);
  const activeMemberships = await tx.committeeMembership.findMany({
    where: {
      committeeListId: committee.id,
      termId: term.id,
      status: ACTIVE_MEMBERSHIP_STATUS,
    },
    select: { id: true, voterRecordId: true },
  });
  const stale = activeMemberships.filter(
    (membership) =>
      !intendedSet.has(membership.voterRecordId) &&
      !isPlannedMoveSource(membership.id),
  );
  // Known limitation: an outgoing mover still occupies a full destination's seat.
  // An A→B→C chain can fail before B→C runs; see .scratch/committee-roster-import/issues/19-chained-roster-moves.md.
  if (stale.length === 0) return [];

  const voters = await tx.voterRecord.findMany({
    where: {
      VRCNUM: { in: stale.map((membership) => membership.voterRecordId) },
    },
    select: {
      VRCNUM: true,
      firstName: true,
      middleInitial: true,
      lastName: true,
    },
  });
  const voterById = new Map(voters.map((voter) => [voter.VRCNUM, voter]));
  const committeeIdentity: CommitteeIdentity = {
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
    termId: term.id,
  };

  const removals: AppliedSummary["removals"] = [];
  for (const membership of stale) {
    const voterRecord = voterById.get(membership.voterRecordId);
    if (!voterRecord) {
      throw new Error(
        `Voter not found for bulk import audit: ${membership.voterRecordId}`,
      );
    }
    await removeMembershipForSync(tx, actor, membership, {
      committeeId: committee.id,
      subject: buildMembershipAuditSubject({
        voterRecord,
        committee,
        term,
        seatNumber: null,
      }),
    });
    removals.push({
      membershipId: membership.id,
      voterRecordId: membership.voterRecordId,
      committee: committeeIdentity,
    });
  }
  return removals;
}

/**
 * Performs the writes an import plan describes. The plan is recomputed here rather than
 * accepted as an input, because the database can change between planning and applying.
 */
export async function applyRosterImport(
  parseResult: RosterParseResult,
  actor: BulkLoadActor = DEFAULT_ACTOR,
): Promise<ApplyRosterImportResult> {
  const plan = await planRosterImport(parseResult, actor);
  assertWithinCapacity(plan);

  const activeTerm = plan.term;
  const activeTermId = activeTerm.id;
  // A copy, so a live guard adding a discrepancy does not rewrite the plan.
  const discrepanciesMap = new Map(plan.discrepancies);
  const applied: AppliedSummary = {
    activations: [],
    removals: [],
    skippedActivations: [],
    discrepancies: discrepanciesMap,
    counts: {
      activations: 0,
      removals: 0,
      discrepancies: 0,
      skippedActivations: 0,
    },
  };

  const movesByVoter = plannedMovesByVoter(plan);
  const moveByMembershipId = new Map(
    Array.from(movesByVoter.values()).flatMap((move) =>
      move.removals.map((removal) => [removal.membershipId, move] as const),
    ),
  );
  // Moves no later transaction may touch again: performed whole by whichever committee's
  // transaction reached them first (source or destination), or abandoned after a live
  // conflict. Only updated once that transaction has committed or rolled back.
  const settledMoves = new Set<string>();

  for (const planned of plan.committees) {
    const committeeList: Prisma.CommitteeListCreateManyInput = {
      cityTown: planned.committee.cityTown,
      legDistrict: planned.committee.legDistrict,
      electionDistrict: planned.committee.electionDistrict,
      termId: activeTermId,
    };
    const plannedKey = formatCommitteeIdentity(planned.committee);
    const intendedMembers = planned.members;
    const importedMembers = planned.importedMembers;

    // A brand-new committee with no activation candidates has no membership state to
    // reconcile. Preserve the existing lightweight create path; existing committees still
    // enter the transaction below so genuinely absent active members can be removed.
    if (importedMembers.length === 0 && planned.committeeListId === null) {
      await prisma.committeeList.upsert({
        where: {
          cityTown_legDistrict_electionDistrict_termId: {
            cityTown: committeeList.cityTown,
            legDistrict: committeeList.legDistrict,
            electionDistrict: committeeList.electionDistrict,
            termId: activeTermId,
          },
        },
        create: { ...committeeList, termId: activeTermId },
        update: committeeList,
      });
      continue;
    }

    // A mover whose source committee ran first is already seated here (or was abandoned).
    const pendingActivations = new Map(
      plan.activations
        .filter(
          (activation) =>
            formatCommitteeIdentity(activation.committee) === plannedKey &&
            !settledMoves.has(activation.voterRecordId),
        )
        .map((activation) => [
          activation.voterRecordId,
          activation.membershipType,
        ]),
    );

    for (;;) {
      // Outcomes of this attempt, plus the voters whose move it performed; appended to
      // `applied` and `settledMoves` only once the transaction commits, so a rolled-back
      // attempt never counts.
      const attempt: Pick<
        AppliedSummary,
        "activations" | "removals" | "skippedActivations"
      > & { moves: string[] } = {
        activations: [],
        removals: [],
        skippedActivations: [],
        moves: [],
      };
      try {
        await prisma.$transaction(async (tx) => {
          const activationContext: ActivationContext = {
            tx,
            actor,
            term: activeTerm,
            maxSeats: plan.maxSeatsPerLted,
          };

          // Moves this attempt may perform: those arriving here, and those leaving here
          // whose destination has not run yet. Whichever committee runs first does the move.
          const inboundMoves = Array.from(pendingActivations.keys()).flatMap(
            (voterRecordId) => {
              const move = movesByVoter.get(voterRecordId);
              return move ? [move] : [];
            },
          );
          const outboundMoves = Array.from(movesByVoter.values()).filter(
            (move) =>
              !settledMoves.has(move.voterRecordId) &&
              move.removals.some(
                (removal) =>
                  formatCommitteeIdentity(removal.committee) === plannedKey,
              ),
          );
          const movesForAttempt = [...inboundMoves, ...outboundMoves];

          // Lock every existing committee participating in the reconciliation before any
          // writes. A destination created after planning has no row to contend over yet;
          // its upsert below owns the new row until commit.
          await lockCommittees(tx, [
            ...(planned.committeeListId === null
              ? []
              : [planned.committeeListId]),
            ...movesForAttempt.flatMap((move) => [
              ...(move.destination.committeeListId === null
                ? []
                : [move.destination.committeeListId]),
              ...move.removals.map((removal) => removal.committeeListId),
            ]),
          ]);

          const committee = await tx.committeeList.upsert({
            where: {
              cityTown_legDistrict_electionDistrict_termId: {
                cityTown: committeeList.cityTown,
                legDistrict: committeeList.legDistrict,
                electionDistrict: committeeList.electionDistrict,
                termId: activeTermId,
              },
            },
            create: { ...committeeList, termId: activeTermId },
            update: committeeList,
          });

          await ensureSeatsExist(committee.id, activeTermId, {
            tx,
            maxSeats: plan.maxSeatsPerLted,
          });

          const importedSet = new Set(intendedMembers);
          const committeeIdentity: CommitteeIdentity = {
            cityTown: committee.cityTown,
            legDistrict: committee.legDistrict,
            electionDistrict: committee.electionDistrict,
            termId: activeTermId,
          };

          // Reconcile removals first so new activations can safely claim seats.
          const existingActiveMemberships =
            await tx.committeeMembership.findMany({
              where: {
                committeeListId: committee.id,
                termId: activeTermId,
                status: ACTIVE_MEMBERSHIP_STATUS,
              },
              select: {
                id: true,
                voterRecordId: true,
              },
            });

          const voterIdsForCommittee = Array.from(
            new Set([
              ...existingActiveMemberships.map(
                (membership) => membership.voterRecordId,
              ),
              ...importedMembers,
            ]),
          );
          const voters = voterIdsForCommittee.length
            ? await tx.voterRecord.findMany({
                where: { VRCNUM: { in: voterIdsForCommittee } },
                select: {
                  VRCNUM: true,
                  firstName: true,
                  middleInitial: true,
                  lastName: true,
                },
              })
            : [];
          const voterById = new Map(
            voters.map((voter) => [voter.VRCNUM, voter]),
          );
          const voterRecordFor = (voterRecordId: string): VoterNameRow => {
            const voter = voterById.get(voterRecordId);
            if (!voter) {
              throw new Error(
                `Voter not found for bulk import audit: ${voterRecordId}`,
              );
            }
            return voter;
          };
          const subjectForVoter = (
            voterRecordId: string,
            seatNumber?: number | null,
          ): AuditMembershipSubject =>
            buildMembershipAuditSubject({
              voterRecord: voterRecordFor(voterRecordId),
              committee,
              term: activeTerm,
              seatNumber,
            });

          const movedRemovalsForAttempt = movesForAttempt.flatMap(
            (move) => move.removals,
          );
          const activeMovedMemberships = movedRemovalsForAttempt.length
            ? await tx.committeeMembership.findMany({
                where: {
                  id: {
                    in: movedRemovalsForAttempt.map(
                      (removal) => removal.membershipId,
                    ),
                  },
                  status: ACTIVE_MEMBERSHIP_STATUS,
                },
                select: { id: true, voterRecordId: true },
              })
            : [];
          const activeMovedMembershipById = new Map(
            activeMovedMemberships.map((membership) => [
              membership.id,
              membership,
            ]),
          );

          /** Removes the mover from every source committee where they still hold a seat. */
          const removeMovedSources = async (
            move: PlannedMove,
          ): Promise<void> => {
            for (const removal of move.removals) {
              const membership = activeMovedMembershipById.get(
                removal.membershipId,
              );
              if (!membership) continue;
              await removeMembershipForSync(tx, actor, membership, {
                committeeId: removal.committeeListId,
                subject: buildMembershipAuditSubject({
                  voterRecord: voterRecordFor(move.voterRecordId),
                  committee: {
                    id: removal.committeeListId,
                    cityTown: removal.committee.cityTown,
                    legDistrict: removal.committee.legDistrict,
                    electionDistrict: removal.committee.electionDistrict,
                  },
                  term: activeTerm,
                  seatNumber: null,
                }),
              });
              attempt.removals.push({
                membershipId: membership.id,
                voterRecordId: move.voterRecordId,
                committee: removal.committee,
              });
            }
          };

          for (const membership of existingActiveMemberships) {
            if (importedSet.has(membership.voterRecordId)) continue;
            const move = moveByMembershipId.get(membership.id);
            if (!move) {
              await removeMembershipForSync(tx, actor, membership, {
                committeeId: committee.id,
                subject: subjectForVoter(membership.voterRecordId, null),
              });
              attempt.removals.push({
                membershipId: membership.id,
                voterRecordId: membership.voterRecordId,
                committee: committeeIdentity,
              });
              continue;
            }
            // A move abandoned after a live conflict leaves the member where they are.
            if (settledMoves.has(move.voterRecordId)) continue;

            // This committee runs before the destination, so the whole move happens here:
            // free the seat, then take one in the destination, which may not exist yet.
            // The destination's own transaction has not run, so its stale members are
            // removed here too; otherwise a full destination could refuse the mover a seat
            // it would have freed anyway.
            await removeMovedSources(move);
            const destination = await tx.committeeList.upsert({
              where: {
                cityTown_legDistrict_electionDistrict_termId: {
                  cityTown: move.destination.committee.cityTown,
                  legDistrict: move.destination.committee.legDistrict,
                  electionDistrict: move.destination.committee.electionDistrict,
                  termId: activeTermId,
                },
              },
              create: {
                cityTown: move.destination.committee.cityTown,
                legDistrict: move.destination.committee.legDistrict,
                electionDistrict: move.destination.committee.electionDistrict,
                termId: activeTermId,
              },
              update: {},
            });
            await lockCommittees(tx, [destination.id]);
            await ensureSeatsExist(destination.id, activeTermId, {
              tx,
              maxSeats: plan.maxSeatsPerLted,
            });
            // Known atomicity gap: destination changes commit with this source transaction.
            // A later destination failure cannot roll them back; see
            // .scratch/committee-roster-import/issues/18-destination-reconciliation-atomicity.md.
            attempt.removals.push(
              ...(await removeStaleMembers(
                activationContext,
                destination,
                move.destination.members,
                (membershipId) => moveByMembershipId.has(membershipId),
              )),
            );
            attempt.activations.push(
              await activateMember(
                activationContext,
                destination,
                voterRecordFor(move.voterRecordId),
                move.membershipType,
              ),
            );
            attempt.moves.push(move.voterRecordId);
          }

          for (const voterRecordId of importedMembers) {
            const plannedMembershipType = pendingActivations.get(voterRecordId);
            if (plannedMembershipType === undefined) {
              // Planning already recorded why this one is not activated, or an earlier
              // committee's transaction already moved them here.
              continue;
            }

            const move = movesByVoter.get(voterRecordId);
            if (move) {
              await removeMovedSources(move);
            } else if (
              await isVoterActiveInAnotherCommittee(
                voterRecordId,
                committee.id,
                activeTermId,
                tx,
              )
            ) {
              flagActiveElsewhere(
                discrepanciesMap,
                voterRecordId,
                committeeIdentity,
                plannedMembershipType,
              );
              attempt.skippedActivations.push({
                voterRecordId,
                committee: committeeIdentity,
                membershipType: plannedMembershipType,
                reason: "active-elsewhere",
              });
              continue;
            }

            attempt.activations.push(
              await activateMember(
                activationContext,
                committee,
                voterRecordFor(voterRecordId),
                plannedMembershipType,
              ),
            );
            if (move) attempt.moves.push(voterRecordId);
          }
        });
        applied.activations.push(...attempt.activations);
        applied.removals.push(...attempt.removals);
        applied.skippedActivations.push(...attempt.skippedActivations);
        for (const voterRecordId of attempt.moves) {
          settledMoves.add(voterRecordId);
        }
        break;
      } catch (error) {
        const conflict = asRosterActivationConflict(error);
        if (!conflict) throw error;
        flagActiveElsewhere(
          discrepanciesMap,
          conflict.voterRecordId,
          conflict.committee,
          conflict.membershipType,
        );
        applied.skippedActivations.push({
          voterRecordId: conflict.voterRecordId,
          committee: conflict.committee,
          membershipType: conflict.membershipType,
          reason: "active-elsewhere",
        });
        // Drop the voter from this committee's pending work, and if they were moving,
        // leave them seated where they are rather than retry the move elsewhere.
        pendingActivations.delete(conflict.voterRecordId);
        if (movesByVoter.has(conflict.voterRecordId)) {
          settledMoves.add(conflict.voterRecordId);
        }
      }
    }
  }

  applied.counts = {
    activations: applied.activations.length,
    removals: applied.removals.length,
    discrepancies: discrepanciesMap.size,
    skippedActivations: applied.skippedActivations.length,
  };
  return { plan, applied };
}
