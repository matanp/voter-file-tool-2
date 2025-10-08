// src/utils/statisticsProcessor.ts
// Purpose: Generic statistics processor to eliminate repetitive grouping and calculation patterns

import { AbsenteeStandardBallotRequestRow } from '../reportTypes/absenteeStandardBallotRequest';
import { PartyType } from '../reportTypes/wardTownMapping';

/**
 * Configuration for different grouping types
 */
export interface GroupingConfig<T = Record<string, any>> {
  /** Function to group rows by a specific field */
  groupFunction: (
    rows: AbsenteeStandardBallotRequestRow[]
  ) => Record<string, AbsenteeStandardBallotRequestRow[]>;
  /** Function to calculate detailed statistics from grouped rows */
  statsFunction: (
    grouped: Record<string, AbsenteeStandardBallotRequestRow[]>
  ) => T[];
  /** Field name for the identifier in the result */
  identifierField: string;
  /** Human-readable name for logging */
  displayName: string;
  /** Optional function to parse identifier into additional fields */
  parseIdentifier?: (identifier: string) => Record<string, any>;
}

/**
 * Generic function to calculate statistics for multiple grouping types
 * @param rows - Array of absentee ballot request rows
 * @param configs - Array of grouping configurations
 * @returns Object with grouped data and statistics for each configuration
 */
export function calculateGroupedStatistics<T = Record<string, any>>(
  rows: AbsenteeStandardBallotRequestRow[],
  configs: GroupingConfig<T>[]
): Array<{
  config: GroupingConfig<T>;
  grouped: Record<string, AbsenteeStandardBallotRequestRow[]>;
  statistics: T[];
  count: number;
}> {
  return configs.map((config) => {
    console.log(`Grouping by ${config.displayName}...`);

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
  });
}

/**
 * Generic function to create a grouping configuration
 * @param groupFunction - Function to group rows
 * @param statsFunction - Function to calculate statistics
 * @param identifierField - Field name for identifier
 * @param displayName - Human-readable name
 * @param parseIdentifier - Optional identifier parser
 * @returns GroupingConfig object
 */
export function createGroupingConfig<T = Record<string, any>>(
  groupFunction: (
    rows: AbsenteeStandardBallotRequestRow[]
  ) => Record<string, AbsenteeStandardBallotRequestRow[]>,
  statsFunction: (
    grouped: Record<string, AbsenteeStandardBallotRequestRow[]>
  ) => T[],
  identifierField: string,
  displayName: string,
  parseIdentifier?: (identifier: string) => Record<string, any>
): GroupingConfig<T> {
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

/**
 * Generic function to create statistics processor for party-based statistics
 * @param configs - Array of grouping configurations
 * @returns Function that processes rows and returns statistics
 */
export function createPartyStatisticsProcessor<T extends StatisticsWithParties>(
  configs: GroupingConfig<T>[]
) {
  return function processStatistics(
    rows: AbsenteeStandardBallotRequestRow[]
  ): Array<{
    config: GroupingConfig<T>;
    grouped: Record<string, AbsenteeStandardBallotRequestRow[]>;
    statistics: T[];
    count: number;
  }> {
    return calculateGroupedStatistics(rows, configs);
  };
}
