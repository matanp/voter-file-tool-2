import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { ScopedReportPageShell } from "~/components/reports/ScopedReportPageShell";

const WeightSummaryReportsPage = async () => {
  const pageData = await loadScopedReportPageData();
  return (
    <ScopedReportPageShell type="designationWeightSummary" pageData={pageData} />
  );
};

export default WeightSummaryReportsPage;
