import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { fetchFilteredDataSchema } from "../lib/utils";
import { convertPrismaVoterRecordToAPI } from "@voter-file-tool/shared-validators";

export async function POST(req: NextRequest) {
  try {
    const requestBody: unknown = await req.json();

    const { searchQuery, pageSize, page } =
      fetchFilteredDataSchema.parse(requestBody);

    let query: Record<string, unknown> = {};
    const andConditions: Prisma.VoterRecordWhereInput[] = [];

    for (const field of searchQuery) {
      if (field.value !== "" && field.value !== null) {
        const fieldField = field.field;

        // Handle email search criteria
        if (fieldField === "hasEmail") {
          if (field.value === true) {
            andConditions.push(
              { email: { not: null } },
              { email: { not: "" } },
            );
          }
        } else if (fieldField === "hasInvalidEmail") {
          if (field.value === true) {
            // Records that have email but it's invalid (no @ or doesn't end with .com)
            andConditions.push(
              // First ensure email exists and is not empty
              { email: { not: null } },
              { email: { not: "" } },
              {
                OR: [
                  // Missing @
                  { email: { not: { contains: "@" } } },
                  // Starts or ends with @
                  { email: { startsWith: "@" } },
                  { email: { endsWith: "@" } },
                  // Missing dot (no domain part)
                  { email: { not: { contains: "." } } },
                  // Starts or ends with dot
                  { email: { startsWith: "." } },
                  { email: { endsWith: "." } },
                  // Contains spaces
                  { email: { contains: " " } },
                  // Double @ (should only be one)
                  { email: { contains: "@@" } },
                  // Very short strings (less than 5 characters)
                  {
                    email: {
                      // Use a more explicit length check
                      in: ["", "a", "ab", "abc", "abcd"],
                    },
                  },
                ],
              },
            );
          }
        } else if (fieldField === "hasPhone") {
          if (field.value === true) {
            andConditions.push(
              { telephone: { not: null } },
              { telephone: { not: "" } },
            );
          }
        } else if (fieldField === "firstName" || fieldField === "lastName") {
          query = {
            ...query,
            [fieldField]:
              typeof field.value === "string"
                ? field.value.trim().toUpperCase()
                : field.value,
          };
        } else {
          query = { ...query, [fieldField]: field.value };
        }
      }
    }

    if (andConditions.length > 0) {
      query.AND = andConditions;
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
