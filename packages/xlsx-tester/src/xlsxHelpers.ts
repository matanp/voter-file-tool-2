import * as XLSX from 'xlsx';

export interface XlsxFileInfo {
  rows: number;
  columns: number;
  headers: string[];
  firstTenRows: any[][];
}

/**
 * Reads an XLSX file and returns the number of rows
 * @param filePath - Path to the XLSX file
 * @param sheetName - Optional sheet name (defaults to first sheet)
 * @returns Number of rows in the sheet
 */
export function getRowCount(filePath: string, sheetName?: string): number {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
    }

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    return range.e.r + 1; // +1 because range is 0-indexed
  } catch (error) {
    throw new Error(
      `Failed to get row count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reads an XLSX file and returns the number of columns
 * @param filePath - Path to the XLSX file
 * @param sheetName - Optional sheet name (defaults to first sheet)
 * @returns Number of columns in the sheet
 */
export function getColumnCount(filePath: string, sheetName?: string): number {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
    }

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    return range.e.c + 1; // +1 because range is 0-indexed
  } catch (error) {
    throw new Error(
      `Failed to get column count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reads an XLSX file and returns the headers (first row)
 * @param filePath - Path to the XLSX file
 * @param sheetName - Optional sheet name (defaults to first sheet)
 * @returns Array of header strings
 */
export function getHeaders(filePath: string, sheetName?: string): string[] {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
    }

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const headers: string[] = [];

    // Get the first row (row 0)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = sheet[cellAddress];
      headers.push(cell ? String(cell.v || '') : '');
    }

    return headers;
  } catch (error) {
    throw new Error(
      `Failed to get headers: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reads an XLSX file and returns the first 10 rows of data (excluding headers)
 * @param filePath - Path to the XLSX file
 * @param sheetName - Optional sheet name (defaults to first sheet)
 * @returns Array of arrays representing the first 10 data rows
 */
export function getFirstTenRows(filePath: string, sheetName?: string): any[][] {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
    }

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const dataRows: any[][] = [];

    // Get rows 1-10 (skipping header row 0)
    const maxRows = Math.min(10, range.e.r);
    for (let row = 1; row <= maxRows; row++) {
      const rowData: any[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        rowData.push(cell ? cell.v : '');
      }
      dataRows.push(rowData);
    }

    return dataRows;
  } catch (error) {
    throw new Error(
      `Failed to get first ten rows: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reads an XLSX file and returns comprehensive information
 * @param filePath - Path to the XLSX file
 * @param sheetName - Optional sheet name (defaults to first sheet)
 * @returns Object containing rows, columns, headers, and first 10 rows
 */
export function getFileInfo(
  filePath: string,
  sheetName?: string
): XlsxFileInfo {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
    }

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rows = range.e.r + 1;
    const columns = range.e.c + 1;

    // Get headers
    const headers: string[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = sheet[cellAddress];
      headers.push(cell ? String(cell.v || '') : '');
    }

    // Get first 10 data rows
    const firstTenRows: any[][] = [];
    const maxRows = Math.min(10, range.e.r);
    for (let row = 1; row <= maxRows; row++) {
      const rowData: any[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        rowData.push(cell ? cell.v : '');
      }
      firstTenRows.push(rowData);
    }

    return {
      rows,
      columns,
      headers,
      firstTenRows,
    };
  } catch (error) {
    throw new Error(
      `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Lists all sheet names in an XLSX file
 * @param filePath - Path to the XLSX file
 * @returns Array of sheet names
 */
export function getSheetNames(filePath: string): string[] {
  try {
    const workbook = XLSX.readFile(filePath);
    return workbook.SheetNames;
  } catch (error) {
    throw new Error(
      `Failed to get sheet names: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
