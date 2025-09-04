import type { Session } from "@auth/core/types";
import type { PrivilegeLevel } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";

/**
 * Higher-order function to wrap API route handlers with privilege checks.
 *
 * @param requiredLevel - the privilege level required for this endpoint
 * @param handler - your original endpoint handler
 */
export function withPrivilege<T extends NextRequest = NextRequest>(
  requiredLevel: PrivilegeLevel,
  handler: (req: T, session: Session) => Promise<NextResponse>,
) {
  return async (req: T) => {
    const session = await auth();

    if (!session?.user?.privilegeLevel) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    if (!hasPermissionFor(session.user.privilegeLevel, requiredLevel)) {
      return NextResponse.json(
        { error: "User does not have sufficient privilege" },
        { status: 403 },
      );
    }

    return handler(req, session);
  };
}
