import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { GovernanceConfigClient } from "./GovernanceConfigClient";

export default async function GovernanceConfigPage() {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Governance Config</h1>
        <p className="text-muted-foreground">
          Manage committee-governance rules used by eligibility and capacity
          checks.
        </p>
      </div>
      <GovernanceConfigClient />
    </div>
  );
}
