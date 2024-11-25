// app/api/generate-pdf/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { generatePdfDataSchema } from "../lib/utils";
import {
  PartyCode,
  PRINT_PARTY_MAP,
} from "~/app/reports/NewGeneratePetitionForm";

const PDF_API_URL = process.env.PDF_SERVER_URL
  ? process.env.PDF_SERVER_URL
  : "http://localhost:8080/generate-pdf";

export async function POST(req: NextRequest) {
  try {
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
        party: PRINT_PARTY_MAP[party as PartyCode],
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
