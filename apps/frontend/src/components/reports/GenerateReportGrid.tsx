"use client";

import Link from "next/link";
import { useContext } from "react";
import { PrivilegeLevel } from "@prisma/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { hasPermissionFor } from "~/lib/utils";
import { GlobalContext } from "~/components/providers/GlobalContext";
import {
  SCOPE_REPORT_UI,
  SCOPE_REPORT_UI_ORDER,
} from "~/components/reports/scopeReportUiRegistry";

interface ReportType {
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  note?: string;
  minPrivilege?: PrivilegeLevel;
}

const NON_SCOPE_REPORT_TYPES: ReportType[] = [
  {
    title: "Voter List",
    description: "Export voter list from Record Search results",
    href: "/voter-list-reports",
    enabled: true,
    note: "Requires search from Record Search first",
    minPrivilege: PrivilegeLevel.Admin,
  },
  {
    title: "Designated Petition",
    description: "Generate designated petition forms (PDF)",
    href: "/petitions",
    enabled: true,
  },
];

const scopedReportTypes: ReportType[] = SCOPE_REPORT_UI_ORDER.map((type) => {
  const ui = SCOPE_REPORT_UI[type];
  return {
    title: ui.gridTitle,
    description: ui.gridDescription,
    href: ui.href,
    enabled: true,
    minPrivilege: ui.minPrivilege,
  };
});

export default function GenerateReportGrid() {
  const { actingPermissions } = useContext(GlobalContext);

  const isAdminUser = hasPermissionFor(
    actingPermissions,
    PrivilegeLevel.Admin,
  );

  const reportTypes: ReportType[] = [
    ...scopedReportTypes,
    ...NON_SCOPE_REPORT_TYPES,
    ...(isAdminUser
      ? [
          {
            title: "Committee Report (Advanced)",
            description:
              "Admin-only legacy committee report with field and column configuration.",
            href: "/committee-reports",
            enabled: true,
          },
        ]
      : []),
  ];

  const visibleReportTypes = reportTypes.filter(
    (report) =>
      !report.minPrivilege ||
      hasPermissionFor(actingPermissions, report.minPrivilege),
  );

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Generate Report</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visibleReportTypes.map((report) =>
          report.enabled ? (
            <Link key={report.title} href={report.href}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {report.description}
                    {report.note && (
                      <span className="block mt-1 text-xs italic">
                        {report.note}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : (
            <Card
              key={report.title}
              className="h-full opacity-60 cursor-not-allowed"
            >
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {report.title}
                  <Badge
                    variant="outline"
                    hoverable={false}
                    className="text-[10px] px-1.5 py-0"
                  >
                    Coming soon
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {report.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
