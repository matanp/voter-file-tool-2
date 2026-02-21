import type {
  CommitteeList,
  CommitteeMembership,
  VoterRecord,
} from '@voter-file-tool/shared-prisma';
import { LEG_DISTRICT_SENTINEL } from './constants';

export type CommitteeWithMembers = CommitteeList & {
  memberships?: (CommitteeMembership & { voterRecord: VoterRecord })[];
};

/**
 * Normalizes sentinel values for committee data to ensure consistent handling
 * between client and server components.
 *
 * @param electionDistrict - The election district number (always required and positive)
 * @param legDistrict - The legislative district (optional string or number)
 * @returns Object with normalized values where legDistrict sentinel values are converted to undefined
 */
export const normalizeSentinelValues = (
  electionDistrict: number,
  legDistrict?: string | number
) => {
  let normalizedLegDistrict: string | undefined;

  if (legDistrict === undefined) {
    normalizedLegDistrict = undefined;
  } else if (typeof legDistrict === 'string') {
    const trimmed = legDistrict.trim();
    normalizedLegDistrict =
      trimmed === LEG_DISTRICT_SENTINEL.toString() || trimmed === ''
        ? undefined
        : trimmed;
  } else {
    // Number case
    normalizedLegDistrict =
      legDistrict === LEG_DISTRICT_SENTINEL
        ? undefined
        : legDistrict.toString();
  }

  return {
    normalizedElectionDistrict: electionDistrict,
    normalizedLegDistrict,
  };
};

/**
 * Converts undefined values to sentinel values for database storage.
 * This is the inverse operation of normalizeSentinelValues.
 *
 * @param legDistrict - The legislative district (optional)
 * @returns The legDistrict value or LEG_DISTRICT_SENTINEL if undefined
 */
export const toDbSentinelValue = (legDistrict?: string | number): number => {
  if (legDistrict === undefined) return LEG_DISTRICT_SENTINEL;
  if (typeof legDistrict === 'number') {
    if (!Number.isInteger(legDistrict)) {
      throw new Error(`Invalid legDistrict: "${legDistrict}"`);
    }
    return legDistrict;
  }
  const trimmed = legDistrict.trim();
  if (trimmed === '') return LEG_DISTRICT_SENTINEL;
  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid legDistrict: "${legDistrict}"`);
  }
  return n;
};
