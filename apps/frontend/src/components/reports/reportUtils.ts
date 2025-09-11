import { type ReportType } from "@voter-file-tool/shared-prisma";

export const formatReportType = (reportType: ReportType) => {
  return reportType.replace(/([A-Z])/g, " $1").trim();
};
