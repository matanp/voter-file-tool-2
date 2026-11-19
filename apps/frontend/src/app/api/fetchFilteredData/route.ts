import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { fetchFilteredDataSchema } from "../lib/utils";
import { validateRequest } from "../lib/validateRequest";
import {
  convertPrismaVoterRecordToAPI,
  buildPrismaWhereClause,
  normalizeSearchQuery,
} from "@voter-file-tool/shared-validators";
import type { Prisma } from "@prisma/client";
import { withPrivilege, type SessionWithUser } from "../lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import { activeCommitteesForRecords } from "../lib/recordSearchCommittees";
import type { RecordSearchCommittee } from "~/lib/recordSearch";

/**
 * Record search. Open to ReadAccess. With `includeCommittee: true` (sent only
 * by the record search page), each record gains `activeCommittee` when the
 * caller's real role may see that committee's roster (see
 * `activeCommitteesForRecords`). Otherwise the key is absent and no
 * membership lookup runs.
 */
async function fetchFilteredDataHandler(
  req: NextRequest,
  session: SessionWithUser,
) {
  // A malformed or truncated body (e.g. a request the client aborted) is the
  // caller's error, not a server failure.
  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const validation = validateRequest(requestBody, fetchFilteredDataSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { searchQuery, pageSize, page, includeCommittee } = validation.data;
    const normalized = normalizeSearchQuery(searchQuery);

    const query: Prisma.VoterRecordWhereInput =
      buildPrismaWhereClause(normalized);

    // use cursor based pagination if performance becomes a problem
    const records = await prisma.voterRecord.findMany({
      where: query,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalRecords = await prisma.voterRecord.count({
      where: query,
    });

    const committees = includeCommittee
      ? await activeCommitteesForRecords(
          records.map((record) => record.VRCNUM),
          session.user,
        )
      : new Map<string, RecordSearchCommittee>();

    // Convert Prisma records to API format (Date -> string conversion)
    const apiRecords = records.map((record) => {
      const apiRecord = convertPrismaVoterRecordToAPI(record);
      const activeCommittee = committees.get(record.VRCNUM);
      return activeCommittee ? { ...apiRecord, activeCommittee } : apiRecord;
    });

    return NextResponse.json(
      { data: apiRecords, totalRecords: totalRecords },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.ReadAccess,
  fetchFilteredDataHandler,
);
