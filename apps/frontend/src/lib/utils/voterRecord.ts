import { type VoterRecord } from "@prisma/client";
import { type VoterRecordAPI } from "@voter-file-tool/shared-validators";
import { parseCalendarDate } from "~/lib/dateUtils";

/**
 * Converts API voter record (with string dates) to Prisma voter record (with Date objects)
 * This is needed because API returns dates as strings but Prisma expects Date objects
 */
export function convertAPIToPrismaRecord(
  apiRecord: VoterRecordAPI,
): VoterRecord {
  // Helper function to safely convert date strings to Date or null
  const convertDateString = (
    dateString: string | null | undefined,
  ): Date | null => {
    if (!dateString) return null;
    const date = parseCalendarDate(dateString);
    return date;
  };

  return {
    ...apiRecord,
    // Convert date strings to Date objects
    DOB: convertDateString(apiRecord.DOB),
    lastUpdate: convertDateString(apiRecord.lastUpdate),
    originalRegDate: convertDateString(apiRecord.originalRegDate),
  } as VoterRecord;
}

/**
 * Converts an array of API voter records to Prisma voter records
 */
export function convertAPIToPrismaRecords(
  apiRecords: VoterRecordAPI[],
): VoterRecord[] {
  return apiRecords.map(convertAPIToPrismaRecord);
}
