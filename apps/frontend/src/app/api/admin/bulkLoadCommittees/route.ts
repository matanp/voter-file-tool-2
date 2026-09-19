import prisma from "~/lib/prisma";
import * as fs from "fs";
import * as path from "path";
import { NextResponse } from "next/server";
import {
  RosterCapacityError,
  applyRosterImport,
  planRosterImport,
  type AppliedSummary,
  type ImportPlan,
} from "./bulkLoadUtils";
import {
  ROSTER_FORMATS,
  RosterFormatError,
  parseWithFormat,
} from "./rosterFormats";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  PrivilegeLevel,
  type CommitteeList,
  type VoterRecord,
} from "@prisma/client";
import {
  bulkLoadCommitteesSchema,
  type BulkLoadCommitteesError,
  type BulkLoadCommitteesResponse,
} from "@voter-file-tool/shared-validators";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import type { DiscrepanciesAndCommittee } from "~/app/api/lib/utils";
import type { NextRequest } from "next/server";

/** The local data directory the endpoint has always read from. */
const DATA_DIRECTORY = "data";

type WireCommitteeList =
  BulkLoadCommitteesResponse["discrepanciesMap"][number][1]["committee"];
type WireVoterRecord =
  BulkLoadCommitteesResponse["recordsWithDiscrepancies"][number];

/**
 * `Decimal` and `Date` do not survive `JSON.stringify` as themselves — they leave as
 * strings — so the two Prisma-shaped pieces of the response are converted here rather
 * than left to the serializer. Saying it out loud is what lets the response type describe
 * what an Admin actually receives.
 */
function toWireCommittee(committee: CommitteeList): WireCommitteeList {
  return { ...committee, ltedWeight: committee.ltedWeight?.toString() ?? null };
}

function toWireVoterRecord(record: VoterRecord): WireVoterRecord {
  return {
    ...record,
    DOB: record.DOB?.toISOString() ?? null,
    lastUpdate: record.lastUpdate?.toISOString() ?? null,
    originalRegDate: record.originalRegDate?.toISOString() ?? null,
  };
}

/** The applied summary without its discrepancy map, which the response carries separately. */
function toWireApplied(
  applied: AppliedSummary,
): NonNullable<BulkLoadCommitteesResponse["applied"]> {
  return {
    counts: applied.counts,
    activations: applied.activations,
    removals: applied.removals,
    skippedActivations: applied.skippedActivations,
  };
}

/** Says what happened against what was planned, so a shortfall is announced not inferred. */
function describeApplied(applied: AppliedSummary, plan: ImportPlan): string {
  const parts = [
    `Applied: ${applied.counts.activations} of ${plan.counts.activations} planned activations written`,
  ];
  if (applied.counts.skippedActivations > 0) {
    parts.push(
      `${applied.counts.skippedActivations} skipped as live conflicts`,
    );
  }
  parts.push(
    `${applied.counts.removals} of ${plan.counts.removals} planned removals written`,
  );
  return parts.join(", ");
}

function invalidRequest(error: string): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 422 });
}

/**
 * Resolves a requested file name inside the local data directory. Anything that could
 * name a file outside it — a path separator, `..`, an absolute path — is refused rather
 * than read.
 */
function resolveRosterFilePath(fileName: string): string | null {
  if (
    fileName.includes("/") ||
    fileName.includes("\\") ||
    path.isAbsolute(fileName) ||
    path.basename(fileName) !== fileName
  ) {
    return null;
  }

  const directory = path.resolve(process.cwd(), DATA_DIRECTORY);
  const filePath = path.resolve(directory, fileName);

  return filePath.startsWith(directory + path.sep) ? filePath : null;
}

/** Arbitrary but fixed: every roster apply takes the same lock. */
const DISCREPANCY_IMPORT_LOCK_KEY = 0x4c4f4144; // "LOAD"

type CommitteeIdentity = Pick<
  CommitteeList,
  "cityTown" | "legDistrict" | "electionDistrict"
>;

