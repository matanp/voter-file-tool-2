// src/reportProcessors/absentee/AbsenteeStatisticsCalculator.ts
// Purpose: Calculate statistics from absentee ballot data using generic processor

import { AbsenteeStandardBallotRequestRow } from '../../reportTypes/absenteeStandardBallotRequest';
import {
  groupRowsByWardTown,
  getWardTownDetailedStats,
  groupRowsByDeliveryMethod,
  getDeliveryMethodDetailedStats,
  groupRowsByStSen,
  getStSenDetailedStats,
  groupRowsByStLeg,
  getStLegDetailedStats,
  groupRowsByCountyLeg,
  getCountyLegDetailedStats,
  parseWardTownId,
  isBallotSent,
  isBallotReturned,
  calculatePercentage,
  PARTY_TYPES,
  type PartyType,
} from '../../reportTypes/wardTownMapping';
import {
  createGroupingConfig,
  calculateGroupedStatistics,
} from '../../utils/statisticsProcessor';

type PartyStats = Record<PartyType, PartyStatistics>;
type GroupedRows = Record<string, AbsenteeStandardBallotRequestRow[]>;

// Base party statistics structure
export interface PartyStatistics {
  requested: number;
  ballotsSent: number;
  returned: number;
  percentage: number;
}

// Base statistics structure with common fields
export interface BaseStatistics {
  requested: number;
  ballotsSent: number;
  returned: number;
  returnPercentage: number;
  partyStats: PartyStats;
}

// Generic statistics type that replaces all specific types
export type Statistics<
  T extends Record<string, unknown> = Record<string, unknown>,
> = BaseStatistics & T;

// Specific statistics types for each grouping
export type WardTownStatistics = Statistics<{
  wardTownId: string;
  town: string;
  ward: string;
}>;

export type DeliveryMethodStatistics = Statistics<{
  deliveryMethod: string;
}>;

export type StSenStatistics = Statistics<{
  stSen: string;
}>;

export type StLegStatistics = Statistics<{
  stLeg: string;
}>;

export type CountyLegStatistics = Statistics<{
  countyLeg: string;
}>;

// Summary metrics
export interface SummaryMetrics {
  requested: number;
  ballotsSent: number;
  ballotsReturned: number;
  returnRate: number;
}

// Summary statistics for quick overview
export interface SummaryStatistics {
  totalRequested: number;
  totalReturned: number;
  overallReturnPercentage: number;
  wardTownCount: number;
}

// Daily return curve entry with party breakdown
export interface DailyReturnEntry {
  date: string;
  returned: number;
  cumulative: number;
  partyBreakdown: {
    returned: Record<PartyType, number>;
    cumulative: Record<PartyType, number>;
  };
}

// Simplified main result interface
export interface AbsenteeStatisticsResult {
  totalRecords: number;
  wardTownCount: number;
  deliveryMethodCount: number;
  stSenCount: number;
  stLegCount: number;
  countyLegCount: number;
  summaryMetrics: SummaryMetrics;
  dailyReturnCurve: DailyReturnEntry[];
  statistics: WardTownStatistics[];
  deliveryMethodStatistics: DeliveryMethodStatistics[];
  stSenStatistics: StSenStatistics[];
  stLegStatistics: StLegStatistics[];
  countyLegStatistics: CountyLegStatistics[];
  groupedRows: GroupedRows;
  groupedRowsByDeliveryMethod: GroupedRows;
  groupedRowsByStSen: GroupedRows;
  groupedRowsByStLeg: GroupedRows;
  groupedRowsByCountyLeg: GroupedRows;
}

