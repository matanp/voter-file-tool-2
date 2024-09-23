"use client";

import { type VoterRecord } from "@prisma/client";
import * as React from "react";

type VoterRecordsContextType = {
  voterRecords: VoterRecord[];
  setVoterRecords: (voterRecords: VoterRecord[]) => void;
};

export const VoterRecordsContext = React.createContext<VoterRecordsContextType>(
  {
    voterRecords: [],
    setVoterRecords: () => {
      throw new Error("Function not implemented.");
    },
  },
);

export function VoterRecordsContextProvider({
  children,
}: React.PropsWithChildren) {
  const [voterRecords, setVoterRecords] = React.useState<VoterRecord[]>([]);

  return (
    <VoterRecordsContext.Provider value={{ voterRecords, setVoterRecords }}>
      {children}
    </VoterRecordsContext.Provider>
  );
}
