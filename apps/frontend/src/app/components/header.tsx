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
    <div className="overflow-x-auto bg-accent border-b-2 border-solid">
      <div className="flex items-center justify-between p-1 min-w-full">
        {/* Left spacer - hidden on small screens when content overflows */}
        <div className="hidden lg:block w-[150px]"></div>

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
              className={`${sharedTabStyle} ${pathname?.endsWith("committees") ? tabStyleActive : tabStyleInactive}`}
            >
              Committee List
            </Button>
          </Link>
          <Link href="/petitions">
            <Button
              className={`${sharedTabStyle} ${pathname?.endsWith("petitions") ? tabStyleActive : tabStyleInactive}`}
            >
              Petitions
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
            <Link href="admin/data">
              <Button
                className={`${sharedTabStyle} ${pathname?.endsWith("admin/data") ? tabStyleActive : tabStyleInactive}`}
              >
                Data
              </Button>
            </Link>
          )}
        </div>

        {/* Right spacer - hidden on small screens when content overflows */}
        <div className="hidden lg:block w-[150px] flex items-center justify-center">
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
