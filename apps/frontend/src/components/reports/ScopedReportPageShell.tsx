import React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { PageContainer } from "~/components/layout/PageContainer";
import { PageHeader } from "~/components/layout/PageHeader";
import { ScopedReportForm } from "~/components/reports/ScopedReportForm";
import {
  SCOPE_REPORT_UI,
  type ScopeReportUiDefinition,
} from "~/components/reports/scopeReportUiRegistry";
import type { ScopeReportType } from "@voter-file-tool/shared-validators";
import type { ScopedReportPageData } from "~/lib/loadScopedReportPageData";

interface ScopedReportPageShellProps {
  type: ScopeReportType;
  pageData: ScopedReportPageData;
}

export function ScopedReportPageShell({
  type,
  pageData,
}: ScopedReportPageShellProps) {
  const ui: ScopeReportUiDefinition = SCOPE_REPORT_UI[type];

  if (!pageData.isLeaderOrAbove) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardContent className="pt-6">
            <p>You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={ui.title} description={ui.pageDescription} />
      <ScopedReportForm
        type={type}
        committeeLists={pageData.committeeLists}
        userPrivilegeLevel={pageData.privilegeLevel}
      />
    </PageContainer>
  );
}
