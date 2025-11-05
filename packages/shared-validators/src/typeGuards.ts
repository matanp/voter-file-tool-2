import type { VoterRecord } from '@voter-file-tool/shared-prisma';
import type { CommitteeList } from '@voter-file-tool/shared-prisma';
import { voterRecordSchema } from './schemas/voterRecord';

/**
 * Type guard to check if data is a valid VoterRecord
 * Uses the comprehensive voterRecordSchema for validation
 */
export function isVoterRecord(data: unknown): data is VoterRecord {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  // Use the existing schema for comprehensive validation
  const result = voterRecordSchema.safeParse(data);
  return result.success;
}

/**
 * Type guard to check if data is a valid CommitteeList
 */
export function isCommitteeList(data: unknown): data is CommitteeList {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'cityTown' in data &&
    'legDistrict' in data &&
    'electionDistrict' in data &&
    typeof (data as any).id === 'number' &&
    typeof (data as any).cityTown === 'string' &&
    typeof (data as any).legDistrict === 'number' &&
    typeof (data as any).electionDistrict === 'number'
  );
}

/**
 * Type guard to check if data is a valid VoterRecord with minimal required fields
 * Faster than full schema validation for basic checks
 */
export function isVoterRecordBasic(
  data: unknown
): data is Pick<VoterRecord, 'VRCNUM' | 'firstName' | 'lastName'> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'VRCNUM' in data &&
    'firstName' in data &&
    'lastName' in data &&
    typeof (data as any).VRCNUM === 'string' &&
    (typeof (data as any).firstName === 'string' ||
      (data as any).firstName === null) &&
    (typeof (data as any).lastName === 'string' ||
      (data as any).lastName === null)
  );
}
