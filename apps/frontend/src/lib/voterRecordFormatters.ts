import type { VoterRecord } from "@prisma/client";

import { isAllZeroTownCode, normalizeTownCode } from "~/lib/lted/digitParsing";
import { lookupCityTown } from "~/lib/lted/monroeTownCodes";

/** Formats a voter record street address, optionally using committee address override. */
export const getAddress = (record: VoterRecord, committee?: boolean) => {
  if (record.addressForCommittee && committee) {
    return record.addressForCommittee;
  }
  return `${record.houseNum} ${record.street}${record.apartment ? ` APT ${record.apartment}` : ""}`;
};

/** Formats first, middle, and last name into a single display string. */
export const getName = (
  record: Pick<VoterRecord, "firstName" | "middleInitial" | "lastName">,
) => {
  const nameParts = [record.firstName, record.middleInitial, record.lastName]
    .filter((part) => part != null && part !== "")
    .map((part) => (part === record.middleInitial && part ? `${part}` : part));

  return nameParts.join(" ").trim();
};

/**
 * Formats the voter's town from townCode, e.g. "WEBSTER (095)". The `city`
 * field is the postal city and can name a different town. Returns null when
 * the code is missing or all zeros.
 */
export const getTown = (record: Pick<VoterRecord, "townCode">) => {
  const code = normalizeTownCode(record.townCode);
  if (!code || isAllZeroTownCode(code)) return null;
  const name = lookupCityTown(code, "strict");
  return name ? `${name} (${code})` : code;
};

/**
 * Returns the BOE village/ward/quadrant code (CC_WD_Village), or null when the
 * voter isn't in one. The BOE file uses "00" for "none".
 */
export const getVillageWard = (record: Pick<VoterRecord, "CC_WD_Village">) => {
  const value = record.CC_WD_Village?.trim();
  if (!value || /^0+$/.test(value)) return null;
  return value;
};
