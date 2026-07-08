import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { AuditTrailClient } from "./AuditTrailClient";

export default async function AuditTrailPage() {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Trail</h1>
        <p className="text-muted-foreground">
          View and export a filterable log of system changes (memberships, meetings, reports, and more).
        </p>
      </div>
      <AuditTrailClient />
    </div>
  );
}