export class AbsenteeStatisticsCalculator {
  /**
   * Calculates comprehensive statistics from absentee ballot data using generic processor
   */
  calculateStatistics(
    rows: AbsenteeStandardBallotRequestRow[]
  ): AbsenteeStatisticsResult {
    try {
      console.log(`Calculating statistics for ${rows.length} records...`);

      // Validate input data
      this.validateInputData(rows);

      // Process all grouping types using individual configurations
      const wardTownConfig = createGroupingConfig<
        AbsenteeStandardBallotRequestRow,
        WardTownStatistics
      >(
        groupRowsByWardTown,
        getWardTownDetailedStats,
        'wardTownId',
        'Ward/Town',
        parseWardTownId
      );

      const deliveryMethodConfig = createGroupingConfig<
        AbsenteeStandardBallotRequestRow,
        DeliveryMethodStatistics
      >(
        groupRowsByDeliveryMethod,
        getDeliveryMethodDetailedStats,
        'deliveryMethod',
        'Delivery Method'
      );

      const stSenConfig = createGroupingConfig<
        AbsenteeStandardBallotRequestRow,
        StSenStatistics
      >(groupRowsByStSen, getStSenDetailedStats, 'stSen', 'State Senate');

      const stLegConfig = createGroupingConfig<
        AbsenteeStandardBallotRequestRow,
        StLegStatistics
      >(groupRowsByStLeg, getStLegDetailedStats, 'stLeg', 'State Legislature');

      const countyLegConfig = createGroupingConfig<
        AbsenteeStandardBallotRequestRow,
        CountyLegStatistics
      >(
        groupRowsByCountyLeg,
        getCountyLegDetailedStats,
        'countyLeg',
        'County Legislature'
      );

      // Process each grouping type
      const wardTownResult = calculateGroupedStatistics<
        AbsenteeStandardBallotRequestRow,
        WardTownStatistics
      >(rows, [wardTownConfig])[0];
      const deliveryMethodResult = calculateGroupedStatistics<
        AbsenteeStandardBallotRequestRow,
        DeliveryMethodStatistics
      >(rows, [deliveryMethodConfig])[0];
      const stSenResult = calculateGroupedStatistics<
        AbsenteeStandardBallotRequestRow,
        StSenStatistics
      >(rows, [stSenConfig])[0];
      const stLegResult = calculateGroupedStatistics<
        AbsenteeStandardBallotRequestRow,
        StLegStatistics
      >(rows, [stLegConfig])[0];
      const countyLegResult = calculateGroupedStatistics<
        AbsenteeStandardBallotRequestRow,
        CountyLegStatistics
      >(rows, [countyLegConfig])[0];

      // Calculate summary metrics
      const summaryMetrics = this.calculateSummaryMetrics(rows);

      // Calculate daily return curve
      const dailyReturnCurve = this.calculateDailyReturnCurve(rows);

      const result: AbsenteeStatisticsResult = {
        totalRecords: rows.length,
        wardTownCount: wardTownResult.count,
        deliveryMethodCount: deliveryMethodResult.count,
        stSenCount: stSenResult.count,
        stLegCount: stLegResult.count,
        countyLegCount: countyLegResult.count,
        summaryMetrics,
        dailyReturnCurve,
        statistics: wardTownResult.statistics,
        deliveryMethodStatistics: deliveryMethodResult.statistics,
        stSenStatistics: stSenResult.statistics,
        stLegStatistics: stLegResult.statistics,
        countyLegStatistics: countyLegResult.statistics,
        groupedRows: wardTownResult.grouped,
        groupedRowsByDeliveryMethod: deliveryMethodResult.grouped,
        groupedRowsByStSen: stSenResult.grouped,
        groupedRowsByStLeg: stLegResult.grouped,
        groupedRowsByCountyLeg: countyLegResult.grouped,
      };

      console.log('Statistics calculation completed successfully');
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to calculate statistics: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calculating statistics');
    }
  }

  /**
   * Calculates summary metrics for the entire dataset
   */
  private calculateSummaryMetrics(
    rows: AbsenteeStandardBallotRequestRow[]
  ): SummaryMetrics {
    const requested = rows.length;

    // Ballots sent: records with Ballot Last Issued Date
    const ballotsSent = rows.filter(isBallotSent).length;

    // Ballots returned: records with Last Received Delivery Status === 'Received'
    const ballotsReturned = rows.filter(isBallotReturned).length;

    // Calculate return rate as percentage
    const returnRate = calculatePercentage(ballotsReturned, ballotsSent);

    return {
      requested,
      ballotsSent,
      ballotsReturned,
      returnRate,
    };
  }

