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
import { Button, buttonVariants } from "./button";
import Link from "next/link";
import { jurisdictionLabel, privilegeLabel } from "~/lib/invites/display";
import { PRODUCT_NAME } from "~/lib/branding";

type ProfileSheetProps = {
  session: Session;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A `ViewProfileTrigger` (in any wrapper) that opens the sheet. */
  trigger?: React.ReactNode;
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

/**
 * The unstyled button that opens a `ProfileSheet`. Use inside the sheet's `trigger` and style
 * it with `className` (it has no look of its own); it reads "View Profile" unless given children.
 */
export const ViewProfileTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...props }, ref) => (
  <SheetTrigger asChild>
    <button ref={ref} type="button" {...props}>
      {children ?? "View Profile"}
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
      trigger={
        <ViewProfileTrigger className={buttonVariants({ size: "sm" })} />
      }
    />
  );
};

/** The signed-in user's profile, invite and sign-out sheet, opened and closed by its owner. */
export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  session,
  open,
  onOpenChange,
  trigger,
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
      <SheetContent>
        <div className="flex items-center justify-between absolute top-4 left-6 right-16">
          <h2 className="text-lg font-semibold text-foreground">
            {PRODUCT_NAME}
          </h2>
          <Badge
            variant="secondary"
            hoverable={false}
            className="bg-blue-100 text-blue-800"
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
            {privilegeLabel(session.privilegeLevel)}
          </h1>
          {session.privilegeLevel === "Developer" && (
            <>
              <h1 className={textStyles}>
                <span className="font-light">Acting Privilege Level:</span>{" "}
                {privilegeLabel(actingPrivilege)}
              </h1>
              <ComboboxDropdown
                items={Object.values(PrivilegeLevel).map((privilege) => {
                  return { label: privilegeLabel(privilege), value: privilege };
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
                    {privilegeLabel(pendingInvite.privilegeLevel)}
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
