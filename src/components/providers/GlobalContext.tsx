"use client";

import { PrivilegeLevel } from "@prisma/client";
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
  const [actingPermissions, setActingPermissions] =
    React.useState<PrivilegeLevel>(PrivilegeLevel.ReadAccess);

  return (
    <GlobalContext.Provider value={{ actingPermissions, setActingPermissions }}>
      {children}
    </GlobalContext.Provider>
  );
}
