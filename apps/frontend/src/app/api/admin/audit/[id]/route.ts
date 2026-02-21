import { NextResponse, type NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";

type RouteContext = { params?: Promise<{ id: string }> };

/** Returns full audit log entry including beforeValue, afterValue, metadata. */
async function getAuditDetailHandler(
  _req: NextRequest,
  _session: Session,
  ...contextArgs: unknown[]
) {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id } = await params;

  try {
    const entry = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Audit log entry not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to get audit log entry:", error);
    return NextResponse.json(
      { error: "Failed to get audit log entry" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getAuditDetailHandler);
