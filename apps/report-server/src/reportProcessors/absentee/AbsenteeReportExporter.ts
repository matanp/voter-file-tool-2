// src/reportProcessors/absentee/AbsenteeReportExporter.ts
// Purpose: Export absentee statistics to XLSX format

import * as XLSX from 'xlsx';
import { AbsenteeStatisticsResult } from './AbsenteeStatisticsCalculator';
import { PARTY_TYPES } from '../../reportTypes/wardTownMapping';
import {
  sanitizeWorksheetName,
  uploadXLSXBuffer,
  createWorksheet,
  generateXLSXBuffer,
  createWorkbook,
  addWorksheetToWorkbook,
} from '../../utils/xlsxUtils';

// Configuration interfaces for sheet creation
interface SheetConfig {
  title?: string;
  headers: string[];
  data: any[][];
  columnWidths: number[];
}

interface PartySheetConfig extends SheetConfig {
  includePartyColumns: boolean;
  partyColumnCount?: number; // Number of party columns per party (default: 4 for Req, Sent, Ret, %)
}

export class AbsenteeReportExporter {
  /**
   * Generic method to create worksheets with consistent formatting
   */
  private createGenericSheet(config: SheetConfig): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add title if provided
    if (config.title) {
      data.push([config.title]);
      data.push([]); // Empty row for spacing
    }

    // Add headers
    data.push(config.headers);

    // Add data rows
    data.push(...config.data);

