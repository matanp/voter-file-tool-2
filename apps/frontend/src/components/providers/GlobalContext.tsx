"use client";

import { PrivilegeLevel } from "@prisma/client";
import { useSession } from "next-auth/react";
import * as React from "react";
import { isPrivilegeLevel } from "~/lib/utils";

// Old name kept on purpose: renaming the key would discard every Developer's saved acting privilege.
const ACTING_PRIVILEGE_STORAGE_KEY = "actingPermissions";

type GlobalContextType = {
  actingPrivilege: PrivilegeLevel;
  setActingPrivilege: (privilegeLevel: PrivilegeLevel) => void;
};

export const GlobalContext = React.createContext<GlobalContextType>({
  actingPrivilege: PrivilegeLevel.ReadAccess,
  setActingPrivilege: () => {
    throw new Error("Function not implemented.");
  },
});

export function GlobalContextProvider({ children }: React.PropsWithChildren) {
  const { data: session, status } = useSession();

  const [actingPrivilege, setActingPrivilege] = React.useState<PrivilegeLevel>(
    PrivilegeLevel.ReadAccess,
  );

  React.useEffect(() => {
    const cachedActingPrivilege = localStorage.getItem(
      ACTING_PRIVILEGE_STORAGE_KEY,
    );

    if (status === "authenticated" && session.user?.privilegeLevel) {
      const privilegeLevel = session.user.privilegeLevel;
      if (
        privilegeLevel === PrivilegeLevel.Developer &&
        cachedActingPrivilege &&
        isPrivilegeLevel(cachedActingPrivilege)
      ) {
        setActingPrivilege(cachedActingPrivilege);
      } else {
        setActingPrivilege(privilegeLevel);
      }
    }
  }, [status, session]);

  const handleSetActingPrivilege = (privilegeLevel: PrivilegeLevel) => {
    localStorage.setItem(ACTING_PRIVILEGE_STORAGE_KEY, privilegeLevel);
    setActingPrivilege(privilegeLevel);
  };

  return (
    <GlobalContext.Provider
      value={{ actingPrivilege, setActingPrivilege: handleSetActingPrivilege }}
    >
      {children}
    </GlobalContext.Provider>
  );
}
