// src/reportTypes/wardTownMapping.ts
// Purpose: Define Ward-to-Town mapping and processing utilities for Absentee Standard Ballot Request data

import { AbsenteeStandardBallotRequestRow } from './absenteeStandardBallotRequest';

/**
 * Hardcoded mapping of Ward numbers to Town names.
 * Ward numbers are stripped of leading zeros for lookup.
 */
export const WARD_TO_TOWN_MAPPING = {
  '16': 'Rochester',
  '17': 'Rochester',
  '21': 'Rochester',
  '22': 'Rochester',
  '23': 'Rochester',
  '24': 'Rochester',
  '25': 'Rochester',
  '26': 'Rochester',
  '27': 'Rochester',
  '28': 'Rochester',
  '29': 'Rochester',
  '45': 'Brighton',
  '46': 'Chili',
  '47': 'Clarkson',
  '48': 'East Rochester',
  '49': 'Gates',
  '50': 'Greece',
  '51': 'Hamlin',
  '52': 'Henrietta',
  '53': 'Irondequoit',
  '54': 'Mendon',
  '55': 'Ogden',
  '56': 'Parma',
  '57': 'Penfield',
  '58': 'Perinton',
  '59': 'Pittsford',
  '60': 'Riga',
  '61': 'Rush',
  '62': 'Sweden',
  '63': 'Webster',
  '64': 'Wheatland',
} as const;

export type WardNumber = keyof typeof WARD_TO_TOWN_MAPPING;
export type TownName = (typeof WARD_TO_TOWN_MAPPING)[WardNumber];

/**
 * Strips leading zeros from a ward number string
 */
export const stripLeadingZeros = (wardNumber: string): string => {
  return wardNumber.replace(/^0+/, '') || '0';
};

/**
 * Gets the town name for a given ward number, with default fallback
 */
export const getTownForWard = (wardNumber: string): string => {
  const cleanWard = stripLeadingZeros(wardNumber);
  return WARD_TO_TOWN_MAPPING[cleanWard as WardNumber] ?? 'Unknown Town';
};

/**
 * Creates a Ward/Town identifier string in format "TownName (WardNumber)"
 */
export const createWardTownIdentifier = (wardNumber: string): string => {
  const town = getTownForWard(wardNumber);
  const cleanWard = stripLeadingZeros(wardNumber);
  return `${town} (${cleanWard})`;
};

/**
 * Groups Absentee Standard Ballot Request rows by Ward/Town combination
 */
export const groupRowsByWardTown = (
  rows: AbsenteeStandardBallotRequestRow[]
): Record<string, AbsenteeStandardBallotRequestRow[]> => {
  const grouped: Record<string, AbsenteeStandardBallotRequestRow[]> = {};

  for (const row of rows) {
    const wardTownId = createWardTownIdentifier(row.Ward);

    if (!grouped[wardTownId]) {
      grouped[wardTownId] = [];
    }

    grouped[wardTownId].push(row);
  }

  return grouped;
};

/**
 * Party types found in the data
 */
export const PARTY_TYPES = [
  'DEM',
  'REP',
  'BLK',
  'CON',
  'WOR',
  'OTH',
  'IND',
] as const;

/**
 * Type guard to safely validate party strings against allowed party types
 * @param party - The party string to validate
 * @returns true if the party is a valid PartyType, false otherwise
 */
export function isValidPartyType(party: string): party is PartyType {
  return PARTY_TYPES.includes(party as PartyType);
}

export type PartyType = (typeof PARTY_TYPES)[number];

/**
 * Determines if a ballot has been sent based on Ballot Last Issued Date
 */
export const isBallotSent = (
  row: AbsenteeStandardBallotRequestRow
): boolean => {
  return row['Ballot Last Issued Date']?.trim() !== '';
};

/**
 * Determines if a ballot has been returned based on Last Received Delivery Status
 */
export const isBallotReturned = (
  row: AbsenteeStandardBallotRequestRow
): boolean => {
  return row['Last Received Delivery Status'].trim() === 'Received';
};

/**
 * Gets party statistics for a group of rows
 */