const committeeKey = (committee: CommitteeIdentity): string =>
  `${committee.cityTown}-${committee.legDistrict}-${committee.electionDistrict}`;

/**
 * Replaces the unresolved discrepancy set with the one an apply produced.
 *
 * Plan rows carry only a committee's compound identity (their `committee.id` is a
 * placeholder), so real ids are looked up once for the term. A voter whose earlier
 * discrepancy was resolved but who is flagged again is reopened in place: audit events
 * reference that row's id, so it must survive. Everything is written in bulk — a
 * per-row loop overran Prisma's interactive-transaction timeout on large rosters,
 * and a re-import after a resolution pass can reopen most of the roster at once.
 * The advisory lock serializes concurrent discrepancy writes, which would otherwise
 * race each other on the unique VRCNUM between the delete and the insert.
 */
async function persistDiscrepancies(
  discrepanciesMap: Map<string, DiscrepanciesAndCommittee>,
  activeTermId: string,
): Promise<void> {
  const voterIds = [...discrepanciesMap.keys()];

  await prisma.$transaction(async (tx) => {
    // $executeRaw, not $queryRaw: the lock function returns void, which Prisma cannot
    // deserialize as a result column.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DISCREPANCY_IMPORT_LOCK_KEY})`;

    const committees = await tx.committeeList.findMany({
      where: { termId: activeTermId },
      select: {
        id: true,
        cityTown: true,
        legDistrict: true,
        electionDistrict: true,
      },
    });
    const committeeIdByKey = new Map(
      committees.map((committee) => [committeeKey(committee), committee.id]),
    );
    const resolveCommitteeId = (committee: CommitteeIdentity): number => {
      const id = committeeIdByKey.get(committeeKey(committee));
      if (id === undefined) {
        throw new Error(
          `Committee ${committeeKey(committee)} does not exist for the active term`,
        );
      }
      return id;
    };

    await tx.committeeUploadDiscrepancy.deleteMany({
      where: { resolvedAt: null },
    });

    // Only resolved rows survive the delete, so anything left for these voters is one
    // being flagged again.
    const reopened = await tx.committeeUploadDiscrepancy.findMany({
      where: { VRCNUM: { in: voterIds } },
      select: { VRCNUM: true },
    });
    const reopenedVoterIds = new Set(reopened.map((row) => row.VRCNUM));

    if (reopenedVoterIds.size > 0) {
      const rows = [...reopenedVoterIds].flatMap((voterId) => {
        const entry = discrepanciesMap.get(voterId);
        return entry ? [[voterId, entry] as const] : [];
      });
      // Prisma has no per-row-values bulk update, so the reopen is one raw statement
      // joined against unnest'd column arrays. Column names match the schema exactly
      // (no @map), and the enum is passed as text and cast on the database side.
      // resolutionMetadata is set to JSON null, matching Prisma.JsonNull.
      await tx.$executeRaw`
        UPDATE "CommitteeUploadDiscrepancy" AS d
        SET "committeeId" = r.committee_id,
            "discrepancy" = r.discrepancy,
            "incomingMembershipType" = r.membership_type::"MembershipType",
            "resolvedAt" = NULL,
            "resolvedBy" = NULL,
            "resolution" = NULL,
            "resolutionMetadata" = 'null'::jsonb
        FROM unnest(
          ${rows.map(([voterId]) => voterId)}::text[],
          ${rows.map(([, entry]) => resolveCommitteeId(entry.committee))}::int[],
          ${rows.map(([, entry]) => JSON.stringify(entry.discrepancies))}::jsonb[],
          ${rows.map(([, entry]) => entry.incomingMembershipType)}::text[]
        ) AS r(vrcnum, committee_id, discrepancy, membership_type)
        WHERE d."VRCNUM" = r.vrcnum
      `;
    }

    await tx.committeeUploadDiscrepancy.createMany({
      data: [...discrepanciesMap.entries()]
        .filter(([voterId]) => !reopenedVoterIds.has(voterId))
        .map(([voterId, entry]) => ({
          VRCNUM: voterId,
          committeeId: resolveCommitteeId(entry.committee),
          discrepancy: entry.discrepancies,
          incomingMembershipType: entry.incomingMembershipType,
        })),
    });
  });
}

