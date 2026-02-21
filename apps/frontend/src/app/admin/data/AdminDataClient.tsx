"use client";

import React from "react";
import { CommitteeUploadDiscrepancies } from "./CommitteeUploadDiscrepancies";
import { InviteManagement } from "./InviteManagement";
import { VoterImport } from "./VoterImport";
import { WeightedTableImport } from "./WeightedTableImport";
import { LtedCrosswalkTab } from "./LtedCrosswalkTab";
import { AbsenteeReport } from "./AbsenteeReport";
import { ElectionConfigTab } from "./ElectionConfigTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { ElectionDate, OfficeName } from "@prisma/client";

interface AdminDataClientProps {
  electionDates: ElectionDate[];
  officeNames: OfficeName[];
}

export const AdminDataClient = ({
  electionDates,
  officeNames,
}: AdminDataClientProps) => {
  return (
    <div className="w-full m-4 h-full">
      <Tabs defaultValue="invites" className="w-full">
        <TabsList className="grid w-full grid-cols-7 overflow-x-auto">
          <TabsTrigger value="invites">Invites</TabsTrigger>
          <TabsTrigger value="election-config">Election Config</TabsTrigger>
          <TabsTrigger value="voter-import">Voter Import</TabsTrigger>
          <TabsTrigger value="weighted-table">Weighted Table</TabsTrigger>
          <TabsTrigger value="lted-crosswalk">LTED Crosswalk</TabsTrigger>
          <TabsTrigger value="discrepancies">Discrepancies</TabsTrigger>
          <TabsTrigger value="absentee-report">Absentee Report</TabsTrigger>
        </TabsList>
        <TabsContent value="invites">
          <InviteManagement />
        </TabsContent>
        <TabsContent value="election-config">
          <ElectionConfigTab
            electionDates={electionDates}
            officeNames={officeNames}
          />
        </TabsContent>
        <TabsContent value="voter-import">
          <VoterImport />
        </TabsContent>
        <TabsContent value="weighted-table">
          <WeightedTableImport />
        </TabsContent>
        <TabsContent value="lted-crosswalk">
          <LtedCrosswalkTab />
        </TabsContent>
        <TabsContent value="discrepancies">
          <CommitteeUploadDiscrepancies />
        </TabsContent>
        <TabsContent value="absentee-report">
          <AbsenteeReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};
