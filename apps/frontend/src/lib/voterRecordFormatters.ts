import type { VoterRecord } from "@prisma/client";

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