export const getPartyStats = (rows: AbsenteeStandardBallotRequestRow[]) => {
  const stats: Record<
    PartyType,
    { requested: number; ballotsSent: number; returned: number }
  > = {
    DEM: { requested: 0, ballotsSent: 0, returned: 0 },
    REP: { requested: 0, ballotsSent: 0, returned: 0 },
    BLK: { requested: 0, ballotsSent: 0, returned: 0 },
    CON: { requested: 0, ballotsSent: 0, returned: 0 },
    WOR: { requested: 0, ballotsSent: 0, returned: 0 },
    OTH: { requested: 0, ballotsSent: 0, returned: 0 },
    IND: { requested: 0, ballotsSent: 0, returned: 0 },
  };

  // Data quality tracking
  let invalidPartyCount = 0;
  const invalidPartyValues = new Set<string>();

  for (const row of rows) {
    const normalizedParty = row.Party.trim().toUpperCase();
    const ballotsSent = isBallotSent(row);
    const returned = isBallotReturned(row);

    // Validate party type before casting
    if (!isValidPartyType(normalizedParty)) {
      invalidPartyCount++;
      invalidPartyValues.add(normalizedParty);

      // Log warning with raw value and row identifier for debugging
      console.warn(
        `Invalid party value found: "${row.Party}" (normalized: "${normalizedParty}") ` +
          `in row with Last Name: "${row['Last Name']}", First Name: "${row['First Name']}"`
      );
      continue; // Skip this row
    }

    const party = normalizedParty as PartyType;
    stats[party].requested++;
    if (ballotsSent) {
      stats[party].ballotsSent++;
    }
    if (returned) {
      stats[party].returned++;
    }
  }

  // Log data quality summary
  if (invalidPartyCount > 0) {
    console.warn(
      `Data quality issue: Found ${invalidPartyCount} rows with invalid party values. ` +
        `Invalid values: ${Array.from(invalidPartyValues).join(', ')}`
    );
  }

  return stats;
};

/**
 * Parses wardTownId string into town and ward components
 */
export const parseWardTownId = (
  wardTownId: string
): { town: string; ward: string } => {
  const [town, wardWithParens] = wardTownId.split(' (');
  const ward = wardWithParens.replace(')', '');
  return { town, ward };
};

/**
 * Calculates percentage with proper handling of zero division
 */
export const calculatePercentage = (
  returned: number,
  requested: number
): number => {
  if (requested === 0) return 0;
  return Math.round((returned / requested) * 100 * 100) / 100; // Round to 2 decimal places
};

/**
 * Creates a localeCompare sort function for a given field
 */
const localeCompareSortFn = (identifierField: string) => (a: any, b: any) =>
  a[identifierField].localeCompare(b[identifierField]);

/**
 * Configuration for different grouping types
 */
interface GroupingConfig {
  identifierField: string;
  sortFunction: (a: any, b: any) => number;
  parseIdentifier?: (identifier: string) => Record<string, any>;
}

/**
 * Generic function to calculate detailed statistics for any grouping type
 */
const calculateDetailedStats = <T extends Record<string, any>>(
  groupedRows: Record<string, AbsenteeStandardBallotRequestRow[]>,
  config: GroupingConfig
): T[] => {
  return Object.entries(groupedRows)
    .map(([identifier, rows]) => {
      const totalRequested = rows.length;
      const totalBallotsSent = rows.filter(isBallotSent).length;
      const totalReturned = rows.filter(isBallotReturned).length;
      const returnPercentage = calculatePercentage(
        totalReturned,
        totalBallotsSent
      );

      const partyStats = getPartyStats(rows);
      const formattedPartyStats = {} as Record<
        PartyType,
        {
          requested: number;
          ballotsSent: number;
          returned: number;
          percentage: number;
        }
      >;

      for (const party of PARTY_TYPES) {
        const stats = partyStats[party];
        formattedPartyStats[party] = {
          requested: stats.requested,
          ballotsSent: stats.ballotsSent,
          returned: stats.returned,
          percentage: calculatePercentage(stats.returned, stats.ballotsSent),
        };
      }

      const baseStats = {
        [config.identifierField]: identifier,
        requested: totalRequested,
        ballotsSent: totalBallotsSent,
        returned: totalReturned,
        returnPercentage,
        partyStats: formattedPartyStats,
      };

      // Add parsed identifier fields if parser is provided
      const parsedFields = config.parseIdentifier?.(identifier) ?? {};

      return { ...baseStats, ...parsedFields } as unknown as T;
    })
    .sort(config.sortFunction);
};

/**
 * Detailed statistics for Ward/Town groups including party breakdowns
 */
