// app/api/generate-pdf/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { generatePdfDataSchema } from "../lib/utils";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";

const PRINT_PARTY_MAP = {
  BLK: "Blank",
  CON: "Congressional",
  IND: "Independent",
  LBT: "Libertarian",
  GRE: "Green",
  DEM: "Democratic",
  REP: "Republican",
  OTH: "Other",
  REF: "Reform",
  WEP: "We the People",
  SAM: "Save America Movement",
  WOR: "Working Families Party",
} as const;

const PDF_API_BASE = process.env.PDF_SERVER_URL
  ? process.env.PDF_SERVER_URL
  : "http://localhost:8080";

const PDF_API_URL = PDF_API_BASE + "/generate-pdf";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.privilegeLevel) {
      return NextRequest.json({ error: "please log in" });
    }
    if (
      !hasPermissionFor(
        session.user.privilegeLevel,
        PrivilegeLevel.RequestAccess,
      )
    ) {
      return NextRequest.json({
        error: "user does not have sufficient privilege",
      });
    }
    const requestBody: unknown = await req.json();

    const { candidates, vacancyAppointments, party, electionDate, numPages } =
      generatePdfDataSchema.parse(requestBody);

    const response = await fetch(PDF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidates,
        vacancyAppointments,
        party,
        electionDate,
        numPages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfNodeBuffer = Buffer.from(pdfBuffer);

    return new NextResponse(pdfNodeBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=output.pdf",
        "Content-Length": pdfNodeBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