async function bulkLoadCommitteesHandler(
  req: NextRequest,
  session: SessionWithUser,
) {
  try {
    if (process.env.VERCEL) {
      return NextResponse.json({ error: "Not available in this environment" });
    }

    const body = (await req.json()) as unknown;
    const validation = validateRequest(body, bulkLoadCommitteesSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { format, fileName, dryRun } = validation.data;

    // An archived format describes a Committee Term that is already loaded: firing its
    // parser at the active term is exactly the mass-removal mistake this endpoint guards.
    if (ROSTER_FORMATS[format].status === "archived") {
      return invalidRequest(
        `Format "${format}" is archived and cannot be imported. Archived formats are available to scripts and seeding only.`,
      );
    }

    const filePath = resolveRosterFilePath(fileName);
    if (filePath === null) {
      return invalidRequest(
        `fileName must name a file directly inside the ${DATA_DIRECTORY} directory: "${fileName}"`,
      );
    }

    let activeTermId: string;
    try {
      activeTermId = await getActiveTermId();
    } catch {
      return NextResponse.json(
        {
          error: "No active committee term. Create one in Admin > Terms first.",
        },
        { status: 503 },
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: `File not found in the ${DATA_DIRECTORY} directory: "${fileName}"`,
        },
        { status: 404 },
      );
    }

    const parseResult = parseWithFormat(format, fs.readFileSync(filePath));

    const actor = {
      userId: session.user.id,
      userRole: session.user.privilegeLevel ?? PrivilegeLevel.Admin,
      activeTermId,
    };

    // A dry run answers what the import would do and writes nothing; applying recomputes
    // the plan and performs the writes, reporting what they did apart from the plan.
    const { plan, applied } = dryRun
      ? { plan: await planRosterImport(parseResult, actor), applied: null }
      : await applyRosterImport(parseResult, actor);

    // On an apply, the discrepancies persisted and reported are the ones the writes
    // actually produced, which may exceed the plan's if a live guard refused an activation.
    const discrepanciesMap = applied?.discrepancies ?? plan.discrepancies;

    if (!dryRun) {
      await persistDiscrepancies(discrepanciesMap, activeTermId);
    }

    const recordsWithDiscrepancies = await prisma.voterRecord.findMany({
      where: {
        OR: Array.from(discrepanciesMap.entries()).map(([key]) => ({
          VRCNUM: key,
        })),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: applied
          ? describeApplied(applied, plan)
          : "Import plan computed; nothing was written",
        dryRun,
        applied: applied ? toWireApplied(applied) : null,
        format,
        fileName,
        counts: plan.counts,
        removals: plan.removals,
        capacityFailures: plan.capacityFailures,
        discrepanciesMap: Array.from(discrepanciesMap.entries()).map<
          BulkLoadCommitteesResponse["discrepanciesMap"][number]
        >(([voterId, entry]) => [
          voterId,
          {
            discrepancies: entry.discrepancies,
            committee: toWireCommittee(entry.committee),
          },
        ]),
        recordsWithDiscrepancies:
          recordsWithDiscrepancies.map(toWireVoterRecord),
        rejectedRows: plan.rejectedRows,
      } satisfies BulkLoadCommitteesResponse,
      { status: 200 },
    );
  } catch (error) {
    // An expected refusal: the file is not the declared format, so nothing was read as
    // data and the parser's reason is the answer.
    if (error instanceof RosterFormatError) {
      return invalidRequest(error.message);
    }

    // An expected refusal: the plan would overfill a committee, so nothing was written.
    if (error instanceof RosterCapacityError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          capacityFailures: error.capacityFailures,
        } satisfies BulkLoadCommitteesError,
        { status: 422 },
      );
    }

    console.error("Error loading committee lists:", error);

    return NextResponse.json(
      { error: "Error loading committee lists" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  bulkLoadCommitteesHandler,
);
