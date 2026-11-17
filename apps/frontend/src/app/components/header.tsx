"use client";
import { PrivilegeLevel } from "@prisma/client";
import { useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "~/components/ui/button";
import { SignInButton } from "~/components/ui/signInButton";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { cn, hasPermissionFor } from "~/lib/utils";
import { GlobalContext } from "~/components/providers/GlobalContext";

type HeaderProps = {
  /** Rendered in the top-left slot; the layout passes the DB badge here. */
  dbBadge?: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const REPORT_PATH_PREFIXES = [
  "/reports",
  "/committee-reports",
  "/committee-roster-reports",
  "/voter-list-reports",
  "/petitions",
  "/sign-in-sheet-reports",
  "/weight-summary-reports",
  "/vacancy-reports",
  "/changes-reports",
  "/petition-outcomes-reports",
];

const NAV_ITEMS: NavItem[] = [
  {
    href: "/recordsearch",
    label: "Record Search",
    isActive: (p) => p.includes("record"),
  },
  {
    href: "/committees",
    label: "Committee List",
    isActive: (p) => p.startsWith("/committees"),
  },
  {
    href: "/reports",
    label: "Reports",
    isActive: (p) =>
      REPORT_PATH_PREFIXES.some((prefix) => p.startsWith(prefix)),
  },
];

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  isActive: (p) => p.startsWith("/admin"),
};

const Header: React.FC<HeaderProps> = ({ dbBadge }) => {
  const pathname = usePathname() ?? "";
  const { actingPermissions } = useContext(GlobalContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const showAdminTab = hasPermissionFor(
    actingPermissions,
    PrivilegeLevel.Admin,
  );
  const navItems = showAdminTab ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
  const activeItem = navItems.find((item) => item.isActive(pathname));

  // From md: one row of compact tabs sized to their text; from lg: the original fixed-size tabs.
  const tabStyle =
    "h-12 px-3 text-base font-semibold lg:h-16 lg:w-42 lg:px-4 lg:text-xl";

  return (
    <div className="bg-accent border-b-2 border-solid">
      <div className="flex items-center gap-2 p-1">
        {/* Left slot: DB badge in dev; an empty spacer from lg up in prod, so the tabs stay centered */}
        <div
          className={
            dbBadge
              ? "flex shrink-0 items-center px-2 lg:w-[150px]"
              : "hidden lg:block lg:w-[150px]"
          }
        >
          {dbBadge}
        </div>

        {/* Below md: pushes sign-in and the hamburger to the right */}
        <div className="flex-1 md:hidden" />

        {/* From md: one row of tabs */}
        <nav
          aria-label="Main"
          className="hidden md:flex md:flex-1 md:items-center md:justify-center md:gap-2 md:py-2"
        >
          {navItems.map((item) => {
            const active = item === activeItem;
            return (
              <Button
                key={item.href}
                asChild
                className={cn(
                  tabStyle,
                  active ? "bg-primary" : "bg-muted-foreground",
                )}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 py-2 pr-1 lg:w-[150px] lg:justify-center lg:pr-0">
          <SignInButton />

          {/* Below md: hamburger that drops a vertical menu down from the top */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="p-0 md:hidden">
              <div className="border-b px-4 py-4 pr-12">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Go to another page
                </SheetDescription>
              </div>
              <nav aria-label="Main" className="flex flex-col p-2">
                {navItems.map((item) => {
                  const active = item === activeItem;
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center rounded-md px-4 text-lg font-semibold",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};

export default Header;
