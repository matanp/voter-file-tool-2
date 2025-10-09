// src/reportProcessors/absenteeReportProcessor.ts
// Purpose: Process absentee ward/town reports by analyzing CSV data and generating XLSX

import {
  AbsenteeDataLoader,
  AbsenteeStatisticsCalculator,
  AbsenteeReportExporter,
} from './absentee';

/**
 * Processes absentee ward/town report by analyzing CSV data and generating XLSX
 * @param fileName - The output filename for the XLSX report
 * @param jobId - The job ID for tracking
 * @param csvFileKey - R2 file key for the CSV file
 */
export async function processAbsenteeReport(
  fileName: string,
  jobId: string,
  csvFileKey: string
): Promise<void> {
  console.log(`Starting absentee report processing for job ${jobId}...`);

  try {
    // Step 1: Load and validate data
    const dataLoader = new AbsenteeDataLoader(csvFileKey);
    const dataResult = await dataLoader.loadData();
    console.log(
      `Data loaded: ${dataResult.totalRecords} records from ${dataResult.filePath}`
    );

    // Step 2: Calculate statistics
    const statisticsCalculator = new AbsenteeStatisticsCalculator();
    const statistics = statisticsCalculator.calculateStatistics(
      dataResult.rows
    );
    const summary = statisticsCalculator.getSummaryStatistics(statistics);

    console.log('Statistics calculated:', {
      totalRequested: summary.totalRequested,
      totalReturned: summary.totalReturned,
      overallReturnPercentage: summary.overallReturnPercentage,
      wardTownCount: summary.wardTownCount,
    });

    // Step 3: Export to XLSX
    const reportExporter = new AbsenteeReportExporter();
    await reportExporter.exportToXLSX(statistics, fileName, csvFileKey);

    const exportMetadata = reportExporter.getExportMetadata(statistics);
    console.log('Export completed:', exportMetadata);

    console.log(
      `Absentee report processing completed successfully for job ${jobId}`
    );
  } catch (error) {
    console.error(`Error processing absentee report for job ${jobId}:`, error);
    throw error;
  }
}
