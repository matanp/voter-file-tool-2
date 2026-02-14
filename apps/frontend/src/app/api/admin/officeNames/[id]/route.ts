import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";

type RouteContext = { params?: Promise<{ id: string }> };

async function deleteOfficeNameHandler(
  _req: NextRequest,
  _session: Session,
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
    await prisma.officeName.delete({ where: { id } });
    return NextResponse.json({ id, message: "Election Office deleted" });
  } catch (error) {
    console.error("Error deleting office name:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const DELETE = withPrivilege(
  PrivilegeLevel.Admin,
  deleteOfficeNameHandler,
);
