"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, use, useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import {
  adminSidebarConfig,
  adminSidebarGroups,
  type AdminNavCountKey,
  type AdminNavCounts,
  type AdminNavItem,
} from "~/config/adminNav";
import { cn } from "~/lib/utils";

function isActive(item: AdminNavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith(item.href);
}

/** " (N)" after an item's label once its count arrives; nothing if it has none. */
function NavItemCount({
  countsPromise,
  countKey,
}: {
  countsPromise: Promise<AdminNavCounts>;
  countKey: AdminNavCountKey;
}) {
  const count = use(countsPromise)[countKey];
  return count === undefined ? null : <> ({count})</>;
}

function SidebarNav({
  countsPromise,
}: {
  countsPromise?: Promise<AdminNavCounts>;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {adminSidebarGroups.map((group, groupIndex) => (
        <div key={group.id} className={cn(groupIndex > 0 && "pt-4 border-t")}>
          <h3 className="px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <div className="flex flex-col gap-1">
            {group.items.map((item) =>
              item.enabled ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(item, pathname)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {item.label}
                  {countsPromise && item.countKey && (
                    <Suspense fallback={null}>
                      <NavItemCount
                        countsPromise={countsPromise}
                        countKey={item.countKey}
                      />
                    </Suspense>
                  )}
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
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * `countsPromise` resolves after the page renders, so the sidebar shows bare
 * labels first and fills in counts without holding up the layout.
 */
export function AdminSidebar({
  countsPromise,
}: {
  countsPromise?: Promise<AdminNavCounts>;
}) {
  const router = useRouter();

  // Eager prefetch all admin routes when sidebar mounts so navigation feels instant.
  // Only /admin routes: router.prefetch() is a full prefetch that Next reuses for
  // up to 5 minutes, so prefetching an outside queue like /committees/requests
  // would run its queries on every visit and could show a stale queue.
  useEffect(() => {
    for (const item of adminSidebarConfig) {
      if (item.enabled && item.href.startsWith("/admin/")) {
        router.prefetch(item.href);
      }
    }
  }, [router]);

  // Desktop only. On phones, the app bar's menu lists the Admin sections.
  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Admin</h2>
      <SidebarNav countsPromise={countsPromise} />
    </aside>
  );
}
