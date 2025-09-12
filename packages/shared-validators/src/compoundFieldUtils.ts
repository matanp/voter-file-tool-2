import type { VoterRecordField } from './schemas/ldCommittees';

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

// Interface for objects that can have compound fields applied
export interface CompoundFieldTarget {
  [key: string]: any;
}

/**
 * Creates a compound name field from individual name components
 */
export function createCompoundNameField(record: any): string {
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
export function createCompoundAddressField(record: any): string {
  const houseNum = record.houseNum || '';
  const street = record.street || '';
  const apartment = record.apartment || '';
  const halfAddress = record.halfAddress || '';
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
  if (halfAddress) addressParts.push(halfAddress);
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
  record: any,
  config: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG
): any {
  const result = { ...record };

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

  // Add selected VoterRecord fields
  selectedFields.forEach((field) => {
    if (!columns.includes(field)) {
      columns.push(field);
    }
  });

  // Apply column ordering if provided
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
export function extractFieldValue(record: any, field: string): any {
  // Handle compound fields
  if (field === 'name') {
    return record.name || createCompoundNameField(record);
  }
  if (field === 'address') {
    return record.address || createCompoundAddressField(record);
  }

  // Handle individual VoterRecord fields
  const value = record[field];
  return value !== undefined && value !== null ? value : '';
}

/**
 * Maps a VoterRecord to a member object with compound fields applied
 */
export function mapVoterRecordToMemberWithFields(
  voter: any,
  includeFields: VoterRecordField[] = [],
  compoundFieldConfig: CompoundFieldConfig = DEFAULT_COMPOUND_FIELD_CONFIG
): any {
  const member: any = {};

  // Apply compound fields if requested
  if (compoundFieldConfig.name) {
    member.name = createCompoundNameField(voter);
  }
  if (compoundFieldConfig.address) {
    member.address = createCompoundAddressField(voter);
  }

  // Add selected individual fields
  includeFields.forEach((field) => {
    // Compound fields are handled separately, so we can safely add all fields
    member[field] = voter[field];
  });

  return member;
}
