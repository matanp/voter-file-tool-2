"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  buildAdminDataTabs,
  getAdminDataDefaultTab,
  getVisibleAdminDataTabs,
} from "./adminDataTabs";
import type { ElectionDate, OfficeName } from "@prisma/client";

interface AdminDataClientProps {
  electionDates: ElectionDate[];
  officeNames: OfficeName[];
}

export const AdminDataClient = ({
  electionDates,
  officeNames,
}: AdminDataClientProps) => {
  const tabs = buildAdminDataTabs();
  const visibleTabs = getVisibleAdminDataTabs(tabs);
  const ctx = { electionDates, officeNames };

  return (
    <div className="w-full m-4 h-full">
      <Tabs defaultValue={getAdminDataDefaultTab(tabs)} className="w-full">
        <TabsList
          className="grid w-full overflow-x-auto"
          style={{
            gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {visibleTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {tab.render(ctx)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
