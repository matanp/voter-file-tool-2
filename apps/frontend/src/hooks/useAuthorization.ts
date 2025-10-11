"use client";

import { useContext } from "react";
import { useSession } from "next-auth/react";
import { PrivilegeLevel } from "@prisma/client";
import { hasPermissionFor } from "~/lib/utils";
import { GlobalContext } from "~/components/providers/GlobalContext";

/**
 * Hook that checks if the current user has the required privilege level.
 * Respects actingPermissions from GlobalContext for developer impersonation.
 * Returns access status, loading state, and the user's current privilege level.
 */
export function useRequiresPrivilege(level: PrivilegeLevel) {
  const { status } = useSession();
  const { actingPermissions } = useContext(GlobalContext);

  return {
    hasAccess: hasPermissionFor(actingPermissions, level),
    isLoading: status === "loading",
    currentLevel: actingPermissions,
  };
}

/**
 * Convenience hook to check if the current user has Admin privileges.
 * Respects actingPermissions from GlobalContext for developer impersonation.
 */
export function useIsAdmin() {
  return useRequiresPrivilege(PrivilegeLevel.Admin).hasAccess;
}

/**
 * Convenience hook to check if the current user has Developer privileges.
 * Respects actingPermissions from GlobalContext for developer impersonation.
 */
export function useIsDeveloper() {
  return useRequiresPrivilege(PrivilegeLevel.Developer).hasAccess;
}
