// src/utils/xlsxUtils.ts
// Purpose: Shared XLSX utilities to eliminate duplication between xlsxGenerator.ts and AbsenteeReportExporter.ts

import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { uploadFileToR2 } from '../s3Utils';

/**
 * Sanitizes worksheet names for Excel compatibility
 * Excel limits worksheet names to 31 characters and disallows: / \ ? * [ ]
 * @param name - The original worksheet name
 * @returns Sanitized worksheet name that meets Excel requirements
 */
export function sanitizeWorksheetName(name: string): string {
  // Remove or replace disallowed characters
  let sanitized = name.replace(/[/\\?*[\]]/g, '');

  // Truncate to 31 characters (Excel's limit)
  if (sanitized.length > 31) {
    sanitized = sanitized.substring(0, 31);
  }

  // Ensure the name is not empty after sanitization
  if (!sanitized.trim()) {
    sanitized = 'Sheet';
  }

  return sanitized;
}

/**
 * Uploads XLSX buffer to R2 storage
 * @param buffer - The XLSX file buffer
 * @param fileName - The filename for the upload
 * @returns Promise<void> - Throws on failure
 */
export async function uploadXLSXBuffer(
  buffer: Buffer,
  fileName: string
): Promise<void> {
  console.log('Starting XLSX upload...');

  const stream = Readable.from(buffer);
  const successfulUpload = await uploadFileToR2(stream, fileName, 'xlsx');

  if (!successfulUpload) {
    throw new Error('Failed to upload XLSX to file storage');
  }

  console.log('XLSX upload completed successfully');
}

/**
 * Creates a worksheet with headers and data
 * @param data - Array of data rows
 * @param columnWidths - Array of column widths (optional)
 * @returns XLSX worksheet object
 */
export function createWorksheet(
  data: any[][],
  columnWidths?: number[]
): XLSX.WorkSheet {
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths if provided
  if (columnWidths) {
    worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
  }

  return worksheet;
}

/**
 * Creates a worksheet with field-based column widths
 * @param data - Array of data rows
 * @param columnsToInclude - Array of column names to include
 * @param fieldWidths - Mapping of field names to widths
 * @returns XLSX worksheet object
 */
export function createWorksheetWithFieldWidths(
  data: any[][],
  columnsToInclude: string[],
  fieldWidths: Record<string, number>
): XLSX.WorkSheet {
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths based on field mapping
  const columnWidths = columnsToInclude.map((field) => ({
    wch: fieldWidths[field] || 15,
  }));
  worksheet['!cols'] = columnWidths;

  return worksheet;
}

/**
 * Generates XLSX buffer from workbook
 * @param workbook - The XLSX workbook
 * @returns Buffer containing the XLSX file
 */
export function generateXLSXBuffer(workbook: XLSX.WorkBook): Buffer {
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Creates a new XLSX workbook
 * @returns Empty XLSX workbook
 */
export function createWorkbook(): XLSX.WorkBook {
  return XLSX.utils.book_new();
}

/**
 * Adds a worksheet to a workbook
 * @param workbook - The workbook to add to
 * @param worksheet - The worksheet to add
 * @param sheetName - The name for the worksheet
 */
export function addWorksheetToWorkbook(
  workbook: XLSX.WorkBook,
  worksheet: XLSX.WorkSheet,
  sheetName: string
): void {
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sanitizeWorksheetName(sheetName)
  );
}

/**
 * Complete XLSX generation and upload pipeline
 * @param workbook - The XLSX workbook
 * @param fileName - The filename for upload
 * @returns Promise<void> - Throws on failure
 */
export async function generateAndUploadXLSX(
  workbook: XLSX.WorkBook,
  fileName: string
): Promise<void> {
  const buffer = generateXLSXBuffer(workbook);
  await uploadXLSXBuffer(buffer, fileName);
}
