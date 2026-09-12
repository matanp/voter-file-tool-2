import prisma from "~/lib/prisma";
import {
  PrivilegeLevel,
  type MembershipType,
  type Prisma,
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
  readonly membershipType: MembershipType;

  constructor(voterRecordId: string, membershipType: MembershipType) {
    super(ALREADY_ACTIVE_ELSEWHERE);
    this.name = "RosterActivationConflict";
    this.voterRecordId = voterRecordId;
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
  membershipType: MembershipType,
): never {
  if (isActiveMembershipPerTermConflict(error)) {
    throw new RosterActivationConflict(voterRecordId, membershipType);
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

  const committees: PlannedCommittee[] = [];
  const activations: ImportPlan["activations"] = [];
  const capacityFailures: PlannedCapacityFailure[] = [];
  const removalsWithoutNames: Omit<PlannedRemoval, "name">[] = [];

  for (const value of committeeData.values()) {
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

    const existingCommittee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown: committee.cityTown,
          legDistrict: committee.legDistrict,
          electionDistrict: committee.electionDistrict,
          termId: activeTermId,
        },
      },
      select: { id: true },
    });
    const committeeListId = existingCommittee?.id ?? null;

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
      const activeElsewhere = Array.from(
        initiallyActiveCommittees.get(voterRecordId) ?? [],
      ).some((otherCommitteeId) => otherCommitteeId !== committeeListId);

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

function assertWithinCapacity(plan: ImportPlan): void {
  const failure = plan.capacityFailures[0];
  if (!failure) return;
  throw new Error(
    `Committee ${failure.committee} has ${failure.memberCount} members, exceeding maxSeatsPerLted=${failure.maxSeats}`,
  );
}

/**
 * Performs the writes an import plan describes. The plan is recomputed here rather than
 * accepted as an input, because the database can change between planning and applying.
 */
export async function applyRosterImport(
  parseResult: RosterParseResult,
  actor: BulkLoadActor = DEFAULT_ACTOR,
): Promise<ImportPlan> {
  const plan = await planRosterImport(parseResult, actor);
  assertWithinCapacity(plan);

  const activeTerm = plan.term;
  const activeTermId = activeTerm.id;
  const discrepanciesMap = plan.discrepancies;

  for (const planned of plan.committees) {
    const committeeList: Prisma.CommitteeListCreateManyInput = {
      cityTown: planned.committee.cityTown,
      legDistrict: planned.committee.legDistrict,
      electionDistrict: planned.committee.electionDistrict,
      termId: activeTermId,
    };
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

    const pendingActivations = new Map(
      plan.activations
        .filter(
          (activation) =>
            formatCommitteeIdentity(activation.committee) ===
            formatCommitteeIdentity(planned.committee),
        )
        .map((activation) => [
          activation.voterRecordId,
          activation.membershipType,
        ]),
    );
    const plannedCommitteeIdentity: CommitteeIdentity = {
      cityTown: planned.committee.cityTown,
      legDistrict: planned.committee.legDistrict,
      electionDistrict: planned.committee.electionDistrict,
      termId: activeTermId,
    };

    for (;;) {
      try {
        await prisma.$transaction(async (tx) => {
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

          // Lock committee row while reconciling capacity + seat assignments.
          await tx.$queryRaw`
        SELECT id
        FROM "CommitteeList"
        WHERE id = ${committee.id}
        FOR UPDATE
      `;

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

          const subjectForVoter = (
            voterRecordId: string,
            seatNumber?: number | null,
          ): AuditMembershipSubject => {
            const voter = voterById.get(voterRecordId);
            if (!voter) {
              throw new Error(
                `Voter not found for bulk import audit: ${voterRecordId}`,
              );
            }
            return buildMembershipAuditSubject({
              voterRecord: voter,
              committee,
              term: activeTerm,
              seatNumber,
            });
          };

          for (const membership of existingActiveMemberships) {
            if (!importedSet.has(membership.voterRecordId)) {
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
                    committeeId: committee.id,
                  },
                  subjectForVoter(membership.voterRecordId, null),
                ),
                tx,
              );
            }
          }

          for (const voterRecordId of importedMembers) {
            const plannedMembershipType = pendingActivations.get(voterRecordId);
            if (plannedMembershipType === undefined) {
              // Planning already recorded why this one is not activated.
              continue;
            }

            if (
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
              continue;
            }

            const existingMembership = await tx.committeeMembership.findUnique({
              where: {
                voterRecordId_committeeListId_termId: {
                  voterRecordId,
                  committeeListId: committee.id,
                  termId: activeTermId,
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
              seatNumber = await assignNextAvailableSeat(
                committee.id,
                activeTermId,
                {
                  tx,
                  maxSeats: plan.maxSeatsPerLted,
                },
              );
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
                  subjectForVoter(voterRecordId, seatNumber),
                ),
                tx,
              );
            } else {
              const membershipType: MembershipType = plannedMembershipType;
              let createdMembership;
              try {
                createdMembership = await tx.committeeMembership.create({
                  data: {
                    voterRecordId,
                    committeeListId: committee.id,
                    termId: activeTermId,
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
                  subjectForVoter(voterRecordId, seatNumber),
                ),
                tx,
              );
            }
          }
        });
        break;
      } catch (error) {
        const conflict = asRosterActivationConflict(error);
        if (!conflict) throw error;
        flagActiveElsewhere(
          discrepanciesMap,
          conflict.voterRecordId,
          plannedCommitteeIdentity,
          conflict.membershipType,
        );
        pendingActivations.delete(conflict.voterRecordId);
      }
    }
  }

  return plan;
}
