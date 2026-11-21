"use client";
import { PrivilegeLevel } from "@prisma/client";
import { useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button } from "~/components/ui/button";
import { SignInButton } from "~/components/ui/signInButton";
import {
  ProfileSheet,
  ViewProfileTrigger,
} from "~/components/ui/manageProfile";
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
import { adminSidebarGroups } from "~/config/adminNav";
import { PRODUCT_NAME } from "~/lib/branding";

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
    label: "Voters",
    isActive: (p) => p.startsWith("/recordsearch"),
  },
  {
    href: "/committees",
    label: "Committees",
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

const MENU_ROW_STYLE =
  "flex min-h-11 w-full items-center rounded-md px-3 text-left text-base font-medium";
const MENU_ROW_INACTIVE =
  "text-muted-foreground hover:bg-muted hover:text-foreground";

/**
 * The main nav: quiet text links with an underline on the active one (from md), or the phone
 * menu's full-width rows, which close the menu when picked.
 */
const MainNav: React.FC<{
  items: NavItem[];
  activeItem: NavItem | undefined;
  variant: "bar" | "menu";
  className?: string;
}> = ({ items, activeItem, variant, className }) => (
  <nav aria-label="Main" className={className}>
    {items.map((item) => {
      const active = item === activeItem;
      const link = (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={
            variant === "menu"
              ? cn(
                  MENU_ROW_STYLE,
                  active ? "bg-muted text-foreground" : MENU_ROW_INACTIVE,
                )
              : cn(
                  "flex h-12 items-center border-b-2 px-1 text-sm font-medium transition-colors",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
          }
        >
          {item.label}
        </Link>
      );
      return variant === "bar" ? (
        link
      ) : (
        <SheetClose asChild key={item.href}>
          {link}
        </SheetClose>
      );
    })}
  </nav>
);

/** The Admin section links, for the phone menu (the Admin sidebar is desktop-only). */
const AdminMenuLinks: React.FC<{ pathname: string }> = ({ pathname }) => (
  <nav aria-label="Admin" className="border-t p-2">
    {adminSidebarGroups.map((group) => (
      <div key={group.id} className="pb-1">
        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {group.label}
        </p>
        {group.items
          .filter((item) => item.enabled)
          .map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <SheetClose asChild key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    MENU_ROW_STYLE,
                    active ? "bg-muted text-foreground" : MENU_ROW_INACTIVE,
                  )}
                >
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
      </div>
    ))}
  </nav>
);

function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : "";
  return (first + last).toUpperCase();
}

const Header: React.FC<HeaderProps> = ({ dbBadge }) => {
  const pathname = usePathname() ?? "";
  const { actingPermissions } = useContext(GlobalContext);
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const showAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const navItems = showAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
  const activeItem = navItems.find((item) => item.isActive(pathname));

  return (
    // h-12 must match --app-bar-height in globals.css.
    <div className="h-12 border-b bg-white">
      <div className="flex h-full items-center gap-6 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground"
        >
          <span
            aria-hidden="true"
            className="grid h-6 w-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground"
          >
            OS
          </span>
          {PRODUCT_NAME}
        </Link>

        <MainNav
          items={navItems}
          activeItem={activeItem}
          variant="bar"
          className="hidden h-full md:flex md:items-center md:gap-5"
        />

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {dbBadge && <span className="hidden md:inline-flex">{dbBadge}</span>}
          {session ? (
            <ProfileSheet
              session={session}
              open={profileOpen}
              onOpenChange={setProfileOpen}
              trigger={
                <ViewProfileTrigger
                  aria-label="Profile"
                  title={session.user?.name ?? "Profile"}
                  className="grid h-11 w-11 place-items-center rounded-full bg-transparent p-0 text-foreground hover:bg-transparent hover:!shadow-none"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold hover:bg-slate-200">
                    {initials(session.user?.name)}
                  </span>
                </ViewProfileTrigger>
              }
            />
          ) : (
            <SignInButton />
          )}

          {/* Below md: one menu for the main nav and, for Admins, the Admin sections. */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="top"
              className="max-h-[100dvh] overflow-y-auto p-0 md:hidden"
            >
              <div className="flex items-center gap-2 border-b px-4 py-3 pr-12">
                <SheetTitle className="text-sm">Menu</SheetTitle>
                {dbBadge}
                <SheetDescription className="sr-only">
                  Go to another page
                </SheetDescription>
              </div>
              <MainNav
                items={navItems}
                activeItem={activeItem}
                variant="menu"
                className="flex flex-col p-2"
              />
              {showAdmin && <AdminMenuLinks pathname={pathname} />}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};

export default Header;
