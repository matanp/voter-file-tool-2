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
  mailingAddress?: boolean;
}

// Default compound field configuration
export const DEFAULT_COMPOUND_FIELD_CONFIG: Required<CompoundFieldConfig> = {
  name: true,
  address: true,
  mailingAddress: false,
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
export interface EnrichedPartialVoterRecordAPI extends PartialVoterRecordAPI {
  name?: string;
  address?: string;
  mailingAddress?: string;
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
 * Formats the "City, ST 12345-6789" tail of an address; any empty part is dropped.
 */
function formatCityStateZip(
  city: string,
  state: string,
  zip: string,
  zipSuffix: string
): string {
  const locality = [city, state].filter(Boolean).join(', ');
  const postal = zip ? (zipSuffix ? `${zip}-${zipSuffix}` : zip) : '';
  return [locality, postal].filter(Boolean).join(' ');
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
  const cityStateZip = formatCityStateZip(city, state, zipCode, zipSuffix);
  return [address, cityStateZip].filter(Boolean).join(', ').trim();
}

/**
 * Creates a compound mailing address field. Each mailingAddress1-4 line is a
 * whole address line; city/state/zip are appended like the residential address.
 * Foreign addresses usually have only lines (city/state/zip empty), so they come
 * out as the joined lines.
 */
export function createCompoundMailingAddressField(
  record: PartialVoterRecordAPI
): string {
  const lines = [
    record.mailingAddress1,
    record.mailingAddress2,
    record.mailingAddress3,
    record.mailingAddress4,
  ]
    .map((line) => (line ?? '').trim())
    .filter(Boolean);

  const city = (record.mailingCity ?? '').trim();
  const state = (record.mailingState ?? '').trim();
  const zip = (record.mailingZip ?? '').trim();
  const zipSuffix = (record.mailingZipSuffix ?? '').trim();

  const cityStateZip = formatCityStateZip(city, state, zip, zipSuffix);

  return [...lines, cityStateZip].filter(Boolean).join(', ');
}

/**
 * Applies compound fields to a record based on configuration
 */
export function applyCompoundFields(
  record: PartialVoterRecordAPI,
  config: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG
): EnrichedPartialVoterRecordAPI {
  const result: EnrichedPartialVoterRecordAPI = { ...record };

  if (config.name) {
    result.name = createCompoundNameField(record);
  }

  if (config.address) {
    result.address = createCompoundAddressField(record);
  }

  if (config.mailingAddress) {
    result.mailingAddress = createCompoundMailingAddressField(record);
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
  if (includeCompoundFields.mailingAddress) {
    columns.push('mailingAddress');
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
  record: EnrichedPartialVoterRecordAPI,
  field: string
): string | number | Date | null | undefined | unknown {
  if (field === 'name') {
    return record.name || createCompoundNameField(record);
  }
  if (field === 'address') {
    return record.address || createCompoundAddressField(record);
  }
  if (field === 'mailingAddress') {
    return record.mailingAddress || createCompoundMailingAddressField(record);
  }

  const value = record[field as keyof EnrichedPartialVoterRecordAPI];
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
    console.warn('Skipping voter record with invalid VRCNUM:');
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

  if (compoundFieldConfig.mailingAddress) {
    fieldsToInclude.add('mailingAddress1');
    fieldsToInclude.add('mailingAddress2');
    fieldsToInclude.add('mailingAddress3');
    fieldsToInclude.add('mailingAddress4');
    fieldsToInclude.add('mailingCity');
    fieldsToInclude.add('mailingState');
    fieldsToInclude.add('mailingZip');
    fieldsToInclude.add('mailingZipSuffix');
  }

  // Always include VRCNUM as it's required
  fieldsToInclude.add('VRCNUM');

  // Create filtered member object with only the required fields
  const member: PartialVoterRecordAPI = {};

  fieldsToInclude.forEach((field) => {
    if (field in voter) {
      (member as Record<string, any>)[field] =
        voter[field as keyof VoterRecordAPI];
    }
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
