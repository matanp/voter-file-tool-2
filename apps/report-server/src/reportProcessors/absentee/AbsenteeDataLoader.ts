// src/reportProcessors/absentee/AbsenteeDataLoader.ts
// Purpose: Handle CSV file loading and validation for absentee reports using generic CSV processor

import {
  AbsenteeStandardBallotRequestRow,
  createEmptyAbsenteeStandardBallotRequestRow,
  ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS,
} from '../../reportTypes/absenteeStandardBallotRequest';
import { CsvProcessor } from '../../utils/csvProcessor';
import { downloadFileFromR2 } from '../../s3Utils';

export interface AbsenteeDataLoadResult {
  rows: AbsenteeStandardBallotRequestRow[];
  totalRecords: number;
  filePath: string;
}

export class AbsenteeDataLoader {
  constructor(private csvFileKey: string) {}

  /**
   * Loads and validates CSV data for absentee report processing
   */
  async loadData(): Promise<AbsenteeDataLoadResult> {
    const csvBuffer = await downloadFileFromR2(this.csvFileKey);

    const csvContent = csvBuffer.toString('utf-8');

    const csvProcessor = new CsvProcessor(
      csvContent,
      ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS,
      createEmptyAbsenteeStandardBallotRequestRow
    );

    const result = await csvProcessor.loadData();

    return {
      rows: result.rows,
      totalRecords: result.totalRecords,
      filePath: this.csvFileKey,
    };
  }
}
