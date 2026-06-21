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

interface ReportType {
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  note?: string;
  // Minimum privilege the report page enforces. Cards the user cannot access are
  // hidden entirely rather than shown as a dead-end link.
  minPrivilege?: PrivilegeLevel;
}

const baseReportTypes: ReportType[] = [
  {
    title: "Committee Roster",
    description:
      "Generate current committee roster reports (jurisdiction-scoped for leaders).",
    href: "/committee-roster-reports",
    enabled: true,
    minPrivilege: PrivilegeLevel.Leader,
  },
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
  {
    title: "Sign-In Sheet",
    description:
      "Generate sign-in sheets for committee meetings with member names and signature lines.",
    href: "/sign-in-sheet-reports",
    enabled: true,
    minPrivilege: PrivilegeLevel.Leader,
  },
  {
    title: "Designation Weight Summary",
    description:
      "Committee-by-committee breakdown of seat weights, occupancy, and total designation weight.",
    href: "/weight-summary-reports",
    enabled: true,
    minPrivilege: PrivilegeLevel.Leader,
  },
  {
    title: "Vacancy Report",
    description: "Committee vacancies with optional filters",
    href: "/vacancy-reports",
    enabled: true,
    minPrivilege: PrivilegeLevel.Leader,
  },
  {
    title: "Changes Report",
    description: "Membership changes over a date range",
    href: "/changes-reports",
    enabled: true,
    minPrivilege: PrivilegeLevel.Leader,
  },
  {
    title: "Petition Outcomes",
    description: "Petition results by committee and seat",
    href: "/petition-outcomes-reports",
    enabled: true,
    minPrivilege: PrivilegeLevel.Leader,
  },
];

export default function GenerateReportGrid() {
  const { actingPermissions } = useContext(GlobalContext);

  const isAdminUser = hasPermissionFor(
    actingPermissions,
    PrivilegeLevel.Admin,
  );

  const reportTypes: ReportType[] = [
    ...baseReportTypes,
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

  // Hide report types the user cannot access; the remaining cards branch on
  // `enabled` so a not-yet-built report can still show as a "Coming soon" teaser.
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
                  <Badge variant="outline" hoverable={false} className="text-[10px] px-1.5 py-0">
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
