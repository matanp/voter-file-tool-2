"use client";

import React from "react";
import { ElectionDates } from "../dashboard/ElectionDates";
import { ElectionOffices } from "../dashboard/ElectionOffices";
import type { ElectionDate, OfficeName } from "@prisma/client";

interface ElectionConfigTabProps {
  electionDates: ElectionDate[];
  officeNames: OfficeName[];
}

export const ElectionConfigTab = ({
  electionDates,
  officeNames,
}: ElectionConfigTabProps) => {
  return (
    <div className="space-y-8">
      <ElectionDates electionDates={electionDates} />
      <ElectionOffices officeNames={officeNames} />
    </div>
  );
};
