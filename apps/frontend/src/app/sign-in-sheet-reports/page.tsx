import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { ScopedReportPageShell } from "~/components/reports/ScopedReportPageShell";

const SignInSheetReportsPage = async () => {
  const pageData = await loadScopedReportPageData();
  return <ScopedReportPageShell type="signInSheet" pageData={pageData} />;
};

export default SignInSheetReportsPage;
