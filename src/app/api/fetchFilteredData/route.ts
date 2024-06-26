import { VoterRecord } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";

function isKeyOfVoterRecord(key: string): key is keyof VoterRecord {
  // return [
  //   "firstName",
  //   "lastName",
  //   "party",
  //   "gender",
  //   "DOB",
  //   "telephone",
  //   "email",
  //   "houseNum",
  //   "street",
  //   "city",
  //   "state",
  //   "zipCode",
  //   "countyLegDistrict",
  //   "address",
  //   "phone",
  // ].includes(key);

  // :OHNO: do this for real
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const searchQuery = await req.json();

    let query: Partial<VoterRecord> = {};

    for (const field of searchQuery) {
      if (field.value !== "" && field.value !== null) {
        let fieldField = field.field;
        if (isKeyOfVoterRecord(fieldField)) {
          if (fieldField === "firstName" || fieldField === "lastName") {
            query[fieldField] = field.value.toUpperCase();
          } else {
            query[fieldField] = field.value;
          }
        }
      }
    }

    if (!searchQuery) {
      return NextResponse.json(
        { error: "Missing search query" },
        { status: 400 },
      );
    }

    const records = await prisma.voterRecord.findMany({
      where: query,
    });

    console.log(records.length);

    const data = records.slice(0, 10);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
