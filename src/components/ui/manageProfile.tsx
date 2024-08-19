"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "./button";
import {
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Sheet,
} from "./sheet";
import { Session } from "next-auth";
import React from "react";
import { GlobalContext } from "../providers/GlobalContext";
import { ComboboxDropdown } from "./ComboBox";
import { PrivilegeLevel } from "@prisma/client";
import { SignOutButton } from "./signInButton";

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
        <Button>View Profile</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your Profile</SheetTitle>
          <h1 className={textStyles}>
            Name: {session.user?.name ?? "No Name"}
          </h1>
          <h1 className={textStyles}>
            Email: {session.user?.email ?? "No Email"}
          </h1>
          <h1 className={textStyles}>
            Privilege Level: {session.privilegeLevel}
          </h1>
          {session.privilegeLevel === "Developer" && (
            <>
              <h1 className={textStyles}>
                Acting Privilege Level: {actingPermissions}
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
