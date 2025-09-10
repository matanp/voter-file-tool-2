import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { ldCommitteesArraySchema } from "@voter-file-tool/shared-validators";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { gzipSync } from "node:zlib";

const PDF_API_BASE = process.env.PDF_SERVER_URL
  ? process.env.PDF_SERVER_URL
  : "http://localhost:8080";

const PDF_API_URL = PDF_API_BASE + "/generate-committee-report";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.privilegeLevel) {
      return NextResponse.json({ error: "please log in" }, { status: 401 });
    }
    if (!hasPermissionFor(session.user.privilegeLevel, PrivilegeLevel.Admin)) {
      return NextResponse.json(
        {
          error: "user does not have sufficient privilege",
        },
        { status: 403 },
      );
    }
    const requestBody: unknown = await req.json();

    const ldCommitteesArray = ldCommitteesArraySchema.parse(requestBody);

    console.log(
      "Num characters: ",
      JSON.stringify({ groupedCommittees: ldCommitteesArray }).length,
    );

    const jsonPayload = JSON.stringify(ldCommitteesArray);
    const compressedPayload = gzipSync(jsonPayload);

    console.log(
      "Compressed: ",
      jsonPayload.length,
      " to: ",
      compressedPayload.length,
    );

    const response = await fetch(PDF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: new Uint8Array(compressedPayload),
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
