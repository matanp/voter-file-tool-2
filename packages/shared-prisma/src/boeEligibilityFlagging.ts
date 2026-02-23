import {
  EligibilityFlagStatus,
  type EligibilityFlagReason,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

export type MostRecentImportVersion = {
  year: number;
  recordEntryNumber: number;
};

export type BoeEligibilityFlaggingRunInput = {
  termId?: string;
  sourceReportId?: string;
};

export type BoeEligibilityFlaggingRunResult = {
  termId: string;
  scanned: number;
  newFlags: number;
  existingPending: number;
  durationMs: number;
};

type EligibilityFlaggingClient = PrismaClient | Prisma.TransactionClient;

type MembershipWithEligibilityContext = {
  id: string;
  committeeListId: number;
  voterRecordId: string;
  committeeList: {
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
  };
  voterRecord: {
    party: string | null;
    stateAssmblyDistrict: string | null;
    latestRecordEntryYear: number;
    latestRecordEntryNumber: number;
  } | null;
};

type DetectedFlag = {
  reason: EligibilityFlagReason;
  details?: Prisma.InputJsonValue;
};

type PendingFlagRecord = {
  id: string;
  membershipId: string;
  reason: EligibilityFlagReason;
  details: Prisma.JsonValue | Prisma.InputJsonValue | null;
  sourceReportId: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function jsonValueKey(value: unknown): string {
  return JSON.stringify(value);
}

function ltedKey(
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
): string {
  return `${cityTown}::${String(legDistrict)}::${String(electionDistrict)}`;
}

export async function getMostRecentImportVersion(
  db: EligibilityFlaggingClient,
): Promise<MostRecentImportVersion | null> {
  const latest = await db.voterRecord.findFirst({
    orderBy: [
      { latestRecordEntryYear: "desc" },
      { latestRecordEntryNumber: "desc" },
    ],
    select: {
      latestRecordEntryYear: true,
      latestRecordEntryNumber: true,
    },
  });

  return latest
    ? {
        year: latest.latestRecordEntryYear,
        recordEntryNumber: latest.latestRecordEntryNumber,
      }
    : null;
}

export function isVoterPossiblyInactive(
  voter: {
    latestRecordEntryYear: number;
    latestRecordEntryNumber: number;
  },
  mostRecentImport: MostRecentImportVersion,
): boolean {
  if (voter.latestRecordEntryYear < mostRecentImport.year) return true;
  if (
    voter.latestRecordEntryYear === mostRecentImport.year &&
    voter.latestRecordEntryNumber < mostRecentImport.recordEntryNumber
  ) {
    return true;
  }
  return false;
}

function detectFlagsForMembership(
  membership: MembershipWithEligibilityContext,
  context: {
    requiredPartyCode: string;
    requireAssemblyDistrictMatch: boolean;
    mostRecentImport: MostRecentImportVersion | null;
    crosswalkByKey: Map<string, { stateAssemblyDistrict: string }>;
  },
): DetectedFlag[] {
  const detected: DetectedFlag[] = [];
  const voter = membership.voterRecord;

  if (!voter) {
    detected.push({
      reason: "VOTER_NOT_FOUND",
      details: {
        message: "Voter record was not found for an active committee membership.",
      },
    });
    return detected;
  }

  const voterParty = normalizeText(voter.party);
  const requiredParty = normalizeText(context.requiredPartyCode);
  if (voterParty !== requiredParty) {
    detected.push({
      reason: "PARTY_MISMATCH",
      details: {
        expectedPartyCode: requiredParty,
        voterPartyCode: voterParty,
      },
    });
  }

  if (context.requireAssemblyDistrictMatch) {
    const key = ltedKey(
      membership.committeeList.cityTown,
      membership.committeeList.legDistrict,
      membership.committeeList.electionDistrict,
    );
    const expected = normalizeText(context.crosswalkByKey.get(key)?.stateAssemblyDistrict);
    const actual = normalizeText(voter.stateAssmblyDistrict);

    if (!expected || expected !== actual) {
      detected.push({
        reason: "ASSEMBLY_DISTRICT_MISMATCH",
        details: {
          expectedAssemblyDistrict: expected || null,
          voterAssemblyDistrict: actual || null,
        },
      });
    }
  }

  if (
    context.mostRecentImport &&
    isVoterPossiblyInactive(
      {
        latestRecordEntryYear: voter.latestRecordEntryYear,
        latestRecordEntryNumber: voter.latestRecordEntryNumber,
      },
      context.mostRecentImport,
    )
  ) {
    detected.push({
      reason: "POSSIBLY_INACTIVE",
      details: {
        voterVersion: {
          year: voter.latestRecordEntryYear,
          recordEntryNumber: voter.latestRecordEntryNumber,
        },
        mostRecentImport: context.mostRecentImport,
      },
    });
  }

  return detected;
}

export async function runBoeEligibilityFlagging(
  db: EligibilityFlaggingClient,
  input: BoeEligibilityFlaggingRunInput = {},
): Promise<BoeEligibilityFlaggingRunResult> {
  const startedAt = Date.now();

  const targetTermId =
    input.termId ??
    (
      await db.committeeTerm.findFirst({
        where: { isActive: true },
        select: { id: true },
      })
    )?.id;

  if (!targetTermId) {
    throw new Error("No active CommitteeTerm found for BOE eligibility flagging");
  }

  const governanceConfig = await db.committeeGovernanceConfig.findFirst({
    select: {
      requiredPartyCode: true,
      requireAssemblyDistrictMatch: true,
    },
  });

  if (!governanceConfig) {
    throw new Error(
      "CommitteeGovernanceConfig not found — cannot run BOE eligibility flagging",
    );
  }

  const mostRecentImport = await getMostRecentImportVersion(db);

  const memberships = (await db.committeeMembership.findMany({
    where: {
      termId: targetTermId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      committeeListId: true,
      voterRecordId: true,
      committeeList: {
        select: {
          cityTown: true,
          legDistrict: true,
          electionDistrict: true,
        },
      },
      voterRecord: {
        select: {
          party: true,
          stateAssmblyDistrict: true,
          latestRecordEntryYear: true,
          latestRecordEntryNumber: true,
        },
      },
    },
  })) as MembershipWithEligibilityContext[];

  const uniqueLtedFilters: Array<{
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
  }> = [];
  const seenLtedKeys = new Set<string>();

  for (const membership of memberships) {
    const key = ltedKey(
      membership.committeeList.cityTown,
      membership.committeeList.legDistrict,
      membership.committeeList.electionDistrict,
    );
    if (!seenLtedKeys.has(key)) {
      seenLtedKeys.add(key);
      uniqueLtedFilters.push({
        cityTown: membership.committeeList.cityTown,
        legDistrict: membership.committeeList.legDistrict,
        electionDistrict: membership.committeeList.electionDistrict,
      });
    }
  }

  const crosswalkRows =
    uniqueLtedFilters.length > 0
      ? await db.ltedDistrictCrosswalk.findMany({
          where: { OR: uniqueLtedFilters },
          select: {
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
            stateAssemblyDistrict: true,
          },
        })
      : [];

  const crosswalkByKey = new Map<string, { stateAssemblyDistrict: string }>();
  for (const row of crosswalkRows) {
    crosswalkByKey.set(
      ltedKey(row.cityTown, row.legDistrict, row.electionDistrict),
      {
        stateAssemblyDistrict: row.stateAssemblyDistrict,
      },
    );
  }

  const membershipIds = memberships.map((membership) => membership.id);
  const pendingFlags =
    membershipIds.length > 0
      ? await db.eligibilityFlag.findMany({
          where: {
            termId: targetTermId,
            status: EligibilityFlagStatus.PENDING,
            membershipId: { in: membershipIds },
          },
          select: {
            id: true,
            membershipId: true,
            reason: true,
            details: true,
            sourceReportId: true,
          },
        })
      : [];

  const pendingFlagsByKey = new Map<string, PendingFlagRecord>(
    (pendingFlags as PendingFlagRecord[]).map((flag) => [
      `${flag.membershipId}:${flag.reason}`,
      flag,
    ]),
  );

  let existingPending = 0;
  const flagsToCreate: Prisma.EligibilityFlagCreateManyInput[] = [];
  const pendingFlagUpdates: Array<{
    id: string;
    data: Prisma.EligibilityFlagUpdateManyMutationInput;
  }> = [];

  for (const membership of memberships) {
    const detected = detectFlagsForMembership(membership, {
      requiredPartyCode: governanceConfig.requiredPartyCode,
      requireAssemblyDistrictMatch:
        governanceConfig.requireAssemblyDistrictMatch,
      mostRecentImport,
      crosswalkByKey,
    });

    for (const flag of detected) {
      const key = `${membership.id}:${flag.reason}`;
      const existingPendingFlag = pendingFlagsByKey.get(key);
      if (existingPendingFlag) {
        existingPending += 1;
        const updateData: Prisma.EligibilityFlagUpdateManyMutationInput = {};

        if (
          flag.details !== undefined &&
          jsonValueKey(existingPendingFlag.details) !== jsonValueKey(flag.details)
        ) {
          updateData.details = flag.details;
        }

        if (
          input.sourceReportId !== undefined &&
          existingPendingFlag.sourceReportId !== input.sourceReportId
        ) {
          updateData.sourceReportId = input.sourceReportId;
        }

        if (Object.keys(updateData).length > 0) {
          pendingFlagUpdates.push({
            id: existingPendingFlag.id,
            data: updateData,
          });
        }
        continue;
      }

      pendingFlagsByKey.set(key, {
        id: `new:${key}`,
        membershipId: membership.id,
        reason: flag.reason,
        details: flag.details ?? null,
        sourceReportId: input.sourceReportId ?? null,
      });
      flagsToCreate.push({
        membershipId: membership.id,
        committeeListId: membership.committeeListId,
        voterRecordId: membership.voterRecordId,
        termId: targetTermId,
        reason: flag.reason,
        status: EligibilityFlagStatus.PENDING,
        ...(flag.details !== undefined ? { details: flag.details } : {}),
        ...(input.sourceReportId
          ? { sourceReportId: input.sourceReportId }
          : {}),
      });
    }
  }

  let newFlags = 0;
  if (flagsToCreate.length > 0) {
    const created = await db.eligibilityFlag.createMany({
      data: flagsToCreate,
      skipDuplicates: true,
    });
    newFlags = created.count;
    existingPending += flagsToCreate.length - created.count;
  }

  for (const pendingUpdate of pendingFlagUpdates) {
    await db.eligibilityFlag.updateMany({
      where: {
        id: pendingUpdate.id,
        status: EligibilityFlagStatus.PENDING,
      },
      data: pendingUpdate.data,
    });
  }

  return {
    termId: targetTermId,
    scanned: memberships.length,
    newFlags,
    existingPending,
    durationMs: Date.now() - startedAt,
  };
}