export const getWardTownDetailedStats = (
  groupedRows: Record<string, AbsenteeStandardBallotRequestRow[]>
): Array<{
  wardTownId: string;
  town: string;
  ward: string;
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
}> => {
  const config: GroupingConfig = {
    identifierField: 'wardTownId',
    sortFunction: (a, b) => parseInt(a.ward) - parseInt(b.ward),
    parseIdentifier: parseWardTownId,
  };

  return calculateDetailedStats(groupedRows, config);
};

/**
 * Gets summary statistics for Ward/Town groups (simplified version)
 */
export const getWardTownSummary = (
  groupedRows: Record<string, AbsenteeStandardBallotRequestRow[]>
): Array<{
  wardTownId: string;
  count: number;
  town: string;
  ward: string;
}> => {
  return Object.entries(groupedRows)
    .map(([wardTownId, rows]) => {
      const { town, ward } = parseWardTownId(wardTownId);

      return {
        wardTownId,
        count: rows.length,
        town,
        ward,
      };
    })
    .sort((a, b) => parseInt(a.ward) - parseInt(b.ward));
};

/**
 * Generic function to group rows by a field
 */
const groupRowsByField = (
  rows: AbsenteeStandardBallotRequestRow[],
  fieldName: keyof AbsenteeStandardBallotRequestRow,
  defaultValue = 'Unknown'
): Record<string, AbsenteeStandardBallotRequestRow[]> => {
  const grouped: Record<string, AbsenteeStandardBallotRequestRow[]> = {};

  for (const row of rows) {
    const key = row[fieldName]?.trim() || defaultValue;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(row);
  }

  return grouped;
};

/**
 * Groups Absentee Standard Ballot Request rows by Delivery Method
 */
export const groupRowsByDeliveryMethod = (
  rows: AbsenteeStandardBallotRequestRow[]
) => groupRowsByField(rows, 'Delivery Method');

/**
 * Detailed statistics for Delivery Method groups including party breakdowns
 */
export const getDeliveryMethodDetailedStats = (
  groupedRows: Record<string, AbsenteeStandardBallotRequestRow[]>
): Array<{
  deliveryMethod: string;
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
}> => {
  const config: GroupingConfig = {
    identifierField: 'deliveryMethod',
    sortFunction: localeCompareSortFn('deliveryMethod'),
  };

  return calculateDetailedStats(groupedRows, config);
};

/**
 * Groups Absentee Standard Ballot Request rows by State Senate district
 */
export const groupRowsByStSen = (rows: AbsenteeStandardBallotRequestRow[]) =>
  groupRowsByField(rows, 'St.Sen');

/**
 * Groups Absentee Standard Ballot Request rows by State Legislature district
 */
export const groupRowsByStLeg = (rows: AbsenteeStandardBallotRequestRow[]) =>
  groupRowsByField(rows, 'St.Leg');

/**
 * Detailed statistics for State Senate district groups including party breakdowns
 */
export const getStSenDetailedStats = (
  groupedRows: Record<string, AbsenteeStandardBallotRequestRow[]>
): Array<{
  stSen: string;
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
}> => {
  const config: GroupingConfig = {
    identifierField: 'stSen',
    sortFunction: localeCompareSortFn('stSen'),
  };

  return calculateDetailedStats(groupedRows, config);
};

/**
 * Detailed statistics for State Legislature district groups including party breakdowns
 */
export const getStLegDetailedStats = (
  groupedRows: Record<string, AbsenteeStandardBallotRequestRow[]>
): Array<{
  stLeg: string;
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
}> => {
  const config: GroupingConfig = {
    identifierField: 'stLeg',
    sortFunction: localeCompareSortFn('stLeg'),
  };

  return calculateDetailedStats(groupedRows, config);
};

/**
 * Groups Absentee Standard Ballot Request rows by County Legislature district
 * Note: Uses 'Other1' field which contains County Legislature district information
 */
export const groupRowsByCountyLeg = (
  rows: AbsenteeStandardBallotRequestRow[]
) => groupRowsByField(rows, 'Other1');

/**
 * Detailed statistics for County Legislature district groups including party breakdowns
 */
export const getCountyLegDetailedStats = (
  groupedRows: Record<string, AbsenteeStandardBallotRequestRow[]>
): Array<{
  countyLeg: string;
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
}> => {
  const config: GroupingConfig = {
    identifierField: 'countyLeg',
    sortFunction: localeCompareSortFn('countyLeg'),
  };

  return calculateDetailedStats(groupedRows, config);
};
