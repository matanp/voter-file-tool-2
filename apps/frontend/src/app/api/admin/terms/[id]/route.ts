import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";

type RouteContext = { params?: Promise<{ id: string }> };

/** Set a term as the active term. Deactivates all others. */
async function setActiveHandler(
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
    const term = await prisma.committeeTerm.findUnique({
      where: { id },
    });

    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.committeeTerm.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      prisma.committeeTerm.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    return NextResponse.json({ success: true, activeTermId: id });
  } catch (error) {
    console.error("Error setting active term:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const PATCH = withPrivilege(PrivilegeLevel.Admin, setActiveHandler);
