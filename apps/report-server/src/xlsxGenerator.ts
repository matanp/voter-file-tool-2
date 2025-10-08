import * as XLSX from 'xlsx';
import {
  type VoterRecordField,
  type LDCommitteesArrayWithFields,
  type PartialVoterRecordAPI,
  determineColumnsToInclude,
  extractFieldValue,
  applyCompoundFields,
  type CompoundFieldConfig,
} from '@voter-file-tool/shared-validators';
import {
  sanitizeWorksheetName,
  uploadXLSXBuffer,
  createWorksheetWithFieldWidths,
  generateXLSXBuffer,
  createWorkbook,
  addWorksheetToWorkbook,
} from './utils/xlsxUtils';

type ColumnHeaders = Record<string, string>;
type FieldWidths = Record<string, number>;

// XLSX generation configuration
export interface XLSXGenerationConfig {
  // Fields to include from VoterRecord
  selectedFields?: VoterRecordField[];
  // Whether to include compound name and address fields
  includeCompoundFields?: CompoundFieldConfig;
  // Column order (if not specified, uses default order)
  columnOrder?: string[];
  // Custom column headers (if not specified, uses field names)
  columnHeaders?: ColumnHeaders;
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
  'countyLegDistrict',
  'stateAssemblyDistrict',
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
const FIELD_WIDTHS: FieldWidths = {
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

/**
 * Creates a worksheet with headers and data
 * @param data - Array of data rows
 * @param columnsToInclude - Array of column names to include
 * @param columnHeaders - Mapping of column names to display headers
 * @returns XLSX worksheet object
 */
function createWorksheet(
  data: any[][],
  columnsToInclude: string[],
  columnHeaders: ColumnHeaders
): XLSX.WorkSheet {
  return createWorksheetWithFieldWidths(data, columnsToInclude, FIELD_WIDTHS);
}

/**
 * Unified XLSX generation function that handles both LD committees and voter lists
 * @param data - The data to process (either LDCommitteesArrayWithFields or PartialVoterRecordAPI[])
 * @param fileName - The filename for the generated XLSX
 * @param config - XLSX generation configuration
 * @param dataType - Type of data being processed ('ldCommittees' or 'voterList')
 * @returns Promise<void>
 */
export async function generateUnifiedXLSXAndUpload(
  data: LDCommitteesArrayWithFields | PartialVoterRecordAPI[],
  fileName: string,
  config: XLSXGenerationConfig = {},
  dataType: 'ldCommittees' | 'voterList'
): Promise<void> {
  console.log(`generating ${dataType} xlsx with config:`, config);

  const {
    selectedFields = [],
    includeCompoundFields = { name: true, address: true },
    columnOrder = DEFAULT_COLUMN_ORDER,
    columnHeaders = DEFAULT_COLUMN_HEADERS,
  } = config;

  const workbook = createWorkbook();

  if (dataType === 'ldCommittees') {
    // Process LD committees data
    const groupedCommittees = data as LDCommitteesArrayWithFields;

    for (const ld of groupedCommittees) {
      const worksheetData: any[] = [];

      const columnsToInclude = determineColumnsToInclude(
        selectedFields,
        includeCompoundFields,
        columnOrder
      );

      const headers = columnsToInclude.map(
        (field) => columnHeaders[field] || field
      );
      worksheetData.push(headers);

      for (const [electionDistrict, members] of Object.entries(ld.committees)) {
        for (const member of members) {
          const rowData = columnsToInclude.map((field) => {
            if (field === 'electionDistrict') {
              return electionDistrict.padStart(3, '0');
            }
            return extractFieldValue(member, field);
          });
          worksheetData.push(rowData);
        }
      }

      const worksheet = createWorksheet(
        worksheetData,
        columnsToInclude,
        columnHeaders
      );

      const rawSheetName =
        ld.cityTown === 'ROCHESTER'
          ? `LD ${ld.legDistrict.toString().padStart(2, '0')}`
          : ld.cityTown;
      const sheetName = sanitizeWorksheetName(rawSheetName);
      addWorksheetToWorkbook(workbook, worksheet, sheetName);
    }
  } else {
    // Process voter list data
    const voterRecords = data as PartialVoterRecordAPI[];
    const worksheetData: any[] = [];

    const columnsToInclude = determineColumnsToInclude(
      selectedFields,
      includeCompoundFields,
      columnOrder
    );

    const headers = columnsToInclude.map(
      (field) => columnHeaders[field] || field
    );
    worksheetData.push(headers);

    for (const record of voterRecords) {
      const recordWithCompoundFields = applyCompoundFields(
        record,
        includeCompoundFields
      );

      const rowData = columnsToInclude.map((field) => {
        return extractFieldValue(recordWithCompoundFields, field);
      });
      worksheetData.push(rowData);
    }

    const worksheet = createWorksheet(
      worksheetData,
      columnsToInclude,
      columnHeaders
    );
    const sheetName = sanitizeWorksheetName('Voter List');
    addWorksheetToWorkbook(workbook, worksheet, sheetName);
  }

  const xlsxBuffer = generateXLSXBuffer(workbook);
  await uploadXLSXBuffer(xlsxBuffer, fileName);
}

// Legacy functions - kept for backward compatibility
// These now delegate to the unified function to reduce code duplication
export async function generateXLSXAndUpload(
  groupedCommittees: LDCommitteesArrayWithFields,
  fileName: string,
  config: XLSXGenerationConfig = {}
): Promise<void> {
  await generateUnifiedXLSXAndUpload(
    groupedCommittees,
    fileName,
    config,
    'ldCommittees'
  );
}

export async function generateVoterListXLSXAndUpload(
  voterRecords: PartialVoterRecordAPI[],
  fileName: string,
  config: XLSXGenerationConfig = {}
): Promise<void> {
  await generateUnifiedXLSXAndUpload(
    voterRecords,
    fileName,
    config,
    'voterList'
  );
}