  /**
   * Calculates daily return curve data from ballot return dates with party breakdown
   */
  private calculateDailyReturnCurve(
    rows: AbsenteeStandardBallotRequestRow[]
  ): DailyReturnEntry[] {
    // Filter rows that have been returned (have a return date)
    const returnedRows = rows.filter(isBallotReturned);

    // Group by date and party
    const dateGroups: Record<
      string,
      { total: number; byParty: Record<PartyType, number> }
    > = {};

    for (const row of returnedRows) {
      const returnDate = row['Ballot Last Received Date']?.trim();
      if (returnDate) {
        // Normalize date format (assuming YYYY-MM-DD format)
        const normalizedDate = this.normalizeDate(returnDate);
        if (normalizedDate) {
          // Initialize date group if it doesn't exist
          if (!dateGroups[normalizedDate]) {
            dateGroups[normalizedDate] = {
              total: 0,
              byParty: {
                DEM: 0,
                REP: 0,
                BLK: 0,
                CON: 0,
                WOR: 0,
                OTH: 0,
                IND: 0,
              },
            };
          }

          // Increment total count
          dateGroups[normalizedDate].total++;

          // Increment party-specific count
          const normalizedParty = row.Party.trim().toUpperCase() as PartyType;
          if (
            dateGroups[normalizedDate].byParty[normalizedParty] !== undefined
          ) {
            dateGroups[normalizedDate].byParty[normalizedParty]++;
          }
        }
      }
    }

    // Convert to array and sort by date
    const dailyData = Object.entries(dateGroups)
      .map(([date, data]) => ({
        date,
        returned: data.total,
        cumulative: 0,
        partyBreakdown: {
          returned: data.byParty,
          cumulative: {
            DEM: 0,
            REP: 0,
            BLK: 0,
            CON: 0,
            WOR: 0,
            OTH: 0,
            IND: 0,
          },
        },
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate cumulative totals for overall and by party
    const cumulativeTotals: Record<PartyType, number> = {
      DEM: 0,
      REP: 0,
      BLK: 0,
      CON: 0,
      WOR: 0,
      OTH: 0,
      IND: 0,
    };
    let totalCumulative = 0;

    for (const day of dailyData) {
      totalCumulative += day.returned;
      day.cumulative = totalCumulative;

      // Calculate cumulative totals for each party
      for (const party of PARTY_TYPES) {
        cumulativeTotals[party] += day.partyBreakdown.returned[party];
        day.partyBreakdown.cumulative[party] = cumulativeTotals[party];
      }
    }

    return dailyData;
  }

  /**
   * Normalizes date strings to YYYY-MM-DD format
   */
  private normalizeDate(dateStr: string): string | null {
    try {
      // Handle various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }

      // Return in YYYY-MM-DD format
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  /**
   * Validates input data before processing
   */
  private validateInputData(rows: AbsenteeStandardBallotRequestRow[]): void {
    if (!rows || rows.length === 0) {
      throw new Error('No data provided for statistics calculation');
    }

    // Check for required fields - ensure they exist and have meaningful values
    const requiredFields = [
      'Ward',
      'Town',
      'Party',
      'Last Received Delivery Status',
    ];

    // Check if any rows are missing these fields entirely
    const missingFields = requiredFields.filter((field) =>
      rows.some((row) => !(field in row))
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in data: ${missingFields.join(', ')}`
      );
    }

    // Check if critical fields have meaningful data (not just empty strings/spaces)
    const criticalFields = ['Ward', 'Town', 'Party'];
    const emptyCriticalFields = criticalFields.filter((field) =>
      rows.every(
        (row) => !row[field as keyof AbsenteeStandardBallotRequestRow]?.trim()
      )
    );

    if (emptyCriticalFields.length > 0) {
      throw new Error(
        `Critical fields contain no meaningful data: ${emptyCriticalFields.join(', ')}`
      );
    }

    console.log('Input data validation passed');
  }

  /**
   * Gets summary statistics for quick overview
   */
  getSummaryStatistics(result: AbsenteeStatisticsResult): SummaryStatistics {
    return {
      totalRequested: result.summaryMetrics.requested,
      totalReturned: result.summaryMetrics.ballotsReturned,
      overallReturnPercentage: result.summaryMetrics.returnRate,
      wardTownCount: result.wardTownCount,
    };
  }
}
