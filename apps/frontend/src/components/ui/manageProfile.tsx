"use client";

import {
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Sheet,
} from "./sheet";
import type { Session } from "next-auth";
import React from "react";
import { GlobalContext } from "../providers/GlobalContext";
import { ComboboxDropdown } from "./ComboBox";
import { PrivilegeLevel } from "@prisma/client";
import { SignOutButton } from "./signInButton";
import { Button } from "./button";

type ManageProfileButtonProps = {
  session: Session;
};

export const ManageProfileButton: React.FC<ManageProfileButtonProps> = ({
  session,
}) => {
  const { actingPermissions, setActingPermissions } =
    React.useContext(GlobalContext);

  const textStyles = "text-lg py-1";

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant={"outline"}>View Profile</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{session.user?.name ?? "No Name"}</SheetTitle>
          <h1 className={textStyles}>
            <span className="font-light">Email:</span>{" "}
            {session.user?.email ?? "No Email"}
          </h1>
          <h1 className={textStyles}>
            <span className="font-light">Privilege Level:</span>{" "}
            {session.privilegeLevel}
          </h1>
          {session.privilegeLevel === "Developer" && (
            <>
              <h1 className={textStyles}>
                <span className="font-light">Acting Privilege Level:</span>{" "}
                {actingPermissions}
              </h1>
              <ComboboxDropdown
                items={Object.values(PrivilegeLevel).map((privilege) => {
                  return { label: privilege, value: privilege };
                })}
                displayLabel={"Choose role"}
                onSelect={(privilege) => {
                  setActingPermissions(privilege as PrivilegeLevel);
                }}
              />
            </>
          )}
          <div>
            <SignOutButton />
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};
