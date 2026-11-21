"use client";

import { PrivilegeLevel } from "@prisma/client";
import { useSession } from "next-auth/react";
import * as React from "react";
import { isPrivilegeLevel } from "~/lib/utils";

type GlobalContextType = {
  actingPermissions: PrivilegeLevel;
  setActingPermissions: (privilegeLevel: PrivilegeLevel) => void;
};

export const GlobalContext = React.createContext<GlobalContextType>({
  actingPermissions: PrivilegeLevel.ReadAccess,
  setActingPermissions: () => {
    throw new Error("Function not implemented.");
  },
});

export function GlobalContextProvider({ children }: React.PropsWithChildren) {
  const { data: session, status } = useSession();

  // Start from the session's role, which the server passes in (ticket 29), so
  // role-gated UI is right on first paint instead of appearing a moment
  // later. A Developer's cached acting role is in localStorage, which only the
  // effect below can read without a hydration mismatch.
  const [actingPermissions, setActingPermissions] =
    React.useState<PrivilegeLevel>(
      () => session?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess,
    );

  React.useEffect(() => {
    const actingPermissionsCached = localStorage.getItem("actingPermissions");

    if (status === "authenticated" && session.user?.privilegeLevel) {
      const privilegeLevel = session.user.privilegeLevel;
      if (
        privilegeLevel === PrivilegeLevel.Developer &&
        actingPermissionsCached &&
        isPrivilegeLevel(actingPermissionsCached)
      ) {
        setActingPermissions(actingPermissionsCached);
      } else {
        setActingPermissions(privilegeLevel);
      }
    }
  }, [status, session]);

  const handleSetPermissions = (privilegeLevel: PrivilegeLevel) => {
    localStorage.setItem("actingPermissions", privilegeLevel);
    setActingPermissions(privilegeLevel);
  };

  return (
    <GlobalContext.Provider
      value={{ actingPermissions, setActingPermissions: handleSetPermissions }}
    >
      {children}
    </GlobalContext.Provider>
  );
}
