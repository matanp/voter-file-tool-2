"use client";
import { PrivilegeLevel } from "@prisma/client";
import { useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { SignInButton } from "~/components/ui/signInButton";
import { hasPermissionFor } from "~/lib/utils";
import { GlobalContext } from "~/components/providers/GlobalContext";
type HeaderProps = {
  /** Rendered in the top-left slot; the layout passes the DB badge here. */
  dbBadge?: ReactNode;
};

const Header: React.FC<HeaderProps> = ({ dbBadge }) => {
  const pathname = usePathname();
  const { actingPermissions } = useContext(GlobalContext);

  const showDataTab = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);

  const sharedTabStyle =
    "h-16 text-xl font-semibold w-42 flex items-center justify-center";
  const tabStyleActive = "bg-primary";
  const tabStyleInactive = "bg-muted-foreground";
  return (
    <div className="overflow-x-auto bg-accent border-b-2 border-solid">
      <div className="flex items-center justify-between p-1 min-w-full">
        {/* Left slot - DB badge in dev; an empty spacer on large screens in prod */}
        <div
          className={
            dbBadge
              ? "flex shrink-0 items-center px-2 lg:w-[150px]"
              : "hidden lg:block w-[150px]"
          }
        >
          {dbBadge}
        </div>

        {/* Navigation tabs - centered on large screens, left-aligned on small screens */}
        <div className="flex items-center justify-center lg:justify-center gap-2 py-2 flex-1 lg:flex-none">
          {/* <ThemeToggle className="mr-auto" /> */}
          <Link href="/recordsearch">
            <Button
              className={`${sharedTabStyle} ${pathname?.includes("record") ? tabStyleActive : tabStyleInactive}`}
            >
              Record Search
            </Button>
          </Link>
          <Link href="/committees">
            <Button
              className={`${sharedTabStyle} ${pathname?.startsWith("/committees") ? tabStyleActive : tabStyleInactive}`}
            >
              Committee List
            </Button>
          </Link>
          <Link href="/reports">
            <Button
              className={`${sharedTabStyle} ${["/reports", "/committee-reports", "/committee-roster-reports", "/voter-list-reports", "/petitions", "/sign-in-sheet-reports", "/weight-summary-reports", "/vacancy-reports", "/changes-reports", "/petition-outcomes-reports"].some((p) => pathname?.startsWith(p)) ? tabStyleActive : tabStyleInactive}`}
            >
              Reports
            </Button>
          </Link>
          {showDataTab && (
            <Link href="/admin">
              <Button
                className={`${sharedTabStyle} ${pathname?.startsWith("/admin") ? tabStyleActive : tabStyleInactive}`}
              >
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Right spacer - hidden on small screens when content overflows */}
        <div className="hidden lg:flex w-[150px] items-center justify-center">
          <SignInButton />
        </div>

        {/* Sign in button for small screens */}
        <div className="lg:hidden flex items-center gap-2 py-2">
          <SignInButton />
        </div>
      </div>
    </div>
  );
};

export default Header;
