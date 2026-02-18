// Voter record transformation and validation

import type { Prisma, PrismaClient, VoterRecord } from '@prisma/client';
import { searchableFieldEnum } from '@voter-file-tool/shared-validators';
import type { VoterRecordArchiveStrings } from './types';

/**
 * Fields to update in batch update query, organized by type for proper SQL casting
 */
const VOTER_RECORD_UPDATE_FIELDS = {
  string: [
    'lastName',
    'firstName',
    'middleInitial',
    'suffixName',
    'street',
    'apartment',
    'halfAddress',
    'resAddrLine2',
    'resAddrLine3',
    'city',
    'state',
    'zipCode',
    'zipSuffix',
    'telephone',
    'email',
    'mailingAddress1',
    'mailingAddress2',
    'mailingAddress3',
    'mailingAddress4',
    'mailingCity',
    'mailingState',
    'mailingZip',
    'mailingZipSuffix',
    'party',
    'gender',
    'L_T',
    'countyLegDistrict',
    'stateAssmblyDistrict',
    'stateSenateDistrict',
    'congressionalDistrict',
    'CC_WD_Village',
    'townCode',
    'statevid',
  ],
  integer: [
    'houseNum',
    'electionDistrict',
    'latestRecordEntryYear',
    'latestRecordEntryNumber',
  ],
  datetime: ['DOB', 'lastUpdate', 'originalRegDate'],
  boolean: ['hasDiscrepancy'],
} as const;

/**
 * Format a value for SQL based on its type
 */
function formatSqlValue(
  value: unknown,
  type: 'string' | 'integer' | 'datetime' | 'boolean',
): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  switch (type) {
    case 'string':
      // Escape single quotes by doubling them
      return `'${String(value).replace(/'/g, "''")}'`;
    case 'integer':
      return value === null || value === undefined
        ? 'NULL'
        : String(Number(value));
    case 'datetime':
      if (value instanceof Date) {
        return `'${value.toISOString()}'::timestamp`;
      }
      return 'NULL';
    case 'boolean':
      return value ? 'true' : 'false';
    default:
      return 'NULL';
  }
}

/**
 * Build and execute a batch UPDATE query for VoterRecords
 * Uses PostgreSQL's UPDATE ... FROM (VALUES ...) syntax for efficient bulk updates
 */
async function batchUpdateVoterRecords(
  updates: { vrcnum: string; data: Record<string, unknown> }[],
  prisma: PrismaClient,
): Promise<number> {
  if (updates.length === 0) {
    return 0;
  }

  // Build column list for VALUES clause (VRCNUM + all update fields)
  const allFields = [
    ...VOTER_RECORD_UPDATE_FIELDS.string,
    ...VOTER_RECORD_UPDATE_FIELDS.integer,
    ...VOTER_RECORD_UPDATE_FIELDS.datetime,
    ...VOTER_RECORD_UPDATE_FIELDS.boolean,
  ];

  // Build the VALUES rows
  const valuesRows = updates.map((update) => {
    const values: string[] = [formatSqlValue(update.vrcnum, 'string')];

    for (const field of VOTER_RECORD_UPDATE_FIELDS.string) {
      values.push(formatSqlValue(update.data[field], 'string'));
    }
    for (const field of VOTER_RECORD_UPDATE_FIELDS.integer) {
      values.push(formatSqlValue(update.data[field], 'integer'));
    }
    for (const field of VOTER_RECORD_UPDATE_FIELDS.datetime) {
      values.push(formatSqlValue(update.data[field], 'datetime'));
    }
    for (const field of VOTER_RECORD_UPDATE_FIELDS.boolean) {
      values.push(formatSqlValue(update.data[field], 'boolean'));
    }

    return `(${values.join(', ')})`;
  });

  // Column names only for VALUES alias (PostgreSQL does not allow types here)
  const tmpColumnNames = ['"VRCNUM"', ...allFields.map((f) => `"${f}"`)];

  // Build the SET clause
  const setClause = allFields
    .map((field) => `"${field}" = tmp."${field}"`)
    .join(', ');

  // Build the full UPDATE query
  const sql = `
    UPDATE "VoterRecord" AS v SET
      ${setClause}
    FROM (VALUES
      ${valuesRows.join(',\n      ')}
    ) AS tmp(${tmpColumnNames.join(', ')})
    WHERE v."VRCNUM" = tmp."VRCNUM"
  `;

  const result = await prisma.$executeRawUnsafe(sql);
  return result;
}

/**
 * Convert date string from mm/dd/yyyy format to Date object
 */
