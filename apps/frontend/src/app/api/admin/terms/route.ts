import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import { validateRequest } from "~/app/api/lib/validateRequest";
import type { Session } from "next-auth";

/** List all committee terms ordered by start date descending. */
async function getTermsHandler(_req: NextRequest, _session: Session) {
  try {
    const terms = await prisma.committeeTerm.findMany({
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(terms);
  } catch (error) {
    console.error("Error fetching terms:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

const createTermSchema = z.object({
  label: z.string().min(1, "Label is required"),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date",
  }),
});

/** Handles POST /terms: validates body and creates a new CommitteeTerm. */
async function postTermHandler(req: NextRequest, _session: Session) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }
  const validation = validateRequest(body, createTermSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { label, startDate, endDate } = validation.data;

  try {
    const existing = await prisma.committeeTerm.findUnique({
      where: { label },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Term with this label already exists" },
        { status: 409 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    const term = await prisma.committeeTerm.create({
      data: {
        label,
        startDate: start,
        endDate: end,
        isActive: false,
      },
    });

    return NextResponse.json(term, { status: 201 });
  } catch (error) {
    console.error("Error creating term:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getTermsHandler);
export const POST = withPrivilege(PrivilegeLevel.Admin, postTermHandler);
