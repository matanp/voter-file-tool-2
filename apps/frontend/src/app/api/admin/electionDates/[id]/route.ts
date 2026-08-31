import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import { logAuditEvent } from "~/lib/auditLog";

type RouteContext = { params?: Promise<{ id: string }> };

async function deleteElectionDateHandler(
  _req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id: idString } = await params;
  const id = parseInt(idString, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const deleted = await prisma.electionDate.delete({ where: { id } });

    // Fail-open, matching the create and bulk routes: election-config edits are
    // reference/config telemetry, not membership state, so a failed audit write must
    // not turn a successful delete into a 500.
    await logAuditEvent(
      session.user.id,
      session.user.privilegeLevel ?? PrivilegeLevel.Admin,
      "ELECTION_DATE_DELETED",
      "ElectionDate",
      String(deleted.id),
      { id: deleted.id, date: deleted.date },
      null,
    );
    return NextResponse.json({ id, message: "Election date deleted" });
  } catch (error) {
    console.error("Error deleting election date:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const DELETE = withPrivilege(
  PrivilegeLevel.Admin,
  deleteElectionDateHandler,
);
