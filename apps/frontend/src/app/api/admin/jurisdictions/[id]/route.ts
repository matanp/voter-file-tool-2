/**
 * SRS 3.1 — DELETE a jurisdiction assignment.
 */

import { AuditAction, PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";

type RouteContext = { params?: Promise<{ id: string }> };

async function deleteHandler(
  _req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  const { id } = await params;

  const jurisdiction = await prisma.userJurisdiction.findUnique({
    where: { id },
  });
  if (!jurisdiction) {
    return NextResponse.json(
      { success: false, error: "Jurisdiction not found" },
      { status: 404 },
    );
  }

  try {
    await prisma.userJurisdiction.delete({ where: { id } });

    const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;
    await logAuditEvent(
      session.user.id,
      userRole,
      AuditAction.JURISDICTION_REMOVED,
      "UserJurisdiction",
      id,
      {
        userId: jurisdiction.userId,
        cityTown: jurisdiction.cityTown,
        legDistrict: jurisdiction.legDistrict,
        termId: jurisdiction.termId,
      },
      null,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting jurisdiction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete jurisdiction" },
      { status: 500 },
    );
  }
}

export const DELETE = withPrivilege(PrivilegeLevel.Admin, deleteHandler);
