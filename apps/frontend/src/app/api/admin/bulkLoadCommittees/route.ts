import prisma from "~/lib/prisma";
import * as fs from "fs";
import * as path from "path";
import { NextResponse } from "next/server";
import { applyRosterImport, planRosterImport } from "./bulkLoadUtils";
import { ROSTER_FORMATS, parseWithFormat } from "./rosterFormats";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  PrivilegeLevel,
  Prisma,
  type CommitteeList,
  type VoterRecord,
} from "@prisma/client";
import {
  bulkLoadCommitteesSchema,
  type BulkLoadCommitteesResponse,
} from "@voter-file-tool/shared-validators";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
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
    // the plan and performs the writes.
    const plan = dryRun
      ? await planRosterImport(parseResult, actor)
      : await applyRosterImport(parseResult, actor);

    const discrepanciesMap = plan.discrepancies;

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        await tx.committeeUploadDiscrepancy.deleteMany({
          where: { resolvedAt: null },
        });

        for (const [
          voterId,
          discrepancyAndCommittee,
        ] of discrepanciesMap.entries()) {
          const committeeConnect = {
            cityTown_legDistrict_electionDistrict_termId: {
              cityTown: discrepancyAndCommittee.committee.cityTown,
              legDistrict: discrepancyAndCommittee.committee.legDistrict,
              electionDistrict:
                discrepancyAndCommittee.committee.electionDistrict,
              termId: activeTermId,
            },
          };

          await tx.committeeUploadDiscrepancy.upsert({
            where: { VRCNUM: voterId },
            create: {
              VRCNUM: voterId,
              discrepancy: discrepancyAndCommittee.discrepancies,
              committee: { connect: committeeConnect },
            },
            update: {
              discrepancy: discrepancyAndCommittee.discrepancies,
              committee: { connect: committeeConnect },
              resolvedAt: null,
              resolvedBy: null,
              resolution: null,
              resolutionMetadata: Prisma.JsonNull,
            },
          });
        }
      });
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
        message: dryRun
          ? "Import plan computed; nothing was written"
          : "Committee lists loaded successfully",
        dryRun,
        applied: !dryRun,
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
