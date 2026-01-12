// Types for voter import processing

import type { Prisma } from "@prisma/client";

/**
 * Result statistics from parsing a voter file
 */
export interface ParseResult {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  dropdownsUpdated: boolean;
}

/**
 * VoterRecordArchive with all fields as strings (pre-processing)
 */
export type VoterRecordArchiveStrings = {
  [K in keyof Prisma.VoterRecordArchiveCreateManyInput]: string | null;
};

/**
 * Example voter record used for CSV parsing headers
 */
export interface ExampleVoterRecord {
  VRCNUM: string;
  lastName: string;
  firstName: string;
  middleInitial: string;
  suffixName: string;
  houseNum: string;
  street: string;
  apartment: string;
  halfAddress: string;
  resAddrLine2: string;
  resAddrLine3: string;
  city: string;
  state: string;
  zipCode: string;
  zipSuffix: string;
  telephone: string;
  email: string;
  mailingAddress1: string;
  mailingAddress2: string;
  mailingAddress3: string;
  mailingAddress4: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  mailingZipSuffix: string;
  party: string;
  gender: string;
  DOB: string;
  L_T: string;
  electionDistrict: string;
  countyLegDistrict: string;
  stateAssmblyDistrict: string;
  stateSenateDistrict: string;
  congressionalDistrict: string;
  CC_WD_Village: string;
  townCode: string;
  lastUpdate: string;
  originalRegDate: string;
  statevid: string;
}
