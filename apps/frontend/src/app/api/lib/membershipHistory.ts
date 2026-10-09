/**
 * Membership history for one committee, assembled from `AuditLog`.
 *
 * `AuditLog` is the only complete source: `CommitteeMembership` is one row per
 * (voter, committee, term) and re-adds null out the prior lifecycle columns,
 * so anything before the latest cycle survives only in the audit rows. Rows
 * are fetched by `entityType` + `entityId` over the committee's membership
 * ids (index-backed, and it reaches rows written before `metadata.subject`
 * existed). See .scratch/committees-workspace/history-inventory.md §2–§4.
 *
 * Privilege: the caller says whether the reader is Admin. Admin-only fields
 * (actor name, voter id, free-text notes/reasons, override rationale,
 * replacement links, meeting notes) are omitted — never nulled — otherwise.
 * Petition results (won/lost/tie, vote counts, primary dates) are Admin-only
 * too: non-Admins get no `petition_outcome` events, and a petition win shows
 * as a plain `activated` event with `source: "other"` (see
 * .scratch/leader-petition-visibility/issues/01-…md).
 */

import type {
  AuditAction,
  MeetingType,
  Prisma,
  PrivilegeLevel,
} from "@prisma/client";
import {
  MembershipType,
  RemovalReason,
  ResignationMethod,
} from "@prisma/client";
import { z } from "zod";
import prisma from "~/lib/prisma";
import { getName } from "~/lib/voterRecordFormatters";
import {
  type HistoryEvent,
  type HistorySource,
  historySourceSchema,
} from "~/lib/validations/committee";

/** The audit actions that describe a membership's lifecycle. */
export const MEMBERSHIP_HISTORY_ACTIONS = [
  "MEMBER_SUBMITTED",
  "MEMBER_REJECTED",
  "MEMBER_CONFIRMED",
  "MEMBER_ACTIVATED",
  "MEMBER_RESIGNED",
  "MEMBER_REMOVED",
  "PETITION_RECORDED",
] as const satisfies readonly AuditAction[];

export const MEMBERSHIP_ENTITY_TYPE = "CommitteeMembership";

// --- Lenient readers for the JSON columns ------------------------------------
// Each field is parsed on its own (`.catch(undefined)`) so one malformed value
// in an old row cannot hide the whole event.

const optionalString = z.string().optional().catch(undefined);
const optionalNullableString = z
  .string()
  .nullable()
  .optional()
  .catch(undefined);
const optionalNullableInt = z
  .number()
  .int()
  .nullable()
  .optional()
  .catch(undefined);

const auditSubjectSchema = z
  .object({
    memberName: optionalString,
    voterRecordId: optionalString,
    seatNumber: optionalNullableInt,
  })
  .catch({});

const auditMetadataSchema = z
  .object({
    source: optionalString,
    reason: optionalString,
    meetingRecordId: optionalNullableString,
    replacementMembershipId: optionalString,
    overrideReason: optionalString,
    eligibilityWarnings: z.array(z.unknown()).optional().catch(undefined),
    /** PETITION_RECORDED (per candidate) */
    outcome: optionalString,
    seatNumber: optionalNullableInt,
    voteCount: optionalNullableInt,
    subject: auditSubjectSchema,
  })
  .catch({ subject: {} });

const afterValueSchema = z
  .object({
    status: optionalString,
    seatNumber: optionalNullableInt,
    membershipType: z
      .nativeEnum(MembershipType)
      .nullable()
      .optional()
      .catch(undefined),
    meetingRecordId: optionalNullableString,
    rejectionNote: optionalNullableString,
    resignationDateReceived: optionalString,
    resignationMethod: z
      .nativeEnum(ResignationMethod)
      .optional()
      .catch(undefined),
    resignationReason: z.nativeEnum(RemovalReason).optional().catch(undefined),
    removalReason: z.nativeEnum(RemovalReason).optional().catch(undefined),
    removalNotes: optionalString,
  })
  .catch({});

// --- Inputs ------------------------------------------------------------------

export type HistoryAuditRow = {
  id: string;
  action: AuditAction;
  entityId: string;
  timestamp: Date;
  userRole: PrivilegeLevel;
  afterValue: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  user: { name: string | null } | null;
};

/** The current membership row, used to fill what the audit row lacks. */
export type HistoryMembershipRow = {
  id: string;
  voterRecordId: string;
  seatNumber: number | null;
  petitionPrimaryDate: Date | null;
  petitionSeatNumber: number | null;
  submissionMetadata: Prisma.JsonValue | null;
  voterRecord: {
    firstName: string | null;
    middleInitial: string | null;
    lastName: string | null;
  };
};

export type HistoryMeetingRow = {
  id: string;
  meetingDate: Date;
  meetingType: MeetingType;
  notes: string | null;
};

export type BuildHistoryOptions = {
  isAdmin: boolean;
  membershipsById: ReadonlyMap<string, HistoryMembershipRow>;
  membershipsByVoterRecordId: ReadonlyMap<string, HistoryMembershipRow>;
  meetingsById: ReadonlyMap<string, HistoryMeetingRow>;
};

