import { z } from 'zod';

import { voterRecordSchema } from './voterRecord';

/**
 * Every roster file format the importer knows, as the API contract states them. This
 * tuple is the contract: the frontend's parser registry pins its keys to it, so adding a
 * parser without naming it here (or naming one here without a parser) is a compile error.
 *
 * Whether a given format may be imported through the API is a separate question — the
 * registry records that as the format's status, and the endpoint rejects archived ones.
 */
export const ROSTER_FORMAT_IDS = [
  'boe-elected-list',
  'committee-export-xlsx',
] as const;

export type RosterFormatId = (typeof ROSTER_FORMAT_IDS)[number];

export const rosterFormatIdSchema = z.enum(ROSTER_FORMAT_IDS);

/**
 * The bulk committee roster import request. The Admin states the format rather than the
 * system guessing it, names the file within the local data directory, and says whether to
 * write. `dryRun` defaults to the safe answer: an operator who omits it gets a plan.
 */
export const bulkLoadCommitteesSchema = z.object({
  format: rosterFormatIdSchema,
  fileName: z.string().trim().min(1, 'File name is required'),
  dryRun: z.boolean().default(true),
});

export type BulkLoadCommitteesRequest = z.infer<typeof bulkLoadCommitteesSchema>;

/**
 * The response shape below is the wire shape, not the database shape. Two of its pieces
 * come from Prisma rows whose TypeScript types disagree with what `JSON.stringify`
 * produces — a `Decimal` leaves as a string, a `Date` leaves as an ISO string — so the
 * route converts them explicitly and these schemas describe the converted result.
 *
 * Objects the route and the importer build are `.strict()`: a field added without being
 * named here should fail the endpoint's tests, because this schema is the only place the
 * response contract is written down. The two Prisma-derived rows are left open, since
 * their columns belong to the database schema rather than to this endpoint.
 */

const nonNegativeInt = z.number().int().nonnegative();

/** The committee a planned removal or activation names, as a value. */
export const committeeIdentitySchema = z
  .object({
    cityTown: z.string(),
    legDistrict: z.number().int(),
    electionDistrict: z.number().int(),
    termId: z.string(),
  })
  .strict();

/** Someone the import would take off a committee, named so a mass removal announces itself. */
export const plannedRemovalSchema = z
  .object({
    membershipId: z.string(),
    voterRecordId: z.string(),
    name: z.string(),
    committee: committeeIdentitySchema,
  })
  .strict();

/** A committee the file overfills, which stops the import rather than seating everyone. */
export const plannedCapacityFailureSchema = z
  .object({
    /** The committee as `cityTown-LD-ED`, not as an identity object. */
    committee: z.string(),
    memberCount: nonNegativeInt,
    maxSeats: nonNegativeInt,
  })
  .strict();

/** A source row the parser could not read, and why. */
export const rejectedRosterRowSchema = z
  .object({
    sourceRow: z.number().int(),
    reason: z.string(),
  })
  .strict();

/** The headline numbers an Admin reads before deciding to apply an import. */
export const importCountsSchema = z
  .object({
    entries: nonNegativeInt,
    matchedVoters: nonNegativeInt,
    activations: nonNegativeInt,
    removals: nonNegativeInt,
    discrepancies: nonNegativeInt,
    rejectedRows: nonNegativeInt,
  })
  .strict();

/**
 * A `CommitteeList` row on the wire. Open, because its columns are the database schema's
 * to change. `ltedWeight` is a Prisma `Decimal?`, which serializes as a string.
 */
export const wireCommitteeListSchema = z.object({
  id: z.number().int(),
  cityTown: z.string(),
  legDistrict: z.number().int(),
  electionDistrict: z.number().int(),
  termId: z.string(),
  ltedWeight: z.string().nullable(),
});

/** One field the file and the voter record disagree about. */
export const discrepancyFieldSchema = z
  .object({
    incoming: z.string(),
    existing: z.string(),
    /** Present only for a VRCNUM with no voter record: the row as the file states it. */
    fullRow: z.record(z.string(), z.string()).optional(),
  })
  .strict();

