import { type VoterRecord } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { fetchFilteredDataSchema, searchQueryFieldSchema } from "../lib/utils";

export async function POST(req: NextRequest) {
  try {
    const requestBody: unknown = await req.json();

    const { searchQuery, pageSize, page } =
      fetchFilteredDataSchema.parse(requestBody);

    let query: Partial<VoterRecord> = {};

    for (const field of searchQuery) {
      if (field.value !== "" && field.value !== null) {
        const fieldField = field.field;
        if (fieldField === "firstName" || fieldField === "lastName") {
          query = {
            ...query,
            ...{
              [fieldField]:
                typeof field.value === "string"
                  ? field.value.toUpperCase()
                  : field.value,
            },
          };
        } else {
          query = { ...query, ...{ [fieldField]: field.value } };
        }
      }
    }

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

    return NextResponse.json(
      { data: records, totalRecords: totalRecords },
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
