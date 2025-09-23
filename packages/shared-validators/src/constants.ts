import { z } from 'zod';
import type { VoterRecord } from '@voter-file-tool/shared-prisma';

/**
 * Shared constants for the voter file tool application
 * These constants are used across both frontend and backend applications
 */

export const MAX_RECORDS_FOR_EXPORT = 20000;

export const ADMIN_CONTACT_INFO = `For exports larger than ${MAX_RECORDS_FOR_EXPORT.toLocaleString()} records, please contact an administrator to request a custom export.`;

/**
 * Fields that are not searchable (computed or internal fields)
 */
const NON_SEARCHABLE_FIELDS = [
  'id',
  'latestRecordEntryYear',
  'latestRecordEntryNumber',
  'committeeId',
] as const;

/**
 * Field type subsets for discriminated unions
 */
export const NUMBER_FIELDS = ['houseNum', 'electionDistrict'] as const;
export const BOOLEAN_FIELDS = [
  'hasEmail',
  'hasInvalidEmail',
  'hasPhone',
] as const;
export const DATE_FIELDS = ['DOB', 'lastUpdate', 'originalRegDate'] as const;
export const STRING_FIELDS = [
  'VRCNUM',
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
] as const;

/**
 * Additional computed fields that can be searched
 */
const COMPUTED_SEARCHABLE_FIELDS = [
  'hasEmail',
  'hasInvalidEmail',
  'hasPhone',
] as const;

/**
 * Derive searchable fields from VoterRecord type, excluding non-searchable fields
 * This automatically stays in sync with the Prisma schema
 */
type VoterRecordKeys = keyof VoterRecord;
type SearchableVoterRecordKeys = Exclude<
  VoterRecordKeys,
  (typeof NON_SEARCHABLE_FIELDS)[number]
>;
type AllSearchableFields =
  | SearchableVoterRecordKeys
  | (typeof COMPUTED_SEARCHABLE_FIELDS)[number];

/**
 * Create enum from the field type subsets - this is the single source of truth
 * The enum values are explicitly derived from the field type subsets
 */
export const searchableFieldEnum = z.enum([
  ...NUMBER_FIELDS,
  ...BOOLEAN_FIELDS,
  ...DATE_FIELDS,
  ...STRING_FIELDS,
] as const satisfies readonly AllSearchableFields[]);

export type SearchableField = z.infer<typeof searchableFieldEnum>;
