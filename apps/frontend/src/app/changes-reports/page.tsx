import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { ScopedReportPageShell } from "~/components/reports/ScopedReportPageShell";

const ChangesReportsPage = async () => {
  const pageData = await loadScopedReportPageData();
  return <ScopedReportPageShell type="changesReport" pageData={pageData} />;
};

export default ChangesReportsPage;
