"use client";

import React from "react";
import { CommitteeUploadDiscrepancies } from "./CommitteeUploadDiscrepancies";
import { VoterImport } from "./VoterImport";
import { WeightedTableImport } from "./WeightedTableImport";
import { LtedCrosswalkTab } from "./LtedCrosswalkTab";
import { AbsenteeReport } from "./AbsenteeReport";
import { ElectionConfigTab } from "./ElectionConfigTab";
import type { ElectionDate, OfficeName } from "@prisma/client";

export type AdminDataTabContext = {
  electionDates: ElectionDate[];
  officeNames: OfficeName[];
};

export type AdminDataTabDef = {
  id: string;
  label: string;
  enabled?: boolean;
  render: (ctx: AdminDataTabContext) => React.ReactNode;
};

/** Builds the admin data tab registry with co-located render functions. */
export function buildAdminDataTabs(): AdminDataTabDef[] {
  return [
    {
      id: "election-config",
      label: "Election Config",
      render: (ctx) => (
        <ElectionConfigTab
          electionDates={ctx.electionDates}
          officeNames={ctx.officeNames}
        />
      ),
    },
    {
      id: "voter-import",
      label: "Voter Import",
      render: () => <VoterImport />,
    },
    {
      id: "weighted-table",
      label: "Weighted Table",
      render: () => <WeightedTableImport />,
    },
    {
      id: "lted-crosswalk",
      label: "LTED Crosswalk",
      render: () => <LtedCrosswalkTab />,
    },
    {
      id: "discrepancies",
      label: "Discrepancies",
      render: () => <CommitteeUploadDiscrepancies />,
    },
    {
      id: "absentee-report",
      label: "Absentee Report",
      render: () => <AbsenteeReport />,
    },
  ];
}

/** Returns tabs that are not explicitly disabled. */
export function getVisibleAdminDataTabs(tabs: AdminDataTabDef[]): AdminDataTabDef[] {
  return tabs.filter((tab) => tab.enabled !== false);
}

/** Returns the default tab id from the first visible tab. */
export function getAdminDataDefaultTab(tabs: AdminDataTabDef[]): string {
  return getVisibleAdminDataTabs(tabs)[0]?.id ?? tabs[0]!.id;
}