export function convertStringToDateTime(dateString: string): Date {
  const parts: string[] = dateString.replace(/"/g, '').split('/');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected mm/dd/yyyy');
  }

  const [mm, dd, yyyy] = parts.map((part) => parseInt(part, 10));

  if (mm === undefined || dd === undefined || yyyy === undefined) {
    throw new Error('Invalid date format. Expected mm/dd/yyyy');
  }

  if (isNaN(mm) || isNaN(dd) || isNaN(yyyy)) {
    throw new Error('Invalid date format. Expected mm/dd/yyyy');
  }

  const jsDate = new Date(yyyy, mm - 1, dd); // mm-1 because months are 0-indexed in JavaScript

  return jsDate;
}

/**
 * Example voter record structure for CSV headers
 */
export const exampleVoterRecord = {
  VRCNUM: '',
  lastName: '',
  firstName: '',
  middleInitial: '',
  suffixName: '',
  houseNum: '',
  street: '',
  apartment: '',
  halfAddress: '',
  resAddrLine2: '',
  resAddrLine3: '',
  city: '',
  state: '',
  zipCode: '',
  zipSuffix: '',
  telephone: '',
  email: '',
  mailingAddress1: '',
  mailingAddress2: '',
  mailingAddress3: '',
  mailingAddress4: '',
  mailingCity: '',
  mailingState: '',
  mailingZip: '',
  mailingZipSuffix: '',
  party: '',
  gender: '',
  DOB: '',
  L_T: '',
  electionDistrict: '',
  countyLegDistrict: '',
  stateAssmblyDistrict: '',
  stateSenateDistrict: '',
  congressionalDistrict: '',
  CC_WD_Village: '',
  townCode: '',
  lastUpdate: '',
  originalRegDate: '',
  statevid: '',
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
    typeof record.VRCNUM === 'string' &&
    typeof record.recordEntryYear === 'number' &&
    typeof record.recordEntryNumber === 'number'
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
    throw new Error('VRCNUM is undefined');
  }

  let voterRecord: Partial<Prisma.VoterRecordArchiveCreateManyInput> = {
    recordEntryYear: year,
    recordEntryNumber,
  };

  for (const key of Object.keys(exampleVoterRecord)) {
    const parseKey = searchableFieldEnum.safeParse(key);
    if (!parseKey.success) {
      console.log('Error parsing field', key);
      continue;
    }

    if (!isKeyOfVoterRecordArchiveStrings(parseKey.data)) {
      console.log('Unexpected field', parseKey.data);
      continue;
    }
    const value = record[parseKey.data];

    if (key === 'houseNum' || key === 'electionDistrict') {
      const trimmed = value?.trim();
      const num =
        trimmed === '' || trimmed == null ? undefined : Number(trimmed);
      voterRecord = {
        ...voterRecord,
        ...(Number.isFinite(num) ? { [key]: num } : {}),
      };
    } else if (
      key === 'DOB' ||
      key === 'lastUpdate' ||
      key === 'originalRegDate'
    ) {
      voterRecord = {
        ...voterRecord,
        [key]: convertStringToDateTime(value ?? ''),
      };
    } else {
      voterRecord = {
        ...voterRecord,
        [key]: value?.trim() ?? '',
      };
    }
  }

  if (hasRequiredVoterArchiveFields(voterRecord)) {
    return voterRecord;
  } else {
    console.log('Error saving voter record', voterRecord);
    throw new Error('Missing required fields');
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
  console.time('bulkSaveVoterRecords');

  if (records.length === 0) {
    console.timeEnd('bulkSaveVoterRecords');
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
  const voterUpdateData: { vrcnum: string; data: Record<string, unknown> }[] =
    [];

  for (const record of records) {
    const existingRecord = existingRecordMap.get(record.VRCNUM);

    const { recordEntryYear, recordEntryNumber, VRCNUM, ...otherRecordFields } =
      record;

    if (existingRecord && isRecordNewer(record, existingRecord)) {
      voterUpdateData.push({
        vrcnum: record.VRCNUM,
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

  // Execute batch update using raw SQL (single query instead of individual updates)
  console.time('batchUpdateVoterRecords');
  const updatedCount = await batchUpdateVoterRecords(voterUpdateData, prisma);
  console.timeEnd('batchUpdateVoterRecords');
  console.log(`Batch updated ${updatedCount} voter records`);

  // Execute creates
  console.time('createManyVoterRecords');
  await prisma.voterRecord.createMany({
    data: voterCreateTransactions,
  });
  console.timeEnd('createManyVoterRecords');

  console.timeEnd('bulkSaveVoterRecords');

  return {
    created: voterCreateTransactions.length,
    updated: updatedCount,
  };
}