const submissionMetadataSchema = z
  .object({
    removeMemberId: optionalString,
    requestNotes: optionalString,
  })
  .catch({});

function memberDisplayName(row: HistoryMembershipRow | undefined): string {
  if (!row) return "";
  return getName(row.voterRecord) || row.voterRecordId;
}

/** Omits `key` unless the reader is Admin; Admin-only fields are absent, not null. */
function adminOnly<T>(isAdmin: boolean, value: T | undefined): T | undefined {
  return isAdmin ? value : undefined;
}

function toSource(
  metadata: z.infer<typeof auditMetadataSchema>,
  hasMeeting: boolean,
): HistorySource {
  if (metadata.source !== undefined) {
    const parsed = historySourceSchema.safeParse(metadata.source);
    return parsed.success ? parsed.data : "other";
  }
  return hasMeeting ? "meeting" : "manual";
}

function toOutcome(
  metadata: z.infer<typeof auditMetadataSchema>,
  after: z.infer<typeof afterValueSchema>,
): "won" | "lost" | "tie" | undefined {
  switch (metadata.outcome) {
    case "WON":
    case "UNOPPOSED":
      return "won";
    case "LOST":
      return "lost";
    case "TIE":
      return "tie";
  }
  // Compensating rows (discrepancy undo) carry only the resulting status.
  switch (after.status) {
    case "ACTIVE":
      return "won";
    case "PETITIONED_LOST":
      return "lost";
    case "PETITIONED_TIE":
      return "tie";
  }
  return undefined;
}

// Admin-only fields are left `undefined` for other readers; JSON serialization
// drops them, so the body omits the key rather than sending null.

/**
 * Turns audit rows (newest first) into history events, newest first.
 *
 * - `MEMBER_CONFIRMED` + `MEMBER_ACTIVATED` from one accept collapse into one
 *   `confirmed` event keyed on the CONFIRMED row; the ACTIVATED sibling is
 *   recognised by its `meetingRecordId` (only accept writes it).
 * - `MEMBER_ACTIVATED` from a petition win is folded into `petition_outcome`
 *   for Admins. Non-Admins never see petition results: `PETITION_RECORDED`
 *   rows are dropped, and that ACTIVATED row becomes a plain `activated`
 *   event with `source: "other"` and no petition fields.
 * - Seat-entity `PETITION_RECORDED` rows are not queried; one event per
 *   candidate comes from the membership-entity rows.
 */
