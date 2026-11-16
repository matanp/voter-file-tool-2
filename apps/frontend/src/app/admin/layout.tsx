import { PrivilegeLevel } from "@prisma/client";
import AuthCheck from "~/components/ui/authcheck";
import { AdminSidebar } from "./AdminSidebar";
import { getAdminNavCounts } from "./adminNavCounts";

// The sidebar's counts must be read per request, not at build time.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await getAdminNavCounts();

  return (
    <AuthCheck privilegeLevel={PrivilegeLevel.Admin}>
      <div className="flex min-h-[calc(100vh-4.5rem)]">
        <AdminSidebar counts={counts} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </AuthCheck>
  );
}
