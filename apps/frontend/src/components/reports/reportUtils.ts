import { type ReportType } from "@prisma/client";

export const formatReportType = (reportType: ReportType) => {
  return reportType.replace(/([A-Z])/g, " $1").trim();
};
