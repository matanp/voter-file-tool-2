import {
  EligibilityFlagStatus,
  PrivilegeLevel,
  type EligibilityFlagReason,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import {
  prepareCommitteeResidencyChecks,
  type CommitteeResidencyCheck,
} from "./committeeResidency";
import {
  isPartyMismatch,
  normalizeEligibilityText,
} from "./eligibilityPredicates";

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
  autoResolved: number;
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

type PendingFlagUpdate = {
  id: string;
  details?: Prisma.InputJsonValue;
  sourceReportId?: string;
};

const SYSTEM_USER_ID = "system";
// Prisma's 5 s interactive-transaction default is tight for a county-wide
// write against a hosted database.
const WRITE_TRANSACTION_TIMEOUT_MS = 30_000;
const RESOLVED_BY_RESCAN_STATUS =
  "RESOLVED_BY_RESCAN" as EligibilityFlagStatus;

function isJsonObject(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null,
): value is Prisma.JsonObject {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function buildRescanResolvedDetails(
  existing: Prisma.JsonValue | Prisma.InputJsonValue | null,
  resolvedAt: Date,
  sourceReportId?: string,
): Prisma.InputJsonValue {
  const merged: Record<string, unknown> = isJsonObject(existing)
    ? { ...existing }
    : existing != null
      ? { previousDetails: existing }
      : {};

  merged.resolution = "RESOLVED_BY_RESCAN";
  merged.resolutionTimestamp = resolvedAt.toISOString();
  merged.resolvedByActor = SYSTEM_USER_ID;
  if (sourceReportId) {
    merged.resolvedBySourceReportId = sourceReportId;
  }

  return merged as Prisma.InputJsonValue;
}

function jsonValueKey(value: unknown): string {
  return JSON.stringify(value);
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
    mostRecentImport: MostRecentImportVersion | null;
    checkResidency: CommitteeResidencyCheck;
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

  const voterParty = normalizeEligibilityText(voter.party);
  const requiredParty = normalizeEligibilityText(context.requiredPartyCode);
  if (isPartyMismatch(voter.party, context.requiredPartyCode)) {
    detected.push({
      reason: "PARTY_MISMATCH",
      details: {
        expectedPartyCode: requiredParty,
        voterPartyCode: voterParty,
      },
    });
  }

  const assemblyDistrictMismatch = context.checkResidency(
    membership.committeeList,
    voter.stateAssmblyDistrict,
  );
  if (assemblyDistrictMismatch) {
    detected.push({
      reason: "ASSEMBLY_DISTRICT_MISMATCH",
      details: assemblyDistrictMismatch,
    });
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

/**
 * Runs `fn` in a transaction, or directly when `db` is already a transaction
 * client (which has no `$transaction`).
 */
async function inWriteTransaction<T>(
  db: EligibilityFlaggingClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if ("$transaction" in db && typeof db.$transaction === "function") {
    return db.$transaction(fn, { timeout: WRITE_TRANSACTION_TIMEOUT_MS });
  }
  return fn(db);
}

/**
 * Applies a run's flag changes in at most four statements. Prisma has no
 * per-row-values bulk update, so the two updates join against unnest'd arrays.
 * Timestamps travel as ISO text cast to `timestamp`, which keeps the UTC wall
 * time Prisma itself stores; JSON travels as text cast to `jsonb`.
 */
async function writeFlagChanges(
  tx: Prisma.TransactionClient,
  changes: {
    flagsToCreate: Prisma.EligibilityFlagCreateManyInput[];
    pendingFlagUpdates: PendingFlagUpdate[];
    stalePendingFlags: PendingFlagRecord[];
    sourceReportId?: string;
  },
): Promise<{ newFlags: number; autoResolved: number }> {
  const { flagsToCreate, pendingFlagUpdates, stalePendingFlags, sourceReportId } =
    changes;
  const now = new Date().toISOString();

  let newFlags = 0;
  if (flagsToCreate.length > 0) {
    const created = await tx.eligibilityFlag.createMany({
      data: flagsToCreate,
      skipDuplicates: true,
    });
    newFlags = created.count;
  }

  if (pendingFlagUpdates.length > 0) {
    // A null array entry leaves that column as it is.
    await tx.$executeRaw`
      UPDATE "EligibilityFlag" AS f
      SET "details" = COALESCE(r.details::jsonb, f."details"),
          "sourceReportId" = COALESCE(r.source_report_id, f."sourceReportId"),
          "updatedAt" = ${now}::timestamp
      FROM unnest(
        ${pendingFlagUpdates.map((update) => update.id)}::text[],
        ${pendingFlagUpdates.map((update) =>
          update.details !== undefined ? JSON.stringify(update.details) : null,
        )}::text[],
        ${pendingFlagUpdates.map((update) => update.sourceReportId ?? null)}::text[]
      ) AS r(id, details, source_report_id)
      WHERE f.id = r.id
        AND f.status = 'PENDING'::"EligibilityFlagStatus"
    `;
  }

  if (stalePendingFlags.length === 0) {
    return { newFlags, autoResolved: 0 };
  }

  const resolvedAt = new Date(now);
  // The PENDING guard skips flags a reviewer decided since the read above;
  // RETURNING says which flags this run actually resolved.
  const resolvedRows = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE "EligibilityFlag" AS f
    SET "status" = 'RESOLVED_BY_RESCAN'::"EligibilityFlagStatus",
        "reviewedById" = ${SYSTEM_USER_ID},
        "reviewedAt" = ${now}::timestamp,
        "details" = r.details::jsonb,
        "updatedAt" = ${now}::timestamp
    FROM unnest(
      ${stalePendingFlags.map((flag) => flag.id)}::text[],
      ${stalePendingFlags.map((flag) =>
        JSON.stringify(
          buildRescanResolvedDetails(flag.details, resolvedAt, sourceReportId),
        ),
      )}::text[]
    ) AS r(id, details)
    WHERE f.id = r.id
      AND f.status = 'PENDING'::"EligibilityFlagStatus"
    RETURNING f.id
  `;

  const resolvedIds = new Set(resolvedRows.map((row) => row.id));
  const resolvedFlags = stalePendingFlags.filter((flag) =>
    resolvedIds.has(flag.id),
  );

  if (resolvedFlags.length > 0) {
    await tx.auditLog.createMany({
      data: resolvedFlags.map((flag) => ({
        userId: SYSTEM_USER_ID,
        userRole: PrivilegeLevel.Developer,
        action: "DISCREPANCY_RESOLVED" as const,
        entityType: "EligibilityFlag",
        entityId: flag.id,
        beforeValue: {
          status: "PENDING",
          reason: flag.reason,
        } as Prisma.InputJsonValue,
        afterValue: {
          status: RESOLVED_BY_RESCAN_STATUS,
          reason: flag.reason,
        } as Prisma.InputJsonValue,
        metadata: {
          source: "boe_flagging",
          decision: "auto_resolve",
          actorType: "system",
          actorUserId: SYSTEM_USER_ID,
          flagId: flag.id,
          reason: flag.reason,
          resolution: "RESOLVED_BY_RESCAN",
          resolvedAt: now,
          ...(sourceReportId ? { triggerSourceReportId: sourceReportId } : {}),
        } as Prisma.InputJsonValue,
      })),
    });
  }

  return { newFlags, autoResolved: resolvedFlags.length };
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

  const checkResidency = await prepareCommitteeResidencyChecks(
    db,
    memberships.map((membership) => membership.committeeList),
    governanceConfig.requireAssemblyDistrictMatch,
  );

  const pendingFlags = await db.eligibilityFlag.findMany({
    where: {
      termId: targetTermId,
      status: EligibilityFlagStatus.PENDING,
    },
    select: {
      id: true,
      membershipId: true,
      reason: true,
      details: true,
      sourceReportId: true,
    },
  });

  const pendingFlagsByKey = new Map<string, PendingFlagRecord>(
    (pendingFlags as PendingFlagRecord[]).map((flag) => [
      `${flag.membershipId}:${flag.reason}`,
      flag,
    ]),
  );

  let existingPending = 0;
  let autoResolved = 0;
  const flagsToCreate: Prisma.EligibilityFlagCreateManyInput[] = [];
  const pendingFlagUpdates: PendingFlagUpdate[] = [];
  const detectedPendingKeys = new Set<string>();

  for (const membership of memberships) {
    const detected = detectFlagsForMembership(membership, {
      requiredPartyCode: governanceConfig.requiredPartyCode,
      mostRecentImport,
      checkResidency,
    });

    for (const flag of detected) {
      const key = `${membership.id}:${flag.reason}`;
      detectedPendingKeys.add(key);
      const existingPendingFlag = pendingFlagsByKey.get(key);
      if (existingPendingFlag) {
        existingPending += 1;
        const update: PendingFlagUpdate = { id: existingPendingFlag.id };

        if (
          flag.details !== undefined &&
          jsonValueKey(existingPendingFlag.details) !== jsonValueKey(flag.details)
        ) {
          update.details = flag.details;
        }

        if (
          input.sourceReportId !== undefined &&
          existingPendingFlag.sourceReportId !== input.sourceReportId
        ) {
          update.sourceReportId = input.sourceReportId;
        }

        if (
          update.details !== undefined ||
          update.sourceReportId !== undefined
        ) {
          pendingFlagUpdates.push(update);
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

  const stalePendingFlags = (pendingFlags as PendingFlagRecord[]).filter(
    (flag) => !detectedPendingKeys.has(`${flag.membershipId}:${flag.reason}`),
  );

  let newFlags = 0;
  if (
    flagsToCreate.length > 0 ||
    pendingFlagUpdates.length > 0 ||
    stalePendingFlags.length > 0
  ) {
    // A fixed number of statements however many flags change: the old
    // update + audit insert per stale flag ran ~1,500 flags far past the
    // browser timeout on prod. One transaction so a flag is never left
    // resolved without its audit row, and a failed run changes nothing.
    const writes = await inWriteTransaction(db, (tx) =>
      writeFlagChanges(tx, {
        flagsToCreate,
        pendingFlagUpdates,
        stalePendingFlags,
        sourceReportId: input.sourceReportId,
      }),
    );
    newFlags = writes.newFlags;
    autoResolved = writes.autoResolved;
    existingPending += flagsToCreate.length - writes.newFlags;
  }

  return {
    termId: targetTermId,
    scanned: memberships.length,
    newFlags,
    existingPending,
    autoResolved,
    durationMs: Date.now() - startedAt,
  };
}
