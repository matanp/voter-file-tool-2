/**
 * SRS 2.6 — Petition-outcome read model shared by the Admin-only
 * `GET /api/admin/petition-outcomes` list and the Admin-only `petitionContext`
 * of `GET /api/committee/[committeeListId]/detail`.
 *
 * A petition outcome is a CommitteeMembership with `membershipType =
 * PETITIONED` and a `petitionSeatNumber`; its `status` is the outcome
 * (ACTIVE won, PETITIONED_LOST, PETITIONED_TIE). Both routes query with
 * `petitionOutcomeWhere` and project with `toPetitionOutcomeContext`.
 */

import type { MembershipStatus, Prisma } from "@prisma/client";
import type { PetitionOutcomeContext } from "~/lib/validations/committee";

export function petitionOutcomeWhere(filters: {
  termId?: string;
  committeeListId?: number;
  status?: MembershipStatus;
}): Prisma.CommitteeMembershipWhereInput {
  const { termId, committeeListId, status } = filters;
  return {
    membershipType: "PETITIONED",
    petitionSeatNumber: { not: null },
    ...(termId ? { termId } : {}),
    ...(committeeListId ? { committeeListId } : {}),
    ...(status ? { status } : {}),
  };
}

/** Candidate name projection; both routes include it. */
export const PETITION_OUTCOME_VOTER_SELECT = {
  select: { VRCNUM: true, firstName: true, lastName: true },
} satisfies Prisma.VoterRecordDefaultArgs;

/** Seat order, then most recent primary first. */
export const PETITION_OUTCOME_ORDER = [
  { committeeListId: "asc" },
  { termId: "asc" },
  { petitionSeatNumber: "asc" },
  { petitionPrimaryDate: "desc" },
] satisfies Prisma.CommitteeMembershipOrderByWithRelationInput[];

export type PetitionOutcomeRow = {
  id: string;
  voterRecordId: string;
  voterRecord: {
    VRCNUM: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  seatNumber: number | null;
  petitionSeatNumber: number | null;
  status: MembershipStatus;
  petitionPrimaryDate: Date | null;
  petitionVoteCount: number | null;
};

/**
 * One candidate's outcome. `status` is the outcome at recording time (ACTIVE,
 * PETITIONED_LOST, PETITIONED_TIE) unless the member has since left, in which
 * case it is the current status (e.g. RESIGNED) — same as the admin list.
 */
export function toPetitionOutcomeContext(
  m: PetitionOutcomeRow,
): PetitionOutcomeContext {
  return {
    id: m.id,
    voterRecordId: m.voterRecordId,
    voter: m.voterRecord
      ? {
          VRCNUM: m.voterRecord.VRCNUM,
          firstName: m.voterRecord.firstName,
          lastName: m.voterRecord.lastName,
        }
      : null,
    seatNumber: m.seatNumber,
    petitionSeatNumber: m.petitionSeatNumber,
    status: m.status,
    petitionPrimaryDate: m.petitionPrimaryDate?.toISOString() ?? null,
    petitionVoteCount: m.petitionVoteCount,
  };
}
