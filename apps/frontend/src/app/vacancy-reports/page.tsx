import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { ScopedReportPageShell } from "~/components/reports/ScopedReportPageShell";

const VacancyReportsPage = async () => {
  const pageData = await loadScopedReportPageData();
  return <ScopedReportPageShell type="vacancyReport" pageData={pageData} />;
};

export default VacancyReportsPage;
