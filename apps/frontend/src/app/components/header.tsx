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

  // Phones: a two-column grid of shorter tabs. From sm up: the original fixed-size tabs.
  const sharedTabStyle =
    "h-12 w-full text-base font-semibold flex items-center justify-center sm:h-16 sm:w-42 sm:text-xl";
  const tabLinkStyle = "block min-w-0";
  const tabStyleActive = "bg-primary";
  const tabStyleInactive = "bg-muted-foreground";
  return (
    <div className="bg-accent border-b-2 border-solid">
      {/* Wraps instead of scrolling sideways, so every tab can be reached at 375px. */}
      <div className="flex flex-wrap items-center justify-between p-1 min-w-full">
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

        {/* Navigation tabs: own full-width row below sm, centered from lg up */}
        <nav
          aria-label="Main"
          className="order-last grid w-full grid-cols-2 gap-2 py-2 sm:order-none sm:flex sm:w-auto sm:flex-1 sm:flex-wrap sm:items-center sm:justify-center lg:flex-none"
        >
          {/* <ThemeToggle className="mr-auto" /> */}
          <Link href="/recordsearch" className={tabLinkStyle}>
            <Button
              className={`${sharedTabStyle} ${pathname?.includes("record") ? tabStyleActive : tabStyleInactive}`}
            >
              Record Search
            </Button>
          </Link>
          <Link href="/committees" className={tabLinkStyle}>
            <Button
              className={`${sharedTabStyle} ${pathname?.startsWith("/committees") ? tabStyleActive : tabStyleInactive}`}
            >
              Committee List
            </Button>
          </Link>
          <Link href="/reports" className={tabLinkStyle}>
            <Button
              className={`${sharedTabStyle} ${["/reports", "/committee-reports", "/committee-roster-reports", "/voter-list-reports", "/petitions", "/sign-in-sheet-reports", "/weight-summary-reports", "/vacancy-reports", "/changes-reports", "/petition-outcomes-reports"].some((p) => pathname?.startsWith(p)) ? tabStyleActive : tabStyleInactive}`}
            >
              Reports
            </Button>
          </Link>
          {showDataTab && (
            <Link href="/admin" className={tabLinkStyle}>
              <Button
                className={`${sharedTabStyle} ${pathname?.startsWith("/admin") ? tabStyleActive : tabStyleInactive}`}
              >
                Admin
              </Button>
            </Link>
          )}
        </nav>

        {/* Right spacer - hidden on small screens when content overflows */}
        <div className="hidden lg:flex w-[150px] items-center justify-center">
          <SignInButton />
        </div>

        {/* Sign in button for small screens */}
        <div className="lg:hidden ml-auto flex items-center gap-2 py-2">
          <SignInButton />
        </div>
      </div>
    </div>
  );
};

export default Header;
