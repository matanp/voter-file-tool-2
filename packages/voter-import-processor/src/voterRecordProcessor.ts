// Voter record transformation and validation

import type { Prisma, PrismaClient, VoterRecord } from "@prisma/client";
import { searchableFieldEnum } from "@voter-file-tool/shared-validators";
import type { VoterRecordArchiveStrings } from "./types";

/**
 * Convert date string from mm/dd/yyyy format to Date object
 */
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

/**
 * Example voter record structure for CSV headers
 */
export const exampleVoterRecord = {
  VRCNUM: "",
  lastName: "",
  firstName: "",
  middleInitial: "",
  suffixName: "",
  houseNum: "",
  street: "",
  apartment: "",
  halfAddress: "",
  resAddrLine2: "",
  resAddrLine3: "",
  city: "",
  state: "",
  zipCode: "",
  zipSuffix: "",
  telephone: "",
  email: "",
  mailingAddress1: "",
  mailingAddress2: "",
  mailingAddress3: "",
  mailingAddress4: "",
  mailingCity: "",
  mailingState: "",
  mailingZip: "",
  mailingZipSuffix: "",
  party: "",
  gender: "",
  DOB: "",
  L_T: "",
  electionDistrict: "",
  countyLegDistrict: "",
  stateAssmblyDistrict: "",
  stateSenateDistrict: "",
  congressionalDistrict: "",
  CC_WD_Village: "",
  townCode: "",
  lastUpdate: "",
  originalRegDate: "",
  statevid: "",
};

/**
 * Type guard to check if key is valid for VoterRecordArchive
 */
function isKeyOfVoterRecordArchiveStrings(
  key: string,
): key is keyof typeof exampleVoterRecord {
  return key in exampleVoterRecord;
}

/**
 * Type guard to check if record has required fields
 */
function hasRequiredVoterArchiveFields(
  record: Partial<Prisma.VoterRecordArchiveCreateManyInput>,
): record is Prisma.VoterRecordArchiveCreateManyInput {
  return (
    typeof record.VRCNUM === "string" &&
    typeof record.recordEntryYear === "number" &&
    typeof record.recordEntryNumber === "number"
  );
}

/**
 * Check if a record is newer than the existing record
 */
export function isRecordNewer(
  newRecord: Prisma.VoterRecordArchiveCreateManyInput,
  existingRecord: VoterRecord,
): boolean {
  if (newRecord.recordEntryYear > existingRecord.latestRecordEntryYear) {
    return true;
  }
  if (
    newRecord.recordEntryYear === existingRecord.latestRecordEntryYear &&
    newRecord.recordEntryNumber > existingRecord.latestRecordEntryNumber
  ) {
    return true;
  }
  return false;
}

/**
 * Transform a row of strings from CSV into a typed VoterRecordArchive object
 */
export function transformVoterRecord(
  record: VoterRecordArchiveStrings,
  year: number,
  recordEntryNumber: number,
): Prisma.VoterRecordArchiveCreateManyInput | null {
  const VRCNUM = record.VRCNUM;

  if (VRCNUM === undefined || VRCNUM === null) {
    throw new Error("VRCNUM is undefined");
  }

  let voterRecord: Partial<Prisma.VoterRecordArchiveCreateManyInput> = {
    recordEntryYear: year,
    recordEntryNumber,
  };

  for (const key of Object.keys(exampleVoterRecord)) {
    const parseKey = searchableFieldEnum.safeParse(key);
    if (!parseKey.success) {
      console.log("Error parsing field", key);
      continue;
    }

    if (!isKeyOfVoterRecordArchiveStrings(parseKey.data)) {
      console.log("Unexpected field", parseKey.data);
      continue;
    }
    const value = record[parseKey.data];

    if (key === "houseNum" || key === "electionDistrict") {
      const trimmed = value?.trim();
      const num =
        trimmed === "" || trimmed == null ? undefined : Number(trimmed);
      voterRecord = {
        ...voterRecord,
        ...(Number.isFinite(num) ? { [key]: num } : {}),
      };
    } else if (
      key === "DOB" ||
      key === "lastUpdate" ||
      key === "originalRegDate"
    ) {
      voterRecord = {
        ...voterRecord,
        [key]: convertStringToDateTime(value ?? ""),
      };
    } else {
      voterRecord = {
        ...voterRecord,
        [key]: value?.trim() ?? "",
      };
    }
  }

  if (hasRequiredVoterArchiveFields(voterRecord)) {
    return voterRecord;
  } else {
    console.log("Error saving voter record", voterRecord);
    throw new Error("Missing required fields");
  }
}

/**
 * Bulk save voter records to database
 * Updates VoterRecordArchive and VoterRecord tables
 */
export async function bulkSaveVoterRecords(
  records: Prisma.VoterRecordArchiveCreateManyInput[],
  prisma: PrismaClient,
): Promise<{ created: number; updated: number }> {
  console.time("bulkSaveVoterRecords");
  
  if (records.length === 0) {
    console.timeEnd("bulkSaveVoterRecords");
    return { created: 0, updated: 0 };
  }

  // Save to VoterRecordArchive
  await prisma.voterRecordArchive.createMany({
    data: records,
  });

  // Find existing VoterRecords
  const existingRecords = await prisma.voterRecord.findMany({
    where: {
      VRCNUM: {
        in: records.map((record) => record.VRCNUM),
      },
    },
  });

  const existingRecordMap = new Map(
    existingRecords.map((record) => [record.VRCNUM, record]),
  );

  const voterCreateTransactions: Prisma.VoterRecordCreateManyInput[] = [];
  const voterUpdateTransactions: Prisma.VoterRecordUpdateManyArgs[] = [];

  for (const record of records) {
    const existingRecord = existingRecordMap.get(record.VRCNUM);

    const { recordEntryYear, recordEntryNumber, VRCNUM, ...otherRecordFields } =
      record;

    if (existingRecord && isRecordNewer(record, existingRecord)) {
      voterUpdateTransactions.push({
        where: {
          VRCNUM: record.VRCNUM,
        },
        data: {
          ...otherRecordFields,
          latestRecordEntryNumber: recordEntryNumber,
          latestRecordEntryYear: recordEntryYear,
          hasDiscrepancy: false,
        },
      });
    } else if (existingRecord === undefined) {
      voterCreateTransactions.push({
        ...otherRecordFields,
        VRCNUM,
        latestRecordEntryNumber: recordEntryNumber,
        latestRecordEntryYear: recordEntryYear,
        hasDiscrepancy: false,
      });
    }
  }

  // Execute updates
  const voterUpdateMany = voterUpdateTransactions.map((transaction) => {
    return prisma.voterRecord.updateMany(transaction);
  });

  await Promise.all(voterUpdateMany);

  // Execute creates
  await prisma.voterRecord.createMany({
    data: voterCreateTransactions,
  });

  console.timeEnd("bulkSaveVoterRecords");
  
  return {
    created: voterCreateTransactions.length,
    updated: voterUpdateTransactions.length,
  };
}
