"use client";

import { PrivilegeLevel } from "@prisma/client";
import { useSession } from "next-auth/react";
import * as React from "react";

type GlobalContextType = {
  actingPermissions: PrivilegeLevel;
  setActingPermissions: (privilegeLevel: PrivilegeLevel) => void;
};

export const GlobalContext = React.createContext<GlobalContextType>({
  actingPermissions: PrivilegeLevel.ReadAccess,
  setActingPermissions: (privilegeLevel: PrivilegeLevel) => {
    throw new Error("Function not implemented.");
  },
});

export function GlobalContextProvider({ children }: React.PropsWithChildren) {
  const { data: session, status } = useSession();

  const [actingPermissions, setActingPermissions] =
    React.useState<PrivilegeLevel>(PrivilegeLevel.ReadAccess);

  React.useEffect(() => {
    if (status === "authenticated" && session.user?.privilegeLevel) {
      const privilegeLevel = session.user.privilegeLevel;
      setActingPermissions(privilegeLevel);
    }
  }, [status, session]);

  return (
    <GlobalContext.Provider value={{ actingPermissions, setActingPermissions }}>
      {children}
    </GlobalContext.Provider>
  );
}
