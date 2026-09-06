import prisma from "~/lib/prisma";
import { PrivilegeLevel, type MembershipType, type Prisma } from "@prisma/client";

import {
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
  committeeMembers: string[];
};

/** Add a committee row to the in-memory LT/ED map without clobbering existing members. */
export function accumulateCommitteeMember(
  committeeData: Map<string, CommitteeAccumulationEntry>,
  mapKey: string,
  committeeListInput: Prisma.CommitteeListCreateManyInput,
  voterId: string,
  recordHasDiscrepancies: boolean,
): void {
  if (recordHasDiscrepancies) {
    if (!committeeData.has(mapKey)) {
      committeeData.set(mapKey, {
        data: committeeListInput,
        committeeMembers: [],
      });
    }
    return;
  }

  const existingEntry = committeeData.get(mapKey);
  if (existingEntry) {
    existingEntry.committeeMembers.push(voterId);
    return;
  }

  committeeData.set(mapKey, {
    data: committeeListInput,
    committeeMembers: [voterId],
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
  key: string,
  incoming: string,
  existing: string,
) {
  const existingEntry = discrepanciesMap.get(voterRecordId);
  const nextDiscrepancies = {
    ...(existingEntry?.discrepancies ?? {}),
    [key]: {
      incoming,
      existing,
    },
  };

  discrepanciesMap.set(voterRecordId, {
    discrepancies: nextDiscrepancies,
    committee:
      existingEntry?.committee ??
      {
        id: 0,
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        electionDistrict: committee.electionDistrict,
        termId: committee.termId,
        ltedWeight: null,
      },
  });
}

const ALREADY_ACTIVE_ELSEWHERE =
  "Voter is already active in another committee for this term";

function flagActiveElsewhere(
  discrepanciesMap: Map<string, DiscrepanciesAndCommittee>,
  voterRecordId: string,
  committee: CommitteeIdentity,
) {
  ensureImportDiscrepancy(
    discrepanciesMap,
    voterRecordId,
    committee,
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

  for (const entry of entries) {
    const { cityTown, legDistrict, electionDistrict } = entry.committee;
    const VRCNUM = entry.vrcnum;
    membershipTypeByVoter.set(VRCNUM, entry.membershipType);

    const existingRecord = await prisma.voterRecord.findUnique({
      where: {
        VRCNUM,
      },
    });

    let recordHasDiscrepancies = false;
    if (existingRecord) {
      matchedVoters++;
      const discrepancies = findDiscrepancies(entry.claimed, existingRecord);

      if (discrepancies && Object.keys(discrepancies).length > 0) {
        discrepanciesMap.set(VRCNUM, {
          discrepancies,
          committee: {
            id: 0,
            cityTown,
            legDistrict,
            electionDistrict,
            termId: activeTermId,
            ltedWeight: null,
          },
        });
        recordHasDiscrepancies = true;
      }
    } else {
      discrepanciesMap.set(VRCNUM, {
        discrepancies: {
          VRCNUM: {
            incoming: VRCNUM,
            existing: "",
            fullRow: describeRosterEntry(entry),
          },
        },
        committee: {
          id: 0,
          cityTown,
          legDistrict,
          electionDistrict,
          termId: activeTermId,
          ltedWeight: null,
        },
      });
      // Missing voter rows are discrepancies only — never create CommitteeMembership.
      recordHasDiscrepancies = true;
    }

    accumulateCommitteeMember(
      committeeData,
      `${cityTown}-${legDistrict}-${electionDistrict}`,
      {
        cityTown,
        legDistrict,
        electionDistrict,
        termId: activeTermId,
      },
      VRCNUM,
      recordHasDiscrepancies,
    );
  }

  const voterAssignments = new Map<string, CommitteeIdentity[]>();

  for (const [, value] of committeeData.entries()) {
    const committeeIdentity: CommitteeIdentity = {
      cityTown: value.data.cityTown,
      legDistrict: value.data.legDistrict,
      electionDistrict: value.data.electionDistrict,
      termId: activeTermId,
    };
    for (const voterRecordId of new Set(value.committeeMembers)) {
      const existingAssignments = voterAssignments.get(voterRecordId) ?? [];
      existingAssignments.push(committeeIdentity);
      voterAssignments.set(voterRecordId, existingAssignments);
    }
  }

  const duplicateAssignments = new Set<string>();
  for (const [voterRecordId, assignments] of voterAssignments.entries()) {
    if (assignments.length <= 1) continue;
    duplicateAssignments.add(voterRecordId);
    ensureImportDiscrepancy(
      discrepanciesMap,
      voterRecordId,
      assignments[0]!,
      "committeeAssignmentConflict",
      assignments.map((assignment) => formatCommitteeIdentity(assignment)).join(" | "),
      "Voter appears in multiple committees in the same bulk import",
    );
  }

  const importedVoterIds = Array.from(voterAssignments.keys()).filter(
    (voterRecordId) => !duplicateAssignments.has(voterRecordId),
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

  for (const [, value] of committeeData.entries()) {
    const committee: CommitteeIdentity = {
      cityTown: value.data.cityTown,
      legDistrict: value.data.legDistrict,
      electionDistrict: value.data.electionDistrict,
      termId: activeTermId,
    };
    const members = Array.from(new Set(value.committeeMembers));
    const importedMembers = members.filter(
      (voterRecordId) => !duplicateAssignments.has(voterRecordId),
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

    committees.push({ committee, committeeListId, members, importedMembers });

    if (importedMembers.length === 0) {
      continue;
    }

    if (importedMembers.length > config.maxSeatsPerLted) {
      capacityFailures.push({
        committee: formatCommitteeIdentity(committee),
        memberCount: importedMembers.length,
        maxSeats: config.maxSeatsPerLted,
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

    for (const voterRecordId of importedMembers) {
      const activeElsewhere = Array.from(
        initiallyActiveCommittees.get(voterRecordId) ?? [],
      ).some((otherCommitteeId) => otherCommitteeId !== committeeListId);

      if (activeElsewhere) {
        flagActiveElsewhere(discrepanciesMap, voterRecordId, committee);
        continue;
      }

      activations.push({
        voterRecordId,
        committee,
        membershipType: membershipTypeByVoter.get(voterRecordId) ?? "APPOINTED",
      });
    }
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
  const nameById = new Map(voters.map((voter) => [voter.VRCNUM, getName(voter)]));

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
    const uniqueImportedMembers = planned.members;
    const importedMembers = planned.importedMembers;

    if (importedMembers.length === 0) {
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

    const plannedActivations = new Map(
      plan.activations
        .filter(
          (activation) =>
            formatCommitteeIdentity(activation.committee) ===
            formatCommitteeIdentity(planned.committee),
        )
        .map((activation) => [activation.voterRecordId, activation.membershipType]),
    );

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

      const importedSet = new Set(uniqueImportedMembers);
      const committeeIdentity: CommitteeIdentity = {
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        electionDistrict: committee.electionDistrict,
        termId: activeTermId,
      };

      // Reconcile removals first so new activations can safely claim seats.
      const existingActiveMemberships = await tx.committeeMembership.findMany({
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
      const voterById = new Map(voters.map((voter) => [voter.VRCNUM, voter]));

      const subjectForVoter = (
        voterRecordId: string,
        seatNumber?: number | null,
      ): AuditMembershipSubject => {
        const voter = voterById.get(voterRecordId);
        if (!voter) {
          throw new Error(`Voter not found for bulk import audit: ${voterRecordId}`);
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
        const plannedMembershipType = plannedActivations.get(voterRecordId);
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
          flagActiveElsewhere(discrepanciesMap, voterRecordId, committeeIdentity);
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
        if (!(existingMembership?.status === ACTIVE_MEMBERSHIP_STATUS && seatNumber !== null)) {
          seatNumber = await assignNextAvailableSeat(committee.id, activeTermId, {
            tx,
            maxSeats: plan.maxSeatsPerLted,
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
            if (isActiveMembershipPerTermConflict(error)) {
              flagActiveElsewhere(
                discrepanciesMap,
                voterRecordId,
                committeeIdentity,
              );
              continue;
            }
            throw error;
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
            if (isActiveMembershipPerTermConflict(error)) {
              flagActiveElsewhere(
                discrepanciesMap,
                voterRecordId,
                committeeIdentity,
              );
              continue;
            }
            throw error;
          }
          await logAuditEventOrThrow(
            actor.userId,
            actor.userRole,
            "MEMBER_ACTIVATED",
            "CommitteeMembership",
            createdMembership.id,
            null,
            { status: ACTIVE_MEMBERSHIP_STATUS, membershipType, seatNumber },
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
  }

  return plan;
}
