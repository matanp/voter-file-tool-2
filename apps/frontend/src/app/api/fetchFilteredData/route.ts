import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { fetchFilteredDataSchema } from "../lib/utils";
import { validateRequest } from "../lib/validateRequest";
import {
  convertPrismaVoterRecordToAPI,
  buildPrismaWhereClause,
} from "@voter-file-tool/shared-validators";
import type { Prisma } from "@prisma/client";
import { withPrivilege } from "../lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";

async function fetchFilteredDataHandler(req: NextRequest, _session: Session) {
  try {
    const requestBody: unknown = await req.json();

    const validation = validateRequest(requestBody, fetchFilteredDataSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { searchQuery, pageSize, page } = validation.data;

    const query: Prisma.VoterRecordWhereInput =
      buildPrismaWhereClause(searchQuery);

    // use cursor based pagination if performance becomes a problem
    const records = await prisma.voterRecord.findMany({
      where: query,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalRecords = await prisma.voterRecord.count({
      where: query,
    });

    // Convert Prisma records to API format (Date -> string conversion)
    const apiRecords = records.map(convertPrismaVoterRecordToAPI);

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
