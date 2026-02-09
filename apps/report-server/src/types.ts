// src/types.ts
// Purpose: Shared type definitions for report-server worksheet data

/** A single cell value in an XLSX worksheet */
export type WorksheetCell = string | number | boolean | null | undefined;

/** A single row in an XLSX worksheet */
export type WorksheetRow = WorksheetCell[];

/** A 2D array of worksheet data (rows of cells) */
export type WorksheetData = WorksheetRow[];
