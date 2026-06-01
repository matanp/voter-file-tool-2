"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface ReportType {
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  note?: string;
}

const reportTypes: ReportType[] = [
  {
    title: "Committee Roster",
    description: "Generate PDF or XLSX roster for a committee",
    href: "/committee-reports",
    enabled: true,
  },
  {
    title: "Voter List",
    description: "Export voter list from Record Search results",
    href: "/voter-list-reports",
    enabled: true,
    note: "Requires search from Record Search first",
  },
  {
    title: "Designated Petition",
    description: "Generate designated petition forms (PDF)",
    href: "/petitions",
    enabled: true,
  },
  {
    title: "Sign-In Sheet",
    description: "Meeting sign-in sheet by jurisdiction and date",
    href: "/reports/sign-in-sheet",
    enabled: false,
  },
  {
    title: "Designation Weight Summary",
    description: "Weight summary by county or jurisdiction scope",
    href: "/reports/designation-weight",
    enabled: false,
  },
  {
    title: "Vacancy Report",
    description: "Committee vacancies with optional filters",
    href: "/reports/vacancy",
    enabled: false,
  },
  {
    title: "Changes Report",
    description: "Membership changes over a date range",
    href: "/reports/changes",
    enabled: false,
  },
  {
    title: "Petition Outcomes",
    description: "Petition results by term and date range",
    href: "/reports/petition-outcomes",
    enabled: false,
  },
];

export default function GenerateReportGrid() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Generate Report</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {reportTypes.map((report) =>
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
