import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { findActiveTerm } from "~/app/api/lib/committeeValidation";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { EligibilityFlagsTable } from "./EligibilityFlagsTable";

export default async function EligibilityFlagsPage() {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  const activeTerm = await findActiveTerm();

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Eligibility Flags</h1>
        <p className="text-muted-foreground">
          Review BOE-driven eligibility discrepancies and confirm or dismiss each
          flag.
        </p>
      </div>
      <EligibilityFlagsTable
        activeTermId={activeTerm?.id}
        activeTermLabel={activeTerm?.label}
      />
    </div>
  );
}
