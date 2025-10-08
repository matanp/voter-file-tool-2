// src/reportProcessors/absentee/AbsenteeDataLoader.ts
// Purpose: Handle CSV file loading and validation for absentee reports using generic CSV processor

import {
  AbsenteeStandardBallotRequestRow,
  createEmptyAbsenteeStandardBallotRequestRow,
  ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS,
} from '../../reportTypes/absenteeStandardBallotRequest';
import { CsvProcessor } from '../../utils/csvProcessor';

export interface AbsenteeDataLoadResult {
  rows: AbsenteeStandardBallotRequestRow[];
  totalRecords: number;
  filePath: string;
}

export class AbsenteeDataLoader {
  private readonly csvProcessor: CsvProcessor<AbsenteeStandardBallotRequestRow>;
  private readonly csvFilePath: string;

  constructor(csvFilePath: string) {
    this.csvFilePath = csvFilePath;
    this.csvProcessor = new CsvProcessor(
      csvFilePath,
      ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS,
      createEmptyAbsenteeStandardBallotRequestRow
    );
  }

  /**
   * Loads and validates CSV data for absentee report processing
   */
  async loadData(): Promise<AbsenteeDataLoadResult> {
    const result = await this.csvProcessor.loadData();

    return {
      rows: result.rows,
      totalRecords: result.totalRecords,
      filePath: result.filePath,
    };
  }
}
