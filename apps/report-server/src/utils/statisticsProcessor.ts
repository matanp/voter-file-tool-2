// src/utils/statisticsProcessor.ts
// Purpose: Generic statistics processor to eliminate repetitive grouping and calculation patterns

import { AbsenteeStandardBallotRequestRow } from '../reportTypes/absenteeStandardBallotRequest';
import { PartyType } from '../utils/absenteeDataUtils';

/**
 * Configuration for different grouping types
 */
export interface GroupingConfig<
  TRow = unknown,
  TStats = Record<string, unknown>,
> {
  /** Function to group rows by a specific field */
  groupFunction: (rows: TRow[]) => Record<string, TRow[]>;
  /** Function to calculate detailed statistics from grouped rows */
  statsFunction: (grouped: Record<string, TRow[]>) => TStats[];
  /** Field name for the identifier in the result - type-safe to ensure it exists on TStats */
  identifierField: keyof TStats;
  /** Human-readable name for logging */
  displayName: string;
  /** Optional function to parse identifier into additional fields */
  parseIdentifier?: (identifier: string) => Record<string, string>;
}

// Calculate statistics for multiple grouping configurations.
export function calculateGroupedStatistics<
  TRow = unknown,
  TStats = Record<string, unknown>,
>(
  rows: TRow[],
  configs: GroupingConfig<TRow, TStats>[]
): Array<{
  config: GroupingConfig<TRow, TStats>;
  grouped: Record<string, TRow[]>;
  statistics: TStats[];
  count: number;
}> {
  // Input validation
  if (!rows || rows.length === 0) {
    console.warn('calculateGroupedStatistics called with empty rows');
    return [];
  }

  if (!configs || configs.length === 0) {
    console.warn('calculateGroupedStatistics called with empty configs');
    return [];
  }

  return configs.map((config) => {
    console.log(`Grouping by ${config.displayName}...`);

    try {
      const grouped = config.groupFunction(rows);
      const count = Object.keys(grouped).length;

      console.log(`Grouped into ${count} ${config.displayName} combinations`);

      const statistics = config.statsFunction(grouped);

      return {
        config,
        grouped,
        statistics,
        count,
      };
    } catch (error) {
      console.error(`Error processing ${config.displayName}:`, error);
      throw new Error(
        `Failed to calculate statistics for ${config.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });
}

/**
 * Generic function to create a grouping configuration
 * @param groupFunction - Function to group rows
 * @param statsFunction - Function to calculate statistics
 * @param identifierField - Field name for identifier (type-safe)
 * @param displayName - Human-readable name
 * @param parseIdentifier - Optional identifier parser
 * @returns GroupingConfig object
 */
export function createGroupingConfig<
  TRow = unknown,
  TStats = Record<string, unknown>,
>(
  groupFunction: (rows: TRow[]) => Record<string, TRow[]>,
  statsFunction: (grouped: Record<string, TRow[]>) => TStats[],
  identifierField: keyof TStats,
  displayName: string,
  parseIdentifier?: (identifier: string) => Record<string, string>
): GroupingConfig<TRow, TStats> {
  return {
    groupFunction,
    statsFunction,
    identifierField,
    displayName,
    parseIdentifier,
  };
}

/**
 * Utility type for statistics that include party breakdowns
 */
export interface StatisticsWithParties {
  requested: number;
  ballotsSent: number;
  returned: number;
  returnPercentage: number;
  partyStats: Record<
    PartyType,
    {
      requested: number;
      ballotsSent: number;
      returned: number;
      percentage: number;
    }
  >;
}
