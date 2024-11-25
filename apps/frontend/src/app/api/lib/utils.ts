import {
  Prisma,
  type VoterRecord,
  type VoterRecordArchive,
} from "@prisma/client";
import { z } from "zod";
import prisma from "~/lib/prisma";

export const dropdownItems = [
  "city",
  "zipCode",
  "street",
  "countyLegDistrict",
  "stateAssmblyDistrict",
  "stateSenateDistrict",
  "congressionalDistrict",
  "townCode",
  "electionDistrict",
  "party",
] as const;

export type DropdownItem = (typeof dropdownItems)[number];

export function isDropdownItem(value: string): value is DropdownItem {
  return dropdownItems.includes(value as DropdownItem);
}

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
          // console.log(
          //   "Discrepancy found for VRCNUM via date comparison",
          //   VRCNUM,
          //   field,
          //   recordArchive[field],
          //   firstRecord[field],
          // );
          return true;
        }
      } else if (recordArchive[field] !== firstRecord[field]) {
        // console.log(
        //   "Discrepancy found for VRCNUM",
        //   VRCNUM,
        //   field,
        //   recordArchive[field],
        //   firstRecord[field],
        // );
        return true;
      }
    }
  }

  return false;
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

export const fieldEnum = z.enum([
  "VRCNUM",
  "lastName",
  "firstName",
  "middleInitial",
  "suffixName",
  "houseNum",
  "street",
  "apartment",
  "halfAddress",
  "resAddrLine2",
  "resAddrLine3",
  "city",
  "state",
  "zipCode",
  "zipSuffix",
  "telephone",
  "email",
  "mailingAddress1",
  "mailingAddress2",
  "mailingAddress3",
  "mailingAddress4",
  "mailingCity",
  "mailingState",
  "mailingZip",
  "mailingZipSuffix",
  "party",
  "gender",
  "DOB",
  "L_T",
  "electionDistrict",
  "countyLegDistrict",
  "stateAssmblyDistrict",
  "stateSenateDistrict",
  "congressionalDistrict",
  "CC_WD_Village",
  "townCode",
  "lastUpdate",
  "originalRegDate",
  "statevid",
]);

export const searchQueryFieldSchema = z
  .array(
    z.object({
      field: fieldEnum,
      value: z.union([z.string().nullable(), z.number().nullable()]),
    }),
  )
  .refine(
    (data) => {
      return data.every((item) => {
        if (item.field === "houseNum" || item.field === "electionDistrict") {
          return typeof item.value === "number" || item.value === null;
        }
        return typeof item.value === "string" || item.value === null;
      });
    },
    {
      message: "Invalid value type for the specified field.",
    },
  );

export const fetchFilteredDataSchema = z.object({
  searchQuery: searchQueryFieldSchema,
  pageSize: z.number().min(1).max(100),
  page: z.number().min(1),
});

const partyCodes = [
  "BLK",
  "CON",
  "IND",
  "LBT",
  "GRE",
  "DEM",
  "REP",
  "OTH",
  "WEP",
  "SAM",
  "WOR",
] as const;

export const generatePdfDataSchema = z.object({
  candidates: z
    .array(
      z.object({
        name: z.string(),
        office: z.string(),
        address: z.string(),
      }),
    )
    .min(1, { message: "At least one candidate is required" }),
  vacancyAppointments: z
    .array(
      z.object({
        name: z.string(),
        address: z.string(),
      }),
    )
    .min(1, { message: "At least one vacancy appointment is required" }),
  party: z.enum(partyCodes, {
    errorMap: () => ({ message: "Party is required" }),
  }),
  electionDate: z.string().refine((date) => date !== "", {
    message: "Election date is required",
  }),
  numPages: z
    .number()
    .min(1, { message: "Minimum 1 page" })
    .max(25, { message: "No more than 25 pages allowed" }),
});

export type GeneratePdfData = z.infer<typeof generatePdfDataSchema>;
