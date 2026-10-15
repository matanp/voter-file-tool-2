"use client";
import React, { useContext } from "react";
import { PrivilegeLevel } from "@prisma/client";

import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";

export type CommitteeEmptyScopeProps = {
  termLabel: string;
};

/**
 * Shown in place of the split pane when the caller's whole scope has no
 * committees: an empty term (Admin) or a Leader with no jurisdiction in the
 * active term. The server already decided the scope; the wording follows
 * `actingPermissions` like any other client-only presentation.
 */
export function CommitteeEmptyScope({ termLabel }: CommitteeEmptyScopeProps) {
  const { actingPermissions } = useContext(GlobalContext);
  const countywide = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);

  return (
    <div className="m-auto max-w-md space-y-2 p-6 text-center" role="status">
      <h2 className="text-lg font-semibold">No committees to show</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {countywide
          ? `The ${termLabel} term has no committees yet.`
          : `You have no committees assigned for the ${termLabel} term. An Admin can assign you a jurisdiction.`}
      </p>
    </div>
  );
}
