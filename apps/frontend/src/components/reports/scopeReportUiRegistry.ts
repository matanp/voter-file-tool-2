import { PrivilegeLevel } from "@prisma/client";
import type { ScopeReportType } from "@voter-file-tool/shared-validators";

export interface ScopeReportUiDefinition {
  title: string;
  gridTitle: string;
  href: string;
  pageDescription: string;
  gridDescription: string;
  /** Display/filter only — not used for page authorization. */
  minPrivilege: PrivilegeLevel;
  defaultNamePrefix: string;
}

export const SCOPE_REPORT_UI: Record<ScopeReportType, ScopeReportUiDefinition> = {
  committeeRoster: {
    title: "Committee Roster Reports",
    gridTitle: "Committee Roster",
    href: "/committee-roster-reports",
    pageDescription:
      "Generate a current committee roster for your jurisdiction (leaders) or countywide/jurisdiction scope (admins).",
    gridDescription:
      "Generate current committee roster reports (jurisdiction-scoped for leaders).",
    minPrivilege: PrivilegeLevel.Leader,
    defaultNamePrefix: "Committee Roster",
  },
  signInSheet: {
    title: "Sign-In Sheet Reports",
    gridTitle: "Sign-In Sheet",
    href: "/sign-in-sheet-reports",
    pageDescription:
      "Generate sign-in sheets for committee meetings with member names and signature lines.",
    gridDescription:
      "Generate sign-in sheets for committee meetings with member names and signature lines.",
    minPrivilege: PrivilegeLevel.Leader,
    defaultNamePrefix: "Sign-In Sheet",
  },
  designationWeightSummary: {
    title: "Designation Weight Summary Reports",
    gridTitle: "Designation Weight Summary",
    href: "/weight-summary-reports",
    pageDescription:
      "Committee-by-committee breakdown of seat weights, occupancy, and total designation weight.",
    gridDescription:
      "Committee-by-committee breakdown of seat weights, occupancy, and total designation weight.",
    minPrivilege: PrivilegeLevel.Leader,
    defaultNamePrefix: "Weight Summary",
  },
  vacancyReport: {
    title: "Vacancy Report",
    gridTitle: "Vacancy Report",
    href: "/vacancy-reports",
    pageDescription:
      "Committee vacancies with seat counts and petitioned status.",
    gridDescription: "Committee vacancies with optional filters",
    minPrivilege: PrivilegeLevel.Leader,
    defaultNamePrefix: "Vacancy Report",
  },
  changesReport: {
    title: "Changes Report",
    gridTitle: "Changes Report",
    href: "/changes-reports",
    pageDescription:
      "Membership changes over a date range — additions, resignations, removals, and petition outcomes.",
    gridDescription: "Membership changes over a date range",
    minPrivilege: PrivilegeLevel.Leader,
    defaultNamePrefix: "Changes Report",
  },
  petitionOutcomesReport: {
    title: "Petition Outcomes Report",
    gridTitle: "Petition Outcomes",
    href: "/petition-outcomes-reports",
    pageDescription:
      "Petition results by committee and seat — winners, unopposed, and outcomes.",
    gridDescription: "Petition results by committee and seat",
    minPrivilege: PrivilegeLevel.Leader,
    defaultNamePrefix: "Petition Outcomes",
  },
};

export const SCOPE_REPORT_UI_ORDER: ScopeReportType[] = [
  "committeeRoster",
  "signInSheet",
  "designationWeightSummary",
  "vacancyReport",
  "changesReport",
  "petitionOutcomesReport",
];
