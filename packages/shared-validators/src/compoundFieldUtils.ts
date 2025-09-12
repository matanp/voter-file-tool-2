import type { VoterRecordField } from './schemas/ldCommittees';
import type {
  VoterRecordAPI,
  PartialVoterRecordAPI,
} from './schemas/voterRecord';
import type { VoterRecord as PrismaVoterRecord } from '@voter-file-tool/shared-prisma';

// Compound field configuration
export interface CompoundFieldConfig {
  name?: boolean;
  address?: boolean;
}

// Default compound field configuration
export const DEFAULT_COMPOUND_FIELD_CONFIG: Required<CompoundFieldConfig> = {
  name: true,
  address: true,
};

/**
 * Converts a Prisma VoterRecord to VoterRecordAPI by converting Date fields to strings
 */
export function convertPrismaVoterRecordToAPI(
  prismaRecord: PrismaVoterRecord
): VoterRecordAPI {
  return {
    ...prismaRecord,
    DOB:
      prismaRecord.DOB && prismaRecord.DOB instanceof Date
        ? prismaRecord.DOB.toISOString()
        : null,
    lastUpdate:
      prismaRecord.lastUpdate && prismaRecord.lastUpdate instanceof Date
        ? prismaRecord.lastUpdate.toISOString()
        : null,
    originalRegDate:
      prismaRecord.originalRegDate &&
      prismaRecord.originalRegDate instanceof Date
        ? prismaRecord.originalRegDate.toISOString()
        : null,
  };
}

// Interface for objects that can have compound fields applied
export interface CompoundFieldTarget extends PartialVoterRecordAPI {
  name?: string;
  address?: string;
}

/**
 * Creates a compound name field from individual name components
 */
export function createCompoundNameField(record: PartialVoterRecordAPI): string {
  const firstName = record.firstName || '';
  const lastName = record.lastName || '';
  const middleInitial = record.middleInitial || '';
  const suffixName = record.suffixName || '';

  const nameParts = [firstName];
  if (middleInitial) nameParts.push(middleInitial);
  nameParts.push(lastName);
  if (suffixName) nameParts.push(suffixName);

  return nameParts.join(' ').trim();
}

/**
 * Creates a compound address field from individual address components
 */
export function createCompoundAddressField(
  record: PartialVoterRecordAPI
): string {
  const houseNum = record.houseNum || '';
  const street = record.street || '';
  const apartment = record.apartment || '';
  // const halfAddress = record.halfAddress || '';
  const resAddrLine2 = record.resAddrLine2 || '';
  const resAddrLine3 = record.resAddrLine3 || '';
  const city = record.city || '';
  const state = record.state || '';
  const zipCode = record.zipCode || '';
  const zipSuffix = record.zipSuffix || '';

  const addressParts = [];
  if (houseNum) addressParts.push(houseNum.toString());
  if (street) addressParts.push(street);
  if (apartment) addressParts.push(`Apt ${apartment}`);
  // if (halfAddress) addressParts.push(halfAddress);
  if (resAddrLine2) addressParts.push(resAddrLine2);
  if (resAddrLine3) addressParts.push(resAddrLine3);

  const address = addressParts.join(' ').trim();
  const cityStateZip = [city, state, zipCode, zipSuffix]
    .filter(Boolean)
    .join(' ');

  return [address, cityStateZip].filter(Boolean).join(', ').trim();
}

/**
 * Applies compound fields to a record based on configuration
 */
export function applyCompoundFields(
  record: PartialVoterRecordAPI,
  config: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG
): CompoundFieldTarget {
  const result: CompoundFieldTarget = { ...record };

  if (config.name) {
    result.name = createCompoundNameField(record);
  }

  if (config.address) {
    result.address = createCompoundAddressField(record);
  }

  return result;
}

/**
 * Determines which columns to include based on selected fields and compound field configuration
 */
export function determineColumnsToInclude(
  selectedFields: VoterRecordField[],
  includeCompoundFields: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG,
  columnOrder: string[] = []
): string[] {
  const columns: string[] = [];

  // Add compound fields if requested
  if (includeCompoundFields.name) {
    columns.push('name');
  }
  if (includeCompoundFields.address) {
    columns.push('address');
  }

  selectedFields.forEach((field) => {
    if (!columns.includes(field)) {
      columns.push(field);
    }
  });

  if (columnOrder.length > 0) {
    const orderedColumns = columnOrder.filter((col) => columns.includes(col));
    const remainingColumns = columns.filter(
      (col) => !columnOrder.includes(col)
    );
    return [...orderedColumns, ...remainingColumns];
  }

  return columns;
}

/**
 * Extracts field value from a record, handling compound fields
 */
export function extractFieldValue(
  record: CompoundFieldTarget,
  field: string
): string | number | Date | null | undefined | unknown {
  if (field === 'name') {
    return record.name || createCompoundNameField(record);
  }
  if (field === 'address') {
    return record.address || createCompoundAddressField(record);
  }

  const value = (record as any)[field];
  return value !== undefined && value !== null ? value : '';
}

/**
 * Sanitizes a VoterRecordAPI by converting undefined values to null
 */