/** One entry of the discrepancies `Map`, as an array pair once serialized. */
export const discrepancyEntrySchema = z.tuple([
  z.string(),
  z
    .object({
      discrepancies: z.record(z.string(), discrepancyFieldSchema),
      committee: wireCommitteeListSchema,
    })
    .strict(),
]);

/** Mirrors the Prisma `MembershipType` enum: how a member won the seat. */
const membershipTypeSchema = z.enum(['PETITIONED', 'APPOINTED']);

/** A membership an apply actually activated, with the seat it now holds. */
export const appliedActivationSchema = z
  .object({
    voterRecordId: z.string(),
    committee: committeeIdentitySchema,
    membershipType: membershipTypeSchema,
    seatNumber: z.number().int().nullable(),
  })
  .strict();

/** A membership an apply actually removed. */
export const appliedRemovalSchema = z
  .object({
    membershipId: z.string(),
    voterRecordId: z.string(),
    committee: committeeIdentitySchema,
  })
  .strict();

/**
 * A planned activation the apply refused because a live guard found the voter already
 * active in another committee. It is also recorded as a discrepancy.
 */
export const skippedActivationSchema = z
  .object({
    voterRecordId: z.string(),
    committee: committeeIdentitySchema,
    membershipType: membershipTypeSchema,
    reason: z.literal('active-elsewhere'),
  })
  .strict();

export const appliedCountsSchema = z
  .object({
    activations: nonNegativeInt,
    removals: nonNegativeInt,
    discrepancies: nonNegativeInt,
    skippedActivations: nonNegativeInt,
  })
  .strict();

/**
 * What an apply actually did, accumulated from writes that committed. The plan's `counts`
 * stay what was planned so the two can be compared; when they differ, `skippedActivations`
 * says why.
 */
export const appliedSummarySchema = z
  .object({
    counts: appliedCountsSchema,
    activations: z.array(appliedActivationSchema),
    removals: z.array(appliedRemovalSchema),
    skippedActivations: z.array(skippedActivationSchema),
  })
  .strict();

export type AppliedSummary = z.infer<typeof appliedSummarySchema>;

/**
 * The success body of `POST /api/admin/bulkLoadCommittees`. This endpoint has no user
 * interface: the plan it returns *is* the feature, so nothing else would break loudly if
 * a field went missing. The route types its response against this and the route tests
 * parse against it at runtime.
 */
export const bulkLoadCommitteesResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    dryRun: z.boolean(),
    /** `null` on a dry run; otherwise what the writes actually did. */
    applied: appliedSummarySchema.nullable(),
    format: rosterFormatIdSchema,
    fileName: z.string(),
    /** Planned counts, on a dry run and an apply alike; `applied.counts` is what happened. */
    counts: importCountsSchema,
    removals: z.array(plannedRemovalSchema),
    capacityFailures: z.array(plannedCapacityFailureSchema),
    discrepanciesMap: z.array(discrepancyEntrySchema),
    recordsWithDiscrepancies: z.array(voterRecordSchema),
    rejectedRows: z.array(rejectedRosterRowSchema),
  })
  .strict();

export type BulkLoadCommitteesResponse = z.infer<
  typeof bulkLoadCommitteesResponseSchema
>;

/**
 * Every failure body the endpoint returns. `error` is the one thing they all carry; the
 * guards that reject a request add `success: false`, while the environment and server
 * failures answer with `error` alone. Naming both in one schema keeps a failing assertion
 * about `success` a type error rather than a union narrowing exercise.
 */
export const bulkLoadCommitteesErrorSchema = z
  .object({
    error: z.string(),
    success: z.literal(false).optional(),
    /** Present only on the 422 an apply request gets when the plan would overfill a committee. */
    capacityFailures: plannedCapacityFailureSchema.array().optional(),
  })
  .strict();

export type BulkLoadCommitteesError = z.infer<
  typeof bulkLoadCommitteesErrorSchema
>;
