import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { AuditAction, Prisma, PrivilegeLevel } from "@prisma/client";
import { createTermSchema } from "@voter-file-tool/shared-validators";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import { parseTermDateRange } from "~/lib/dateUtils";

/** List all committee terms ordered by start date descending. */
async function getTermsHandler(_req: NextRequest, _session: SessionWithUser) {
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

/** Handles POST /terms: validates body and creates a new CommitteeTerm. */
async function postTermHandler(req: NextRequest, session: SessionWithUser) {
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
  const dates = parseTermDateRange(startDate, endDate);
  if (!dates.ok) {
    return NextResponse.json({ error: dates.error }, { status: 400 });
  }

  const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

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

    const term = await prisma.$transaction(async (tx) => {
      const created = await tx.committeeTerm.create({
        data: {
          label,
          startDate: dates.start,
          endDate: dates.end,
          isActive: false,
        },
      });

      // Fail closed: roll the create back if the audit row cannot be written.
      await logAuditEventOrThrow(
        session.user.id,
        userRole,
        AuditAction.TERM_CREATED,
        "CommitteeTerm",
        created.id,
        null,
        {
          label: created.label,
          startDate: created.startDate.toISOString(),
          endDate: created.endDate.toISOString(),
          isActive: created.isActive,
        },
        tx,
      );

      return created;
    });

    return NextResponse.json(term, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Term with this label already exists" },
        { status: 409 },
      );
    }
    console.error("Error creating term:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getTermsHandler);
export const POST = withPrivilege(PrivilegeLevel.Admin, postTermHandler);
