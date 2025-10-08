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

  for (const row of rows) {
    const party = row.Party.trim().toUpperCase() as PartyType;
    const ballotsSent = isBallotSent(row);
    const returned = isBallotReturned(row);

    if (party in stats) {
      stats[party].requested++;
      if (ballotsSent) {
        stats[party].ballotsSent++;
      }
      if (returned) {
        stats[party].returned++;
      }
    }
  }

  return stats;
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
      const formattedPartyStats: Record<
        PartyType,
        {
          requested: number;
          ballotsSent: number;
          returned: number;
          percentage: number;
        }
      > = {} as any;

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
    parseIdentifier: (wardTownId: string) => {
      const [town, wardWithParens] = wardTownId.split(' (');
      const ward = wardWithParens.replace(')', '');
      return { town, ward };
    },
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
      const [town, wardWithParens] = wardTownId.split(' (');
      const ward = wardWithParens.replace(')', '');

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
 * Groups Absentee Standard Ballot Request rows by Delivery Method
 */
export const groupRowsByDeliveryMethod = (
  rows: AbsenteeStandardBallotRequestRow[]
): Record<string, AbsenteeStandardBallotRequestRow[]> => {
  const grouped: Record<string, AbsenteeStandardBallotRequestRow[]> = {};

  for (const row of rows) {
    const deliveryMethod = row['Delivery Method']?.trim() || 'Unknown';

    if (!grouped[deliveryMethod]) {
      grouped[deliveryMethod] = [];
    }

    grouped[deliveryMethod].push(row);
  }

  return grouped;
};

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
    sortFunction: (a, b) => a.deliveryMethod.localeCompare(b.deliveryMethod),
  };

  return calculateDetailedStats(groupedRows, config);
};

/**
 * Groups Absentee Standard Ballot Request rows by State Senate district
 */
export const groupRowsByStSen = (
  rows: AbsenteeStandardBallotRequestRow[]
): Record<string, AbsenteeStandardBallotRequestRow[]> => {
  const grouped: Record<string, AbsenteeStandardBallotRequestRow[]> = {};

  for (const row of rows) {
    const stSen = row['St.Sen']?.trim() || 'Unknown';

    if (!grouped[stSen]) {
      grouped[stSen] = [];
    }

    grouped[stSen].push(row);
  }

  return grouped;
};

/**
 * Groups Absentee Standard Ballot Request rows by State Legislature district
 */
export const groupRowsByStLeg = (
  rows: AbsenteeStandardBallotRequestRow[]
): Record<string, AbsenteeStandardBallotRequestRow[]> => {
  const grouped: Record<string, AbsenteeStandardBallotRequestRow[]> = {};

  for (const row of rows) {
    const stLeg = row['St.Leg']?.trim() || 'Unknown';

    if (!grouped[stLeg]) {
      grouped[stLeg] = [];
    }

    grouped[stLeg].push(row);
  }

  return grouped;
};

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
    sortFunction: (a, b) => a.stSen.localeCompare(b.stSen),
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
    sortFunction: (a, b) => a.stLeg.localeCompare(b.stLeg),
  };

  return calculateDetailedStats(groupedRows, config);
};

/**
 * Groups Absentee Standard Ballot Request rows by County Legislature district
 */
export const groupRowsByCountyLeg = (
  rows: AbsenteeStandardBallotRequestRow[]
): Record<string, AbsenteeStandardBallotRequestRow[]> => {
  const grouped: Record<string, AbsenteeStandardBallotRequestRow[]> = {};

  for (const row of rows) {
    const countyLeg = row['Other1']?.trim() || 'Unknown';

    if (!grouped[countyLeg]) {
      grouped[countyLeg] = [];
    }

    grouped[countyLeg].push(row);
  }

  return grouped;
};

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
    sortFunction: (a, b) => a.countyLeg.localeCompare(b.countyLeg),
  };

  return calculateDetailedStats(groupedRows, config);
};
