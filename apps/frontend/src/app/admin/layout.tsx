import { PrivilegeLevel } from "@prisma/client";
import AuthCheck from "~/components/ui/authcheck";
import { AdminSidebar } from "./AdminSidebar";
import { getAdminNavCounts } from "./adminNavCounts";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Not awaited: the counts stream in after the page instead of delaying it.
  // A failed count leaves bare labels rather than an error page.
  const countsPromise = getAdminNavCounts().catch((error: unknown) => {
    console.error("Failed to load Admin sidebar counts:", error);
    return {};
  });

  return (
    <AuthCheck privilegeLevel={PrivilegeLevel.Admin}>
      <div className="flex min-h-[calc(100vh-4.5rem)]">
        <AdminSidebar countsPromise={countsPromise} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </AuthCheck>
  );
}