    return createWorksheet(data, config.columnWidths);
  }

  /**
   * Generic method to create party-based worksheets with consistent formatting
   */
  private createPartySheet(config: PartySheetConfig): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add title if provided
    if (config.title) {
      data.push([config.title]);
      data.push([]); // Empty row for spacing
    }

    // Create headers
    const headers = [...config.headers];

    // Add party column headers if requested
    if (config.includePartyColumns) {
      const partyColumnCount = config.partyColumnCount ?? 4;
      for (const party of PARTY_TYPES) {
        if (partyColumnCount === 4) {
          headers.push(`${party} Req`);
          headers.push(`${party} Sent`);
          headers.push(`${party} Ret`);
          headers.push(`${party} %`);
        } else if (partyColumnCount === 3) {
          headers.push(`${party} Req`);
          headers.push(`${party} Ret`);
          headers.push(`${party} %`);
        }
      }
    }

    data.push(headers);
    data.push(...config.data);

    // Create column widths
    const columnWidths = [...config.columnWidths];

    // Add widths for party columns if requested
    if (config.includePartyColumns) {
      const partyColumnCount = config.partyColumnCount ?? 4;
      for (const party of PARTY_TYPES) {
        for (let i = 0; i < partyColumnCount; i++) {
          columnWidths.push(10); // Standard party column width
        }
      }
    }

    return createWorksheet(data, columnWidths);
  }

  /**
   * Exports absentee statistics to XLSX format and uploads to S3
   */
  async exportToXLSX(
    statistics: AbsenteeStatisticsResult,
    fileName: string,
    originalCsvFileName?: string
  ): Promise<void> {
    try {
      console.log('Converting statistics to XLSX format...');

      // Create workbook with multiple sheets
      const workbook = createWorkbook();

      // Create diagnostics sheet
      const diagnosticsSheet = this.createDiagnosticsSheet(
        statistics,
        fileName,
        originalCsvFileName
      );
      addWorksheetToWorkbook(
        workbook,
        diagnosticsSheet,
        sanitizeWorksheetName('Diagnostics')
      );

      // Create ward/town details sheet
      const wardTownSheet = this.createWardTownSheet(statistics);
      addWorksheetToWorkbook(
        workbook,
        wardTownSheet,
        sanitizeWorksheetName('Ward/Town Details')
      );

      // Create delivery method details sheet
      const deliveryMethodSheet = this.createDeliveryMethodSheet(statistics);
      addWorksheetToWorkbook(
        workbook,
        deliveryMethodSheet,
        sanitizeWorksheetName('Delivery Method Details')
      );

      // Create State Senate details sheet
      const stSenSheet = this.createStSenSheet(statistics);
      addWorksheetToWorkbook(
        workbook,
        stSenSheet,
        sanitizeWorksheetName('State Senate Details')
      );

      // Create State Legislature details sheet
      const stLegSheet = this.createStLegSheet(statistics);
      addWorksheetToWorkbook(
        workbook,
        stLegSheet,
        sanitizeWorksheetName('State Legislature Details')
      );

      // Create County Legislature details sheet
      const countyLegSheet = this.createCountyLegSheet(statistics);
      addWorksheetToWorkbook(
        workbook,
        countyLegSheet,
        sanitizeWorksheetName('County Legislature Details')
      );

      // Create Daily Return Curve sheet
      const dailyReturnCurveSheet =
        this.createDailyReturnCurveSheet(statistics);
      addWorksheetToWorkbook(
        workbook,
        dailyReturnCurveSheet,
        sanitizeWorksheetName('Daily Return Curve')
      );

      // Generate buffer and upload
      const buffer = generateXLSXBuffer(workbook);
      await uploadXLSXBuffer(buffer, fileName);

      console.log('XLSX export completed successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to export to XLSX: ${error.message}`);
      }
      throw new Error('Unknown error occurred while exporting to XLSX');
    }
  }

  /**
   * Creates the diagnostics sheet with processing metrics and universe totals
   */
  private createDiagnosticsSheet(
    statistics: AbsenteeStatisticsResult,
    fileName: string,
    originalCsvFileName?: string
  ): XLSX.WorkSheet {
    // Use original CSV filename if available, otherwise fall back to Excel filename
    const sourceFileName = originalCsvFileName
      ? (originalCsvFileName.split('/').pop() ?? originalCsvFileName)
      : (fileName.split('/').pop() ?? fileName);

    const data: any[][] = [
      ['Diagnostics'],
      ['Metric', 'Value'],
      ['Data Tab', 'ALL Countywide'],
      ['Source File', sourceFileName],
      ['Raw Rows Read', statistics.totalRecords.toString()],
      ['Rows After Dedupe', statistics.totalRecords.toString()],
      ['Rows After Filters', statistics.totalRecords.toString()],
      ['Elapsed (ms) to diagnostics', '0'],
      [], // Empty row for spacing
      ['Universe Totals'],
      ['Metric', 'Value'],
      [
        'Requested (filtered universe)',
        statistics.summaryMetrics.requested.toString(),
      ],
      [
        'Ballots Sent (have date)',
        statistics.summaryMetrics.ballotsSent.toString(),
      ],
      [
        'Ballots Returned (date/status)',
        statistics.summaryMetrics.ballotsReturned.toString(),
      ],
      ['Return Rate', `${statistics.summaryMetrics.returnRate}%`],
    ];

    return this.createGenericSheet({
      headers: [], // Headers are already in the data
      data,
      columnWidths: [30, 15],
    });
  }

  /**
   * Creates the ward/town details sheet with party breakdown
   */
  private createWardTownSheet(
    statistics: AbsenteeStatisticsResult
  ): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add detailed ward/town statistics
    for (const stat of statistics.statistics) {
      const row = [
        stat.wardTownId,
        stat.requested,
        stat.ballotsSent,
        stat.returned,
        `${stat.returnPercentage}%`,
      ];

      // Add party-specific statistics (Req, Sent, Ret, % for each party)
      for (const party of PARTY_TYPES) {
        const partyStat = stat.partyStats[party];
        row.push(partyStat.requested);
        row.push(partyStat.ballotsSent);
        row.push(partyStat.returned);
        row.push(`${partyStat.percentage}%`);
      }

      data.push(row);
    }

    return this.createPartySheet({
      headers: [
        'Ward / Town',
        'Requested',
        'Ballots Sent',
        'Returned',
        'Return %',
      ],
      data,
      columnWidths: [20, 12, 12, 12, 12], // Base columns
      includePartyColumns: true,
      partyColumnCount: 4,
    });
  }

  /**
   * Creates the delivery method details sheet with party breakdown
   */
  private createDeliveryMethodSheet(
    statistics: AbsenteeStatisticsResult
  ): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add detailed delivery method statistics
    for (const stat of statistics.deliveryMethodStatistics) {
      const row = [
        stat.deliveryMethod,
        stat.requested,
        stat.returned,
        `${stat.returnPercentage}%`,
      ];

      // Add party-specific statistics (Req, Ret, % for each party)
      for (const party of PARTY_TYPES) {
        const partyStat = stat.partyStats[party];
        row.push(partyStat.requested);
        row.push(partyStat.returned);
        row.push(`${partyStat.percentage}%`);
      }

      data.push(row);
    }

    return this.createPartySheet({
      title: 'Delivery Method — Requested, Returned & Party Detail',
      headers: ['Delivery Method', 'Requested', 'Returned', 'Return %'],
      data,
      columnWidths: [20, 12, 12, 12], // Base columns
      includePartyColumns: true,
      partyColumnCount: 3,
    });
  }

  /**
   * Creates the State Senate district details sheet with party breakdown
   */
  private createStSenSheet(
    statistics: AbsenteeStatisticsResult
  ): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add detailed State Senate statistics
    for (const stat of statistics.stSenStatistics) {
      const row = [
        stat.stSen,
        stat.requested,
        stat.returned,
        `${stat.returnPercentage}%`,
      ];

      // Add party-specific statistics (Req, Ret, % for each party)
      for (const party of PARTY_TYPES) {
        const partyStat = stat.partyStats[party];
        row.push(partyStat.requested);
        row.push(partyStat.returned);
        row.push(`${partyStat.percentage}%`);
      }

      data.push(row);
    }

    return this.createPartySheet({
      title: 'State Senate — Requested, Returned & Party Detail',
      headers: ['St.Sen', 'Requested', 'Returned', 'Return %'],
      data,
      columnWidths: [15, 12, 12, 12], // Base columns
      includePartyColumns: true,
      partyColumnCount: 3,
    });
  }

  /**
   * Creates the State Legislature district details sheet with party breakdown
   */
  private createStLegSheet(
    statistics: AbsenteeStatisticsResult
  ): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add detailed State Legislature statistics
    for (const stat of statistics.stLegStatistics) {
      const row = [
        stat.stLeg,
        stat.requested,
        stat.returned,
        `${stat.returnPercentage}%`,
      ];

      // Add party-specific statistics (Req, Ret, % for each party)
      for (const party of PARTY_TYPES) {
        const partyStat = stat.partyStats[party];
        row.push(partyStat.requested);
        row.push(partyStat.returned);
        row.push(`${partyStat.percentage}%`);
      }

      data.push(row);
    }

    return this.createPartySheet({
      title: 'State Legislature — Requested, Returned & Party Detail',
      headers: ['St.Leg', 'Requested', 'Returned', 'Return %'],
      data,
      columnWidths: [15, 12, 12, 12], // Base columns
      includePartyColumns: true,
      partyColumnCount: 3,
    });
  }

  /**
   * Creates the County Legislature district details sheet with party breakdown
   */
  private createCountyLegSheet(
    statistics: AbsenteeStatisticsResult
  ): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add detailed County Legislature statistics
    for (const stat of statistics.countyLegStatistics) {
      const row = [
        stat.countyLeg,
        stat.requested,
        stat.returned,
        `${stat.returnPercentage}%`,
      ];

      // Add party-specific statistics (Req, Ret, % for each party)
      for (const party of PARTY_TYPES) {
        const partyStat = stat.partyStats[party];
        row.push(partyStat.requested);
        row.push(partyStat.returned);
        row.push(`${partyStat.percentage}%`);
      }

      data.push(row);
    }

    return this.createPartySheet({
      title: 'County Legislature — Requested, Returned & Party Detail',
      headers: ['County Leg', 'Requested', 'Returned', 'Return %'],
      data,
      columnWidths: [15, 12, 12, 12], // Base columns
      includePartyColumns: true,
      partyColumnCount: 3,
    });
  }

  /**
   * Creates the daily return curve sheet showing ballot returns by date with party breakdown
   */
  private createDailyReturnCurveSheet(
    statistics: AbsenteeStatisticsResult
  ): XLSX.WorkSheet {
    const data: any[][] = [];

    // Add daily return curve data with party breakdown
    for (const day of statistics.dailyReturnCurve) {
      const row = [day.date, day.returned, day.cumulative];

      // Add party-specific returned and cumulative columns for each party
      for (const party of PARTY_TYPES) {
        row.push(day.partyBreakdown.returned[party]);
        row.push(day.partyBreakdown.cumulative[party]);
      }

      data.push(row);
    }

    // Create headers for party breakdown columns
    const headers = ['Date', 'Returned', 'Cumulative'];
    for (const party of PARTY_TYPES) {
      headers.push(`${party} Returned`);
      headers.push(`${party} Cumulative`);
    }

    // Create column widths (base columns + party columns)
    const columnWidths = [15, 12, 12]; // Base columns
    for (const party of PARTY_TYPES) {
      columnWidths.push(12, 12); // Party returned and cumulative columns
    }

    return this.createGenericSheet({
      title: 'Daily Return Curve',
      headers,
      data,
      columnWidths,
    });
  }

  /**
   * Gets export metadata for logging/debugging
   */
  getExportMetadata(statistics: AbsenteeStatisticsResult): {
    totalRecords: number;
    wardTownCount: number;
    deliveryMethodCount: number;
    stSenCount: number;
    stLegCount: number;
    countyLegCount: number;
    columnCount: number;
  } {
    const columnCount = 5 + PARTY_TYPES.length * 4; // Base columns (5) + party columns (4 each)

    return {
      totalRecords: statistics.totalRecords,
      wardTownCount: statistics.wardTownCount,
      deliveryMethodCount: statistics.deliveryMethodCount,
      stSenCount: statistics.stSenCount,
      stLegCount: statistics.stLegCount,
      countyLegCount: statistics.countyLegCount,
      columnCount,
    };
  }
}
