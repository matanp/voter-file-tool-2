import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { ScopedReportPageShell } from "~/components/reports/ScopedReportPageShell";

const CommitteeRosterReportsPage = async () => {
  const pageData = await loadScopedReportPageData();
  return <ScopedReportPageShell type="committeeRoster" pageData={pageData} />;
};

export default CommitteeRosterReportsPage;