export function sanitizeVoterRecord(
  voter: PrismaVoterRecord
): PrismaVoterRecord {
  return {
    ...voter,
    // Convert undefined to null for all nullable fields
    committeeId: voter.committeeId ?? null,
    addressForCommittee: voter.addressForCommittee ?? null,
    latestRecordEntryYear: voter.latestRecordEntryYear ?? 0,
    latestRecordEntryNumber: voter.latestRecordEntryNumber ?? 0,
    lastName: voter.lastName ?? null,
    firstName: voter.firstName ?? null,
    middleInitial: voter.middleInitial ?? null,
    suffixName: voter.suffixName ?? null,
    houseNum: voter.houseNum ?? null,
    street: voter.street ?? null,
    apartment: voter.apartment ?? null,
    halfAddress: voter.halfAddress ?? null,
    resAddrLine2: voter.resAddrLine2 ?? null,
    resAddrLine3: voter.resAddrLine3 ?? null,
    city: voter.city ?? null,
    state: voter.state ?? null,
    zipCode: voter.zipCode ?? null,
    zipSuffix: voter.zipSuffix ?? null,
    telephone: voter.telephone ?? null,
    email: voter.email ?? null,
    mailingAddress1: voter.mailingAddress1 ?? null,
    mailingAddress2: voter.mailingAddress2 ?? null,
    mailingAddress3: voter.mailingAddress3 ?? null,
    mailingAddress4: voter.mailingAddress4 ?? null,
    mailingCity: voter.mailingCity ?? null,
    mailingState: voter.mailingState ?? null,
    mailingZip: voter.mailingZip ?? null,
    mailingZipSuffix: voter.mailingZipSuffix ?? null,
    party: voter.party ?? null,
    gender: voter.gender ?? null,
    DOB: voter.DOB ?? null,
    L_T: voter.L_T ?? null,
    electionDistrict: voter.electionDistrict ?? null,
    countyLegDistrict: voter.countyLegDistrict ?? null,
    stateAssmblyDistrict: voter.stateAssmblyDistrict ?? null,
    stateSenateDistrict: voter.stateSenateDistrict ?? null,
    congressionalDistrict: voter.congressionalDistrict ?? null,
    CC_WD_Village: voter.CC_WD_Village ?? null,
    townCode: voter.townCode ?? null,
    lastUpdate: voter.lastUpdate ?? null,
    originalRegDate: voter.originalRegDate ?? null,
    statevid: voter.statevid ?? null,
    hasDiscrepancy: voter.hasDiscrepancy ?? null,
  };
}

/**
 * Internal helper function to map voter record fields with compound field support
 */
function mapVoterRecordFieldsInternal(
  voter: VoterRecordAPI,
  includeFields: VoterRecordField[] = [],
  compoundFieldConfig: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG
): PartialVoterRecordAPI | null {
  // Validate that VRCNUM exists and is not empty
  if (!voter.VRCNUM || voter.VRCNUM.trim() === '') {
    console.warn('Skipping voter record with invalid VRCNUM:', voter);
    return null;
  }

  // Determine which fields to include based on compound field requirements
  const fieldsToInclude = new Set<VoterRecordField>(includeFields);

  if (compoundFieldConfig.name) {
    fieldsToInclude.add('firstName');
    fieldsToInclude.add('lastName');
    fieldsToInclude.add('middleInitial');
    fieldsToInclude.add('suffixName');
  }

  if (compoundFieldConfig.address) {
    fieldsToInclude.add('houseNum');
    fieldsToInclude.add('street');
    fieldsToInclude.add('apartment');
    fieldsToInclude.add('halfAddress');
    fieldsToInclude.add('resAddrLine2');
    fieldsToInclude.add('resAddrLine3');
    fieldsToInclude.add('city');
    fieldsToInclude.add('state');
    fieldsToInclude.add('zipCode');
    fieldsToInclude.add('zipSuffix');
  }

  // Always include VRCNUM as it's required
  fieldsToInclude.add('VRCNUM');

  // Create filtered member object with only the required fields
  const member: PartialVoterRecordAPI = {};

  fieldsToInclude.forEach((field) => {
    (member as any)[field] = voter[field];
  });

  return member;
}

/**
 * Maps a VoterRecord to a member object with compound fields applied
 */
export function mapVoterRecordToMemberWithFields(
  voter: PrismaVoterRecord,
  includeFields: VoterRecordField[] = [],
  compoundFieldConfig: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG
): PartialVoterRecordAPI | null {
  // Convert Prisma VoterRecord to API format (Date -> string conversion)
  const apiVoter = convertPrismaVoterRecordToAPI(voter);

  // Use the internal helper function
  return mapVoterRecordFieldsInternal(
    apiVoter,
    includeFields,
    compoundFieldConfig
  );
}

/**
 * Maps a VoterRecordAPI to a member object with compound fields applied
 * This version works with already-converted API records (dates as strings)
 */
export function mapVoterRecordAPIToMemberWithFields(
  voter: VoterRecordAPI,
  includeFields: VoterRecordField[] = [],
  compoundFieldConfig: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG
): PartialVoterRecordAPI | null {
  // Use the internal helper function directly
  return mapVoterRecordFieldsInternal(
    voter,
    includeFields,
    compoundFieldConfig
  );
}
