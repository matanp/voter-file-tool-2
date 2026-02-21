"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { adminSidebarConfig, type AdminNavItem } from "~/config/adminNav";
import { cn } from "~/lib/utils";

function isActive(item: AdminNavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/data";
  }
  return pathname.startsWith(item.href);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {adminSidebarConfig.map((item) =>
        item.enabled ? (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive(item, pathname)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        ) : (
          <span
            key={item.id}
            className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground cursor-not-allowed flex items-center gap-2"
          >
            {item.label}
            <Badge
              variant="outline"
              hoverable={false}
              className="text-[10px] px-1.5 py-0"
            >
              Coming soon
            </Badge>
          </span>
        ),
      )}
    </nav>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <div className="md:hidden fixed bottom-4 left-4 z-40">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Open admin menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>Admin</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-muted/30 p-4">
        <h2 className="text-lg font-semibold mb-4">Admin</h2>
        <SidebarNav />
      </aside>
    </>
  );
}
