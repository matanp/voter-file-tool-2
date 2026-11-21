import { type ReportType } from "@prisma/client";

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  CommitteeReport: "Committee Roster",
  DesignatedPetition: "Designated Petition",
  VoterList: "Voter List",
  AbsenteeReport: "Absentee Report",
  VoterImport: "Voter Import",
  SignInSheet: "Sign-In Sheet",
  DesignationWeightSummary: "Designation Weight Summary",
  VacancyReport: "Vacancy Report",
  ChangesReport: "Changes Report",
  PetitionOutcomesReport: "Petition Outcomes Report",
};

/** The user-facing name of a report type (matches the Generate Report cards). */
export const formatReportType = (reportType: ReportType) =>
  REPORT_TYPE_LABELS[reportType];
