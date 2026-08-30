import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import {
  AuditAction,
  Prisma,
  PrivilegeLevel,
  type CommitteeTerm,
} from "@prisma/client";
import { updateTermSchema } from "@voter-file-tool/shared-validators";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import { parseTermDateRange } from "~/lib/dateUtils";

type RouteContext = { params?: Promise<{ id: string }> };

/** Reads the `[id]` route param, or returns a 404 response. */
async function readTermId(
  contextArgs: unknown[],
): Promise<{ id: string } | { response: NextResponse }> {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return {
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  const { id } = await params;
  return { id };
}

/** Set a term as the active term. Deactivates all others. */
async function setActiveHandler(
  _req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const route = await readTermId(contextArgs);
  if ("response" in route) {
    return route.response;
  }
  const { id } = route;

  const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

  try {
    const activated = await prisma.$transaction(async (tx) => {
      const term = await tx.committeeTerm.findUnique({
        where: { id },
      });

      if (!term) {
        return false;
      }

      const previousActive = await tx.committeeTerm.findFirst({
        where: { isActive: true },
      });

      await tx.committeeTerm.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      await tx.committeeTerm.update({
        where: { id },
        data: { isActive: true },
      });

      // Fail closed: the active term drives every committee read, so roll the
      // activation back if the audit row cannot be written.
      await logAuditEventOrThrow(
        session.user.id,
        userRole,
        AuditAction.TERM_UPDATED,
        "CommitteeTerm",
        id,
        { isActive: term.isActive, label: term.label },
        { isActive: true, label: term.label },
        { previousActiveTermId: previousActive?.id ?? null },
        tx,
      );

      return true;
    });

    if (!activated) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, activeTermId: id });
  } catch (error) {
    console.error("Error setting active term:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Updates a term's label and calendar dates. Does not change isActive. */
async function updateTermHandler(
  req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const route = await readTermId(contextArgs);
  if ("response" in route) {
    return route.response;
  }
  const { id } = route;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const validation = validateRequest(body, updateTermSchema);
  if (!validation.success) {
    return validation.response;
  }

  const { label, startDate, endDate } = validation.data;
  const dates = parseTermDateRange(startDate, endDate);
  if (!dates.ok) {
    return NextResponse.json({ error: dates.error }, { status: 400 });
  }

  const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

  type UpdateOutcome =
    | { status: "not_found" }
    | { status: "duplicate" }
    | { status: "updated"; term: CommitteeTerm };

  try {
    const outcome = await prisma.$transaction<UpdateOutcome>(async (tx) => {
      const term = await tx.committeeTerm.findUnique({
        where: { id },
      });

      if (!term) {
        return { status: "not_found" };
      }

      const duplicate = await tx.committeeTerm.findUnique({
        where: { label },
      });
      if (duplicate && duplicate.id !== id) {
        return { status: "duplicate" };
      }

      const updated = await tx.committeeTerm.update({
        where: { id },
        data: {
          label,
          startDate: dates.start,
          endDate: dates.end,
        },
      });

      // Fail closed: roll the edit back if the audit row cannot be written.
      await logAuditEventOrThrow(
        session.user.id,
        userRole,
        AuditAction.TERM_UPDATED,
        "CommitteeTerm",
        id,
        {
          label: term.label,
          startDate: term.startDate.toISOString(),
          endDate: term.endDate.toISOString(),
        },
        {
          label: updated.label,
          startDate: updated.startDate.toISOString(),
          endDate: updated.endDate.toISOString(),
        },
        tx,
      );

      return { status: "updated", term: updated };
    });

    if (outcome.status === "not_found") {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }
    if (outcome.status === "duplicate") {
      return NextResponse.json(
        { error: "Term with this label already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(outcome.term);
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
    console.error("Error updating term:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const PATCH = withPrivilege(PrivilegeLevel.Admin, setActiveHandler);
export const PUT = withPrivilege(PrivilegeLevel.Admin, updateTermHandler);
