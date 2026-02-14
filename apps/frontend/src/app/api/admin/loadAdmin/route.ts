import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

const developerEmails = ["mpresberg@gmail.com", "avi.presberg@gmail.com"];

/** Handles loading admin data for the admin API route; accepts NextRequest and Session and returns admin payload or error response. */
async function loadAdminHandler(_req: NextRequest, _session: Session) {
  try {
    for (const email of developerEmails) {
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) continue;

      await prisma.user.update({
        where: { email },
        data: {
          privilegeLevel: "Developer",
        },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Developer, loadAdminHandler);
