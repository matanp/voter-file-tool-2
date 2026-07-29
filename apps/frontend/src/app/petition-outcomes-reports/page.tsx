import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { ScopedReportPageShell } from "~/components/reports/ScopedReportPageShell";

const PetitionOutcomesReportsPage = async () => {
  const pageData = await loadScopedReportPageData();
  return (
    <ScopedReportPageShell type="petitionOutcomesReport" pageData={pageData} />
  );
};

export default PetitionOutcomesReportsPage;
