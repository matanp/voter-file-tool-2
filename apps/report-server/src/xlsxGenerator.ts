import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import {
  type VoterRecordField,
  type LDCommitteesArrayWithFields,
} from '@voter-file-tool/shared-validators';
import { uploadFileToR2 } from './s3Utils';

// XLSX generation configuration
export interface XLSXGenerationConfig {
  // Fields to include from VoterRecord
  selectedFields?: VoterRecordField[];
  // Whether to include compound name and address fields
  includeCompoundFields?: {
    name?: boolean;
    address?: boolean;
  };
  // Column order (if not specified, uses default order)
  columnOrder?: string[];
  // Custom column headers (if not specified, uses field names)
  columnHeaders?: Record<string, string>;
}

// Default column order and headers
const DEFAULT_COLUMN_ORDER = [
  'electionDistrict',
  'name',
  'address',
  'VRCNUM',
  'firstName',
  'lastName',
  'middleInitial',
  'suffixName',
  'houseNum',
  'street',
  'apartment',
  'city',
  'state',
  'zipCode',
  'telephone',
  'email',
  'party',
  'gender',
  'DOB',
  'electionDistrict',
  'countyLegDistrict',
  'stateAssmblyDistrict',
  'stateSenateDistrict',
  'congressionalDistrict',
  'originalRegDate',
  'addressForCommittee',
];

const DEFAULT_COLUMN_HEADERS: Record<string, string> = {
  electionDistrict: 'Election District',
  name: 'Name',
  address: 'Address',
  VRCNUM: 'Voter Registration Number',
  firstName: 'First Name',
  lastName: 'Last Name',
  middleInitial: 'Middle Initial',
  suffixName: 'Suffix Name',
  houseNum: 'House Number',
  street: 'Street',
  apartment: 'Apartment',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  telephone: 'Phone',
  email: 'Email',
  party: 'Political Party',
  gender: 'Gender',
  DOB: 'Date of Birth',
  countyLegDistrict: 'County Legislative District',
  stateAssmblyDistrict: 'State Assembly District',
  stateSenateDistrict: 'State Senate District',
  congressionalDistrict: 'Congressional District',
  originalRegDate: 'Original Registration Date',
  addressForCommittee: 'Address for Committee',
};

// Field width configuration
const FIELD_WIDTHS: Record<string, number> = {
  electionDistrict: 15,
  name: 25,
  address: 30,
  VRCNUM: 20,
  firstName: 20,
  lastName: 20,
  middleInitial: 5,
  suffixName: 10,
  houseNum: 10,
  street: 25,
  apartment: 15,
  city: 20,
  state: 8,
  zipCode: 10,
  telephone: 15,
  email: 30,
  party: 15,
  gender: 8,
  DOB: 12,
  countyLegDistrict: 20,
  stateAssmblyDistrict: 20,
  stateSenateDistrict: 20,
  congressionalDistrict: 20,
  originalRegDate: 12,
  addressForCommittee: 30,
};

export async function generateXLSXAndUpload(
  groupedCommittees: LDCommitteesArrayWithFields,
  fileName: string,
  config: XLSXGenerationConfig = {}
): Promise<void> {
  console.log('generating xlsx with config:', config);

  const {
    selectedFields = [],
    includeCompoundFields = { name: true, address: true },
    columnOrder = DEFAULT_COLUMN_ORDER,
    columnHeaders = DEFAULT_COLUMN_HEADERS,
  } = config;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Process each legislative district
  for (const ld of groupedCommittees) {
    const worksheetData: any[] = [];

    // Determine which columns to include
    const columnsToInclude = determineColumnsToInclude(
      selectedFields,
      includeCompoundFields,
      columnOrder
    );

    // Add header row
    const headers = columnsToInclude.map(
      (field) => columnHeaders[field] || field
    );
    worksheetData.push(headers);

    // Add committee members data
    for (const [electionDistrict, members] of Object.entries(ld.committees)) {
      for (const member of members) {
        const rowData = columnsToInclude.map((field) => {
          if (field === 'electionDistrict') {
            return electionDistrict.padStart(3, '0');
          }

          // Handle compound fields
          if (field === 'name') {
            return member.name || '';
          }
          if (field === 'address') {
            return member.address || '';
          }

          // Handle individual VoterRecord fields
          const value = (member as any)[field];
          return value !== undefined && value !== null ? value : '';
        });

        worksheetData.push(rowData);
      }
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = columnsToInclude.map((field) => ({
      wch: FIELD_WIDTHS[field] || 15,
    }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook with a descriptive name
    const sheetName =
      ld.cityTown === 'ROCHESTER'
        ? `LD ${ld.legDistrict.toString().padStart(2, '0')}`
        : ld.cityTown;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Generate XLSX buffer
  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  console.log('started upload via stream');

  // Convert buffer to stream and upload
  const stream = new Readable();
  stream.push(xlsxBuffer);
  stream.push(null);

  const successfulUpload = await uploadFileToR2(stream, fileName, 'xlsx');

  if (!successfulUpload) {
    throw new Error('failed to upload xlsx to file storage');
  }

  console.log('xlsx upload completed');
}

// Helper function to determine which columns to include
function determineColumnsToInclude(
  selectedFields: VoterRecordField[],
  includeCompoundFields: { name?: boolean; address?: boolean },
  columnOrder: string[]
): string[] {
  const columns: string[] = [];

  // Always include election district
  columns.push('electionDistrict');

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

  // Apply column ordering
  const orderedColumns = columnOrder.filter((col) => columns.includes(col));

  // Add any remaining columns that weren't in the order
  const remainingColumns = columns.filter((col) => !columnOrder.includes(col));

  return [...orderedColumns, ...remainingColumns];
}
