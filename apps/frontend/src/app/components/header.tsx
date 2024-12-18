"use client";
import { PrivilegeLevel } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { SignInButton } from "~/components/ui/signInButton";
import { hasPermissionFor } from "~/lib/utils";

const Header: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const showDataTab = hasPermissionFor(
    session?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess,
    PrivilegeLevel.Developer,
  );

  const sharedTabStyle =
    "h-16 text-xl font-semibold w-42 flex items-center justify-center";
  const tabStyleActive = "bg-primary";
  const tabStyleInactive = "bg-muted-foreground";
  return (
    <div className="grid grid-cols-header border-bottom p-1 border-2 border-solid bg-accent">
      <div></div>
      <div className="flex-gap flex items-center justify-center gap-2 py-2">
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
            className={`${sharedTabStyle} ${pathname?.endsWith("committees") ? tabStyleActive : tabStyleInactive}`}
          >
            Committee List
          </Button>
        </Link>
        <Link href="/reports">
          <Button
            className={`${sharedTabStyle} ${pathname?.endsWith("reports") ? tabStyleActive : tabStyleInactive}`}
          >
            Reports
          </Button>
        </Link>
        {showDataTab && (
          <Link href="/admin/data">
            <Button
              className={`${sharedTabStyle} ${pathname?.endsWith("admin/data") ? tabStyleActive : tabStyleInactive}`}
            >
              Data
            </Button>
          </Link>
        )}
      </div>
      <div className="flex-gap flex items-center justify-center gap-2 py-2">
        <SignInButton />
      </div>
    </div>
  );
};

export default Header;
