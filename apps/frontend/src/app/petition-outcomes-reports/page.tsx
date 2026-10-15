import { PrivilegeLevel } from "@prisma/client";
import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { ScopedReportPageShell } from "~/components/reports/ScopedReportPageShell";

const PetitionOutcomesReportsPage = async () => {
  // Petition results are Admin-only (leader-petition-visibility/01).
  const pageData = await loadScopedReportPageData({
    minPagePrivilege: PrivilegeLevel.Admin,
  });
  return (
    <ScopedReportPageShell type="petitionOutcomesReport" pageData={pageData} />
  );
};

export default PetitionOutcomesReportsPage;
