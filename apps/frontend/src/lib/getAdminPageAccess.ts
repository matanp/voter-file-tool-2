import { PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";

export type PageAccessOk = {
  ok: true;
  userId: string;
  privilegeLevel: PrivilegeLevel;
};

export type PageAccessDenied = {
  ok: false;
};

export type PageAccessResult = PageAccessOk | PageAccessDenied;

/** Returns whether the current session is authenticated for server page access. */
export async function getAuthenticatedPageAccess(): Promise<PageAccessResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId == null || session?.user == null) {
    return { ok: false };
  }

  const privilegeLevel =
    session.user.privilegeLevel ?? PrivilegeLevel.ReadAccess;

  return { ok: true, userId, privilegeLevel };
}

/** Returns whether the current session has Admin+ actual privilege for server page access. */
export async function getAdminPageAccess(): Promise<PageAccessResult> {
  const access = await getAuthenticatedPageAccess();
  if (!access.ok) {
    return { ok: false };
  }

  if (!hasPermissionFor(access.privilegeLevel, PrivilegeLevel.Admin)) {
    return { ok: false };
  }

  return access;
}
