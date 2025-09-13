import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { fetchFilteredDataSchema } from "../lib/utils";
import {
  convertPrismaVoterRecordToAPI,
  buildPrismaWhereClause,
} from "@voter-file-tool/shared-validators";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const requestBody: unknown = await req.json();

    const { searchQuery, pageSize, page } =
      fetchFilteredDataSchema.parse(requestBody);

    const query: Prisma.VoterRecordWhereInput =
      buildPrismaWhereClause(searchQuery);

    if (!searchQuery) {
      return NextResponse.json(
        { error: "Missing search query" },
        { status: 400 },
      );
    }

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
