import {
  mapCommitteesToReportShape,
  mapCommitteesToReportShapeWithFields,
  type CommitteeWithMembers,
  type LDCommitteesWithFields,
} from "@voter-file-tool/shared-validators";
import { LEG_DISTRICT_SENTINEL } from "~/lib/constants/committee";

// Re-export the shared utilities
export {
  mapCommitteesToReportShape,
  mapCommitteesToReportShapeWithFields,
  type CommitteeWithMembers,
  type LDCommitteesWithFields,
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
  legDistrict?: string | number,
) => {
  const normalizedLegDistrict =
    legDistrict === LEG_DISTRICT_SENTINEL ||
    legDistrict === LEG_DISTRICT_SENTINEL.toString() ||
    legDistrict === "" ||
    legDistrict === undefined
      ? undefined
      : typeof legDistrict === "string"
        ? legDistrict
        : legDistrict.toString();
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
  if (typeof legDistrict === "number") {
    if (!Number.isInteger(legDistrict)) {
      throw new Error(`Invalid legDistrict: "${legDistrict}"`);
    }
    return legDistrict;
  }
  const trimmed = legDistrict.trim();
  if (trimmed === "") return LEG_DISTRICT_SENTINEL;
  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid legDistrict: "${legDistrict}"`);
  }
  return n;
};
