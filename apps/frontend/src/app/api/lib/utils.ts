import type {
  CommitteeList,
  Prisma,
  VoterRecord,
  VoterRecordArchive,
} from "@prisma/client";
import { searchQueryFieldSchema } from "@voter-file-tool/shared-validators";
import type { RosterClaimedVoter } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
import { z } from "zod";
import {
  dropdownItems,
  type DropdownItem,
  isDropdownItem,
} from "~/lib/dropdownItems";
import { getAddress, getName } from "~/lib/voterRecordFormatters";
import prisma from "~/lib/prisma";

export { dropdownItems, type DropdownItem, isDropdownItem };
export { getAddress, getName };

export function isRecordNewer(
  recordArchive: Prisma.VoterRecordArchiveCreateManyInput,
  voterRecord: VoterRecord,
): boolean {
  if (recordArchive.recordEntryYear > voterRecord.latestRecordEntryYear) {
    return true;
  }

  if (
    recordArchive.recordEntryYear === voterRecord.latestRecordEntryYear &&
    recordArchive.recordEntryNumber > voterRecord.latestRecordEntryNumber
  ) {
    return true;
  }

  return false;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export async function voterHasDiscrepancy(VRCNUM: string): Promise<boolean> {
  const recordArchives = await prisma.voterRecordArchive.findMany({
    where: {
      VRCNUM,
    },
  });

  const firstRecord = recordArchives[0];

  if (!firstRecord) {
    return false;
  }

  for (const recordArchive of recordArchives) {
    const ignoreFields = ["id", "recordEntryYear", "recordEntryNumber"];
    for (const field of Object.keys(
      recordArchive,
    ) as (keyof VoterRecordArchive)[]) {
      if (ignoreFields.includes(field)) continue;
      const previousValue = firstRecord[field];
      const compareValue = recordArchive[field];
      if (isDate(compareValue) && isDate(previousValue)) {
        if (compareValue.getTime() !== previousValue.getTime()) {
          return true;
        }
      } else if (recordArchive[field] !== firstRecord[field]) {
        return true;
      }
    }
  }

  return false;
}

/**
 * The voter attributes an import compares against the voter file. `claimedField` names the
 * canonical roster entry's field; `discrepancyKey` is the key stored on the discrepancy
 * record, kept as it is so discrepancy resolution and its audit metadata are unaffected.
 *
 * Source-file column names do not appear here: a parser has already mapped them.
 */
const DISCREPENCY_FIELDS = [
  { claimedField: "name", discrepancyKey: "name", existingField: getName },
  {
    claimedField: "address1",
    discrepancyKey: "res address1",
    existingField: getAddress,
  },
  { claimedField: "city", discrepancyKey: "res city", existingField: "city" },
  { claimedField: "state", discrepancyKey: "res state", existingField: "state" },
  { claimedField: "zip", discrepancyKey: "res zip", existingField: "zipCode" },
] as const;

export type Discrepancy = Record<
  string,
  { incoming: string; existing: string; fullRow?: Record<string, string> }
>;

export type DiscrepanciesAndCommittee = {
  discrepancies: Discrepancy;
  committee: CommitteeList;
};

/**
 * Compares what the source file claims about a person against the voter file, field by
 * named field. Runs of whitespace are collapsed on the claimed value before comparing.
 */
export function findDiscrepancies(
  claimed: RosterClaimedVoter,
  existingRecord: VoterRecord,
): Discrepancy {
  const discrepancies: Discrepancy = {};
  for (const field of DISCREPENCY_FIELDS) {
    const claimedValue = claimed[field.claimedField]
      ?.split(" ")
      .filter((part) => part !== "")
      .join(" ");
    const existingValue =
      typeof field.existingField === "string"
        ? existingRecord[field.existingField]
        : field.existingField(existingRecord);
    if (claimedValue !== existingValue) {
      discrepancies[field.discrepancyKey] = {
        incoming: claimedValue ?? "",
        existing: existingValue ?? "",
      };
    }
  }

  return discrepancies;
}

export function convertStringToDateTime(dateString: string): Date {
  const parts: string[] = dateString.replace(/"/g, "").split("/");
  if (parts.length !== 3) {
    throw new Error("Invalid date format. Expected mm/dd/yyyy");
  }

  const [mm, dd, yyyy] = parts.map((part) => parseInt(part, 10));

  if (mm === undefined || dd === undefined || yyyy === undefined) {
    throw new Error("Invalid date format. Expected mm/dd/yyyy");
  }

  if (isNaN(mm) || isNaN(dd) || isNaN(yyyy)) {
    throw new Error("Invalid date format. Expected mm/dd/yyyy");
  }

  const jsDate = new Date(yyyy, mm - 1, dd); // mm-1 because months are 0-indexed in JavaScript

  return jsDate;
}

export const exampleVoterRecord: Partial<VoterRecordArchive> = {
  VRCNUM: "12345",
  lastName: "Doe",
  firstName: "John",
  middleInitial: "M",
  suffixName: "Jr",
  houseNum: 123,
  street: "Main St",
  apartment: "Apt 1B",
  halfAddress: "Half Address Example",
  resAddrLine2: "Residential Address Line 2",
  resAddrLine3: "Residential Address Line 3",
  city: "Anytown",
  state: "NY",
  zipCode: "12345",
  zipSuffix: "6789",
  telephone: "555-123-4567",
  email: "john.doe@example.com",
  mailingAddress1: "PO Box 789",
  mailingAddress2: "Mailing Address Line 2",
  mailingAddress3: "Mailing Address Line 3",
  mailingAddress4: "Mailing Address Line 4",
  mailingCity: "Mailing City",
  mailingState: "MS",
  mailingZip: "54321",
  mailingZipSuffix: "9876",
  party: "Independent",
  gender: "Male",
  DOB: new Date("1980-01-01"),
  L_T: "L_T Example",
  electionDistrict: 5,
  countyLegDistrict: "County Legislative District",
  stateAssmblyDistrict: "State Assembly District",
  stateSenateDistrict: "State Senate District",
  congressionalDistrict: "Congressional District",
  CC_WD_Village: "CC_WD_Village Example",
  townCode: "Town Code Example",
  lastUpdate: new Date("2023-01-01"),
  originalRegDate: new Date("2000-01-01"),
  statevid: "NY123456789",
};

export const fetchFilteredDataSchema = z.object({
  searchQuery: z.array(searchQueryFieldSchema),
  pageSize: z.number().int().min(1).max(100),
  page: z.number().int().min(1),
});

export type FetchFilteredDataRequest = z.infer<typeof fetchFilteredDataSchema>;

// const partyCodes = [
//   "BLK",
//   "CON",
//   "IND",
//   "LBT",
//   "GRE",
//   "DEM",
//   "REP",
//   "OTH",
//   "WEP",
//   "SAM",
//   "WOR",
// ] as const;

// const allowedParties = ["Democratic", "Custom"];
