import { useContext } from "react";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";

/**
 * Hook for managing committee-related permissions
 * Consolidates permission checking logic used across multiple components
 */
export function useCommitteePermissions() {
  const { actingPermissions } = useContext(GlobalContext);

  return {
    isAdmin: hasPermissionFor(actingPermissions, PrivilegeLevel.Admin),
    canRequest: hasPermissionFor(
      actingPermissions,
      PrivilegeLevel.RequestAccess,
    ),
    canView: hasPermissionFor(actingPermissions, PrivilegeLevel.ReadAccess),
  };
}
