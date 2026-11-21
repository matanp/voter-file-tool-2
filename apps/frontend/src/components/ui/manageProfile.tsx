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
import { jurisdictionLabel } from "~/lib/invites/display";
import { cn } from "~/lib/utils";

type ProfileSheetProps = {
  session: Session;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A `ViewProfileTrigger` (in any wrapper) that opens the sheet. */
  trigger?: React.ReactNode;
  /** Overrides where focus goes on close, which is the trigger by default. */
  onCloseAutoFocus?: (event: Event) => void;
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

/** The "View Profile" button that opens a `ProfileSheet`. Use inside the sheet's `trigger`. */
export const ViewProfileTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <SheetTrigger asChild>
    <button
      ref={ref}
      type="button"
      className={cn(
        "bg-slate-900 text-slate-50 hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 hover:shadow-button-select h-9 rounded-md px-3 flex items-center",
        className,
      )}
      {...props}
    >
      View Profile
    </button>
  </SheetTrigger>
));
ViewProfileTrigger.displayName = "ViewProfileTrigger";

/** A "View Profile" button with its own profile sheet. */
export const ManageProfileButton: React.FC<{ session: Session }> = ({
  session,
}) => {
  const [open, setOpen] = React.useState(false);
  return (
    <ProfileSheet
      session={session}
      open={open}
      onOpenChange={setOpen}
      trigger={<ViewProfileTrigger />}
    />
  );
};

/** The signed-in user's profile, invite and sign-out sheet, opened and closed by its owner. */
export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  session,
  open,
  onOpenChange,
  trigger,
  onCloseAutoFocus,
}) => {
  const { actingPrivilege, setActingPrivilege } =
    React.useContext(GlobalContext);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger}
      <SheetContent onCloseAutoFocus={onCloseAutoFocus}>
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
                {actingPrivilege}
              </h1>
              <ComboboxDropdown
                items={Object.values(PrivilegeLevel).map((privilege) => {
                  return { label: privilege, value: privilege };
                })}
                displayLabel={"Choose role"}
                onSelect={(privilege) => {
                  setActingPrivilege(privilege as PrivilegeLevel);
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
