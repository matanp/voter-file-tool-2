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
import { Badge } from "./badge";
import { Button } from "./button";
import Link from "next/link";

type ManageProfileButtonProps = {
  session: Session;
};

type PendingInvite = {
  token: string;
  privilegeLevel: PrivilegeLevel;
  jurisdictions: Array<{
    id: string;
    cityTown: string;
    legDistrict: number | null;
    term: { label: string };
  }>;
};

function jurisdictionLabel(cityTown: string, legDistrict: number | null) {
  return legDistrict != null
    ? `${cityTown} LD ${legDistrict}`
    : `${cityTown} (all districts)`;
}

export const ManageProfileButton: React.FC<ManageProfileButtonProps> = ({
  session,
}) => {
  const { actingPermissions, setActingPermissions } =
    React.useContext(GlobalContext);
  const [open, setOpen] = React.useState(false);
  const [pendingInvite, setPendingInvite] =
    React.useState<PendingInvite | null>(null);
  const [pendingInviteLoading, setPendingInviteLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setPendingInviteLoading(true);

    fetch("/api/auth/invite/pending", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PendingInvite | null;
      })
      .then((invite) => {
        if (!cancelled) setPendingInvite(invite);
      })
      .catch(() => {
        if (!cancelled) setPendingInvite(null);
      })
      .finally(() => {
        if (!cancelled) setPendingInviteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const textStyles = "text-lg py-1";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <h1 className="bg-slate-900 text-slate-50 hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 hover:shadow-button-select h-9 rounded-md px-3 flex items-center align-items">
          View Profile
        </h1>
        {/* <Button variant={"outline"}>View Profile</Button> */}
      </SheetTrigger>
      <SheetContent>
        <div className="flex items-center justify-between absolute top-4 left-6 right-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Open Source Politics
          </h2>
          <Badge
            variant="secondary"
            hoverable={false}
            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            title="Thank you for trying out our early access version! Your feedback helps us improve the platform."
          >
            BETA
          </Badge>
        </div>
        <SheetHeader className="mt-16">
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
          {pendingInvite && (
            <div className="mt-4 space-y-3 rounded-md border p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Pending invite</span>
                  <Badge variant="outline" hoverable={false}>
                    {pendingInvite.privilegeLevel}
                  </Badge>
                </div>
                {pendingInvite.jurisdictions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingInvite.jurisdictions.map((jurisdiction) => (
                      <Badge
                        key={jurisdiction.id}
                        variant="secondary"
                        hoverable={false}
                      >
                        {jurisdictionLabel(
                          jurisdiction.cityTown,
                          jurisdiction.legDistrict,
                        )}{" "}
                        - {jurisdiction.term.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button asChild className="w-full">
                <Link
                  href={`/auth/invite/${encodeURIComponent(pendingInvite.token)}`}
                >
                  Claim your access
                </Link>
              </Button>
            </div>
          )}
          {!pendingInvite && pendingInviteLoading && (
            <p className="text-sm text-muted-foreground">
              Checking for pending invite...
            </p>
          )}
          <div>
            <SignOutButton />
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};
