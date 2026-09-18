import type { MembershipType } from "@prisma/client";

/** Committee identity, already normalized by the parser that read it. */
export type RosterCommitteeIdentity = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

/**
 * What the source file asserts about the person, under format-neutral names.
 * These are the fields the import compares against the voter file.
 */
export type RosterClaimedVoter = {
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

/** One roster row, in the single shape every parser produces and the import consumes. */
export type RosterEntry = {
  vrcnum: string;
  committee: RosterCommitteeIdentity;
  claimed: RosterClaimedVoter;
  membershipType: MembershipType;
  /** 1-based row number in the source file, counting the header row as row 1. */
  sourceRow: number;
};

/** A row the parser could not read, reported rather than thrown. */
export type RejectedRosterRow = {
  sourceRow: number;
  reason: string;
};

/**
 * Parsers never throw on a bad row — they reject it and keep going. They throw only
 * when the file as a whole is not the declared format.
 */
export type RosterParseResult = {
  entries: RosterEntry[];
  rejected: RejectedRosterRow[];
};

/**
 * `current` formats may be imported through the API; `archived` formats describe a
 * Committee Term that is already loaded and are reachable only from scripts and seeding.
 */
export type RosterFormatStatus = "current" | "archived";

export type RosterFormat = {
  label: string;
  status: RosterFormatStatus;
  parse: (fileContents: Buffer) => RosterParseResult;
};