export function buildHistoryEvents(
  rows: readonly HistoryAuditRow[],
  options: BuildHistoryOptions,
): HistoryEvent[] {
  const { isAdmin, membershipsById, membershipsByVoterRecordId, meetingsById } =
    options;
  const events: HistoryEvent[] = [];

  const memberFor = (
    row: HistoryMembershipRow | undefined,
    subject: z.infer<typeof auditSubjectSchema>,
    seatNumber: number | null | undefined,
  ) => {
    const voterRecordId = subject.voterRecordId ?? row?.voterRecordId;
    return {
      name: subject.memberName ?? memberDisplayName(row),
      seatNumber: seatNumber ?? subject.seatNumber ?? null,
      voterRecordId: adminOnly(isAdmin, voterRecordId),
    };
  };

  const meetingFor = (meetingRecordId: string | null | undefined) => {
    if (!meetingRecordId) return undefined;
    const meeting = meetingsById.get(meetingRecordId);
    if (!meeting) return undefined;
    return {
      id: meeting.id,
      meetingDate: meeting.meetingDate.toISOString(),
      meetingType: meeting.meetingType,
      notes: adminOnly(isAdmin, meeting.notes),
    };
  };

  for (const row of rows) {
    const metadata = auditMetadataSchema.parse(row.metadata ?? {});
    const after = afterValueSchema.parse(row.afterValue ?? {});
    const membership = membershipsById.get(row.entityId);
    const meetingRecordId = after.meetingRecordId ?? metadata.meetingRecordId;
    const meeting = meetingFor(meetingRecordId);

    const base = {
      id: row.id,
      at: row.timestamp.toISOString(),
      actor: {
        role: row.userRole,
        name: adminOnly(isAdmin, row.user?.name ?? null),
      },
      member: memberFor(membership, metadata.subject, after.seatNumber),
      source: toSource(metadata, meeting !== undefined),
    };

    switch (row.action) {
      case "MEMBER_SUBMITTED": {
        const submission = submissionMetadataSchema.parse(
          membership?.submissionMetadata ?? {},
        );
        const target = submission.removeMemberId
          ? membershipsByVoterRecordId.get(submission.removeMemberId)
          : undefined;
        events.push({
          ...base,
          kind: "submitted",
          requestNotes: adminOnly(isAdmin, submission.requestNotes),
          replacementFor: adminOnly(
            isAdmin,
            target ? memberFor(target, {}, target.seatNumber) : undefined,
          ),
        });
        break;
      }
      case "MEMBER_REJECTED":
        events.push({
          ...base,
          kind: "rejected",
          meeting,
          rejectionNote: adminOnly(isAdmin, after.rejectionNote),
          systemReason: adminOnly(
            isAdmin,
            metadata.reason === "capacity" ? ("capacity" as const) : undefined,
          ),
        });
        break;
      case "MEMBER_CONFIRMED":
        events.push({
          ...base,
          kind: "confirmed",
          meeting,
          membershipType: after.membershipType ?? null,
        });
        break;
      case "MEMBER_ACTIVATED":
        // Sibling of a CONFIRMED row (accept) or of a PETITION_RECORDED row.
        if (meetingRecordId != null) break;
        if (metadata.source === "petition_outcome") {
          if (isAdmin) break; // Admins see the petition_outcome event instead.
          // POLICY: petition results are Admin-only. A Leader sees that the
          // member was activated, with nothing that names the petition.
          events.push({
            ...base,
            kind: "activated",
            source: "other",
            membershipType: undefined,
          });
          break;
        }
        events.push({
          ...base,
          kind: "activated",
          membershipType: after.membershipType,
          overrideReason: adminOnly(isAdmin, metadata.overrideReason),
          eligibilityWarnings: adminOnly(isAdmin, metadata.eligibilityWarnings),
        });
        break;
      case "MEMBER_RESIGNED":
        events.push({
          ...base,
          kind: "resigned",
          effectiveDate: after.resignationDateReceived,
          method: adminOnly(isAdmin, after.resignationMethod),
          reason: adminOnly(
            isAdmin,
            after.removalReason ?? after.resignationReason,
          ),
          notes: adminOnly(isAdmin, after.removalNotes),
        });
        break;
      case "MEMBER_REMOVED": {
        const incoming = metadata.replacementMembershipId
          ? membershipsById.get(metadata.replacementMembershipId)
          : undefined;
        events.push({
          ...base,
          kind: "removed",
          reason: adminOnly(isAdmin, after.removalReason),
          notes: adminOnly(isAdmin, after.removalNotes),
          replacedBy: adminOnly(
            isAdmin,
            incoming ? memberFor(incoming, {}, incoming.seatNumber) : undefined,
          ),
        });
        break;
      }
      case "PETITION_RECORDED": {
        // POLICY: petition outcomes are Admin-only (see the activated case).
        if (!isAdmin) break;
        const outcome = toOutcome(metadata, after);
        if (outcome === undefined) break; // nothing recoverable; do not fake it
        events.push({
          ...base,
          kind: "petition_outcome",
          outcome,
          seatNumber:
            metadata.seatNumber ?? membership?.petitionSeatNumber ?? null,
          primaryDate: membership?.petitionPrimaryDate?.toISOString() ?? null,
          voteCount: metadata.voteCount ?? null,
          reversed:
            metadata.source === "discrepancy_undo"
              ? (true as const)
              : undefined,
        });
        break;
      }
      default:
        break;
    }
  }

  return events;
}

export type LoadHistoryParams = {
  isAdmin: boolean;
  limit: number;
  /** The committee's memberships for the term (every status); the loader indexes them. */
  memberships: readonly HistoryMembershipRow[];
};

/**
 * Loads the newest `limit` history events for the given memberships (one
 * committee + term). Fetches
 * `limit + 1` audit rows to set `hasMore` without a count query.
 */
export async function loadMembershipHistory(
  params: LoadHistoryParams,
): Promise<{ events: HistoryEvent[]; hasMore: boolean }> {
  const { isAdmin, limit, memberships } = params;
  if (memberships.length === 0) return { events: [], hasMore: false };

  const membershipsById = new Map(memberships.map((m) => [m.id, m]));
  const membershipsByVoterRecordId = new Map(
    memberships.map((m) => [m.voterRecordId, m]),
  );

  const rows = await prisma.auditLog.findMany({
    where: {
      entityType: MEMBERSHIP_ENTITY_TYPE,
      entityId: { in: [...membershipsById.keys()] },
      action: { in: [...MEMBERSHIP_HISTORY_ACTIONS] },
    },
    orderBy: { timestamp: "desc" },
    take: limit + 1,
    select: {
      id: true,
      action: true,
      entityId: true,
      timestamp: true,
      userRole: true,
      afterValue: true,
      metadata: true,
      user: { select: { name: true } },
    },
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const meetingIds = new Set<string>();
  for (const row of page) {
    const after = afterValueSchema.parse(row.afterValue ?? {});
    const metadata = auditMetadataSchema.parse(row.metadata ?? {});
    const id = after.meetingRecordId ?? metadata.meetingRecordId;
    if (id) meetingIds.add(id);
  }
  const meetings =
    meetingIds.size > 0
      ? await prisma.meetingRecord.findMany({
          where: { id: { in: [...meetingIds] } },
          select: {
            id: true,
            meetingDate: true,
            meetingType: true,
            notes: true,
          },
        })
      : [];

  return {
    events: buildHistoryEvents(page, {
      isAdmin,
      membershipsById,
      membershipsByVoterRecordId,
      meetingsById: new Map(meetings.map((m) => [m.id, m])),
    }),
    hasMore,
  };
}
