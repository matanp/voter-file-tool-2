/**
 * How a voter is named across the app. Framework-free: server pages, API
 * helpers and client components all import it.
 */
import type { Prisma } from "@prisma/client";

/** The voter-record columns `personName` needs, plus the VRCNUM fallback. */
export const VOTER_NAME_SELECT = {
  VRCNUM: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.VoterRecordSelect;

/**
 * "Jane Q Doe": the non-blank parts joined with spaces, or `fallback` when
 * there are none.
 */
export function personName(
  person: {
    firstName?: string | null;
    middleInitial?: string | null;
    lastName?: string | null;
  },
  fallback = "",
): string {
  return (
    [person.firstName, person.middleInitial, person.lastName]
      .filter((part) => part?.trim())
      .join(" ")
      .trim() || fallback
  );
}
