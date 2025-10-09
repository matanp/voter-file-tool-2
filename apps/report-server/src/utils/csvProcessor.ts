// src/utils/csvProcessor.ts
// Purpose: Generic CSV processing utility to eliminate duplication across report processors

import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';

// Utility types for cleaner definitions
type CsvRow = Record<string, any>;
type RequiredConfig = Required<CsvProcessorConfig>;

export interface CsvLoadResult<T> {
  rows: T[];
  totalRecords: number;
  filePath: string;
}

export interface CsvProcessorConfig {
  skipEmptyLines?: boolean;
  trim?: boolean;
  validateHeaders?: boolean;
}

/**
 * Generic CSV processor that handles loading, parsing, and validation
 * @template T - The type of row objects to create
 */
export class CsvProcessor<T extends CsvRow> {
  private readonly headers: readonly string[];
  private readonly createEmptyRow: () => T;
  private readonly csvFilePath: string;
  private readonly config: RequiredConfig;

  constructor(
    csvFilePath: string,
    headers: readonly string[],
    createEmptyRow: () => T,
    config: CsvProcessorConfig = {}
  ) {
    this.csvFilePath = csvFilePath;
    this.headers = headers;
    this.createEmptyRow = createEmptyRow;
    this.config = {
      skipEmptyLines: true,
      trim: true,
      validateHeaders: true,
      ...config,
    };
  }

  /**
   * Loads and validates CSV data from the configured file path
   * @returns Promise<CsvLoadResult<T>> - Processed data with metadata
   */
  async loadData(): Promise<CsvLoadResult<T>> {
    try {
      console.log(`Loading CSV data from: ${this.csvFilePath}`);

      // Check if file exists and is readable
      const csvContent = await fs.readFile(this.csvFilePath, 'utf-8');

      if (!csvContent.trim()) {
        throw new Error('CSV file is empty');
      }

      // Parse CSV content
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: this.config.skipEmptyLines,
        trim: this.config.trim,
      });

      if (!records.length) {
        throw new Error('No records found in CSV file');
      }

      console.log(`Found ${records.length} records in CSV`);

      // Validate CSV structure if enabled
      if (this.config.validateHeaders) {
        this.validateCsvStructure(records[0] as Record<string, any>);
      }

      // Convert to typed rows
      const rows = this.convertToTypedRows(records as Record<string, any>[]);

      return {
        rows,
        totalRecords: rows.length,
        filePath: this.csvFilePath,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load CSV data: ${error.message}`);
      }
      throw new Error('Unknown error occurred while loading CSV data');
    }
  }

  /**
   * Validates that CSV has expected headers
   * @param firstRecord - First record from CSV to check headers
   */
  private validateCsvStructure(firstRecord: CsvRow): void {
    const csvHeaders = Object.keys(firstRecord);
    const missingHeaders = this.headers.filter(
      (header) => !csvHeaders.includes(header)
    );

    if (missingHeaders.length > 0) {
      throw new Error(
        `CSV file is missing required headers: ${missingHeaders.join(', ')}`
      );
    }

    console.log('CSV structure validation passed');
  }

  /**
   * Converts raw CSV records to typed rows
   * @param records - Raw CSV records
   * @returns Array of typed row objects
   */
  private convertToTypedRows(records: CsvRow[]): T[] {
    return records.map((record, index) => {
      try {
        const row = this.createEmptyRow();

        // Map CSV columns to typed row
        for (const [key, value] of Object.entries(record)) {
          if (key in row) {
            (row as any)[key] = value ?? '';
          }
        }

        return row;
      } catch (error) {
        throw new Error(`Failed to convert record at index ${index}: ${error}`);
      }
    });
  }
}

/**
 * Convenience function to create a CSV processor for a specific type
 * @param csvFilePath - Path to the CSV file
 * @param headers - Required CSV headers
 * @param createEmptyRow - Function to create empty row instance
 * @param config - Optional configuration
 * @returns Configured CSV processor instance
 */
export function createCsvProcessor<T extends CsvRow>(
  csvFilePath: string,
  headers: readonly string[],
  createEmptyRow: () => T,
  config?: CsvProcessorConfig
): CsvProcessor<T> {
  return new CsvProcessor(csvFilePath, headers, createEmptyRow, config);
}
