"use client";

import { useContext } from "react";
import { useSession } from "next-auth/react";
import { SignInButton } from "./signInButton";
import type { PrivilegeLevel } from "@prisma/client";
import { hasPermissionFor } from "~/lib/utils";
import { GlobalContext } from "~/components/providers/GlobalContext";

export default function AuthCheck({
  children,
  privilegeLevel,
}: {
  children: React.ReactNode;
  privilegeLevel?: PrivilegeLevel;
}) {
  const { status } = useSession();
  const { actingPermissions } = useContext(GlobalContext);

  if (status === "authenticated") {
    if (
      privilegeLevel &&
      !hasPermissionFor(actingPermissions, privilegeLevel)
    ) {
      return (
        <div className="w-full flex flex-col items-center">
          <h1>
            You do not have permission for this page. Contact an admin if you
            believe this is an error.
          </h1>
        </div>
      );
    }

    return children;
  } else if (status === "loading") {
    return (
      <div className="w-full flex flex-col items-center">
        <h1>Loading...</h1>
      </div>
    );
  } else {
    return (
      <div className="w-full flex flex-col items-center">
        <h1>Please sign in to continue</h1>
        <SignInButton />
      </div>
    );
  }
}
