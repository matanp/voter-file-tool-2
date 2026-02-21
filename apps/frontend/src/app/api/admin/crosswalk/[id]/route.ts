/**
 * SRS 3.7 — DELETE single LTED Crosswalk entry.
 */

import { PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";

type RouteContext = { params?: Promise<{ id: string }> };

async function deleteHandler(
  _req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id } = await params;

  const existing = await prisma.ltedDistrictCrosswalk.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Crosswalk entry not found" }, { status: 404 });
  }

  await prisma.ltedDistrictCrosswalk.delete({
    where: { id },
  });

  await logAuditEvent(
    session.user.id,
    session.user.privilegeLevel ?? PrivilegeLevel.Admin,
    "DISCREPANCY_RESOLVED",
    "LtedDistrictCrosswalk",
    id,
    {
      cityTown: existing.cityTown,
      legDistrict: existing.legDistrict,
      electionDistrict: existing.electionDistrict,
    },
    null,
    { actionType: "crosswalk_delete" },
  );

  return NextResponse.json({ success: true }, { status: 200 });
}

export const DELETE = withPrivilege(PrivilegeLevel.Admin, deleteHandler);
