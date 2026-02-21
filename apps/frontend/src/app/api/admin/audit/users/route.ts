import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";

/** Returns distinct users that appear in the audit log (for filter dropdown). */
async function getAuditUsersHandler(_req: NextRequest, _session: Session) {
  try {
    const logs = await prisma.auditLog.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });
    const userIds = [...new Set(logs.map((l) => l.userId))];
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list audit users:", error);
    return NextResponse.json(
      { error: "Failed to list audit users" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getAuditUsersHandler);
