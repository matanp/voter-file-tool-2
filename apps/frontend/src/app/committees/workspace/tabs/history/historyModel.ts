/**
 * Pure presentation model for the History tab (ticket 12, plan §7.4).
 *
 * Turns `detail.history.events` and the Admin-only `detail.petitionContext`
 * into display text. Nothing here fetches or decides authority: the server has
 * already omitted Admin-only data for Leaders. `showAdminDetail` only mirrors
 * that in the UI so a Developer acting as a lower role sees what that role
 * would (skills/auth-check-patterns).
 *
 * Only what the audit trail actually recorded is described. Events the
 * history inventory marks unrecoverable (a reason for a plain Admin add,
 * meeting context outside accept/reject, an Admin replace as one event) are
 * never filled in.
 */
import type {
  MeetingType,
  MembershipStatus,
  MembershipType,
  PrivilegeLevel,
  ResignationMethod,
} from "@prisma/client";

import { formatCalendarDateForDisplay } from "~/lib/dateUtils";
import { REMOVAL_REASON_LABELS } from "~/lib/removalReasonLabels";
import type {
  HistoryEvent,
  PetitionOutcomeContext,
} from "~/lib/validations/committee";

export type HistoryEventView = {
  /** One short verb phrase, e.g. "Resigned" or "Election result: won seat 2". */
  title: string;
  /** Extra facts, one per line, in reading order. */
  details: string[];
};

const ROLE_LABELS: Record<PrivilegeLevel, string> = {
  // Developers are shown as Admins; the role is internal.
  Developer: "Admin",
  Admin: "Admin",
  Leader: "Leader",
  RequestAccess: "Request Access user",
  ReadAccess: "Read Access user",
};

const RESIGNATION_METHOD_LABELS: Record<ResignationMethod, string> = {
  EMAIL: "email",
  MAIL: "mail",
};

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  EXECUTIVE_COMMITTEE: "Executive Committee meeting",
  OTHER: "Meeting",
};

const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  PETITIONED: "petitioned",
  APPOINTED: "appointed",
};

/** "by Admin Jane Doe", or "by a Leader" when the name is withheld. */
export function describeActor(
  actor: HistoryEvent["actor"],
  showAdminDetail: boolean,
): string {
  const role = ROLE_LABELS[actor.role] ?? actor.role;
  if (showAdminDetail && actor.name) return `by ${role} ${actor.name}`;
  return `by ${/^[AEIOU]/.test(role) ? "an" : "a"} ${role}`;
}

/** The member line: "Jane Doe · Seat 2". */
export function describeMember(member: HistoryEvent["member"]): string {
  return member.seatNumber !== null
    ? `${member.name} · Seat ${member.seatNumber}`
    : member.name;
}

function describeMeeting(
  meeting: NonNullable<
    Extract<HistoryEvent, { kind: "confirmed" }>["meeting"]
  >,
  showAdminDetail: boolean,
): string[] {
  const lines = [
    `At the ${MEETING_TYPE_LABELS[meeting.meetingType] ?? "meeting"} of ${formatCalendarDateForDisplay(meeting.meetingDate)}`,
  ];
  if (showAdminDetail && meeting.notes) lines.push(`Meeting notes: ${meeting.notes}`);
  return lines;
}

/**
 * Membership type is shown to Admins only: whether "petitioned" is itself a
 * petition reference for Leaders is unresolved (petition-visibility group C),
 * so this stays one switch.
 */
function membershipTypeSuffix(
  type: MembershipType | null | undefined,
  showAdminDetail: boolean,
): string {
  if (!showAdminDetail || !type) return "";
  return ` as ${MEMBERSHIP_TYPE_LABELS[type] ?? type.toLowerCase()} member`;
}

/** Describes one event. `petition_outcome` events reach here only for Admins. */
export function describeHistoryEvent(
  event: HistoryEvent,
  showAdminDetail: boolean,
): HistoryEventView {
  const details: string[] = [];
  const admin = showAdminDetail;

  switch (event.kind) {
    case "submitted": {
      if (admin && event.replacementFor) {
        details.push(`To replace ${describeMember(event.replacementFor)}`);
      }
      if (admin && event.requestNotes) details.push(`Request note: ${event.requestNotes}`);
      return { title: "Submitted for review", details };
    }
    case "rejected": {
      if (event.meeting) details.push(...describeMeeting(event.meeting, admin));
      if (admin && event.systemReason === "capacity") {
        details.push("Rejected automatically: the committee was full");
      } else if (admin && event.rejectionNote) {
        details.push(`Reason: ${event.rejectionNote}`);
      }
      return { title: "Submission rejected", details };
    }
    case "confirmed": {
      if (event.meeting) details.push(...describeMeeting(event.meeting, admin));
      return {
        title: `Submission accepted${membershipTypeSuffix(event.membershipType, admin)}`,
        details,
      };
    }
    case "activated": {
      if (admin && event.overrideReason) details.push(`Override reason: ${event.overrideReason}`);
      const warnings = admin ? (event.eligibilityWarnings?.length ?? 0) : 0;
      if (warnings > 0) {
        details.push(
          `Added with ${warnings} eligibility warning${warnings === 1 ? "" : "s"}`,
        );
      }
      const suffix = membershipTypeSuffix(event.membershipType, admin);
      switch (event.source) {
        case "bulk_import_sync":
          return { title: `Added by a committee file import${suffix}`, details };
        case "discrepancy_accept":
          return { title: `Added when a discrepancy was resolved${suffix}`, details };
        case "discrepancy_undo":
          return { title: `Restored when a discrepancy resolution was undone${suffix}`, details };
        default:
          return { title: `Added${suffix}`, details };
      }
    }
    case "resigned": {
      if (event.effectiveDate) {
        details.push(
          `Resignation received ${formatCalendarDateForDisplay(event.effectiveDate)}${
            admin && event.method
              ? ` by ${RESIGNATION_METHOD_LABELS[event.method] ?? event.method.toLowerCase()}`
              : ""
          }`,
        );
      } else if (admin && event.method) {
        details.push(
          `Resignation received by ${RESIGNATION_METHOD_LABELS[event.method] ?? event.method.toLowerCase()}`,
        );
      }
      if (admin && event.reason) details.push(`Reason: ${REMOVAL_REASON_LABELS[event.reason] ?? event.reason}`);
      if (admin && event.notes) details.push(`Notes: ${event.notes}`);
      return {
        title:
          event.source === "discrepancy_undo"
            ? "Resigned (restored when a discrepancy resolution was undone)"
            : "Resigned",
        details,
      };
    }
    case "removed": {
      if (admin && event.replacedBy) details.push(`Replaced by ${describeMember(event.replacedBy)}`);
      if (admin && event.reason) details.push(`Reason: ${REMOVAL_REASON_LABELS[event.reason] ?? event.reason}`);
      if (admin && event.notes) details.push(`Notes: ${event.notes}`);
      switch (event.source) {
        case "bulk_import_sync":
          return { title: "Removed by a committee file import", details };
        case "boe_flagging":
          return { title: "Removed after an eligibility flag review", details };
        case "discrepancy_undo":
          return { title: "Removed when a discrepancy resolution was undone", details };
        default:
          return { title: "Removed", details };
      }
    }
    case "petition_outcome": {
      const seat = event.seatNumber !== null ? ` seat ${event.seatNumber}` : "";
      const verb =
        event.outcome === "won"
          ? `won${seat}`
          : event.outcome === "lost"
            ? `lost${seat}`
            : `tied for${seat || " a seat"}`;
      if (event.voteCount !== null) {
        details.push(`${event.voteCount} vote${event.voteCount === 1 ? "" : "s"}`);
      }
      if (event.primaryDate) {
        details.push(`Primary of ${formatCalendarDateForDisplay(event.primaryDate)}`);
      }
      if (event.reversed) {
        details.push("Restored when a discrepancy resolution was undone, not a new result");
      }
      return { title: `Election result recorded: ${verb}`, details };
    }
  }
}

/**
 * The events the timeline shows. `petition_outcome` events are Admin-only:
 * the server already omits them for Leaders, and this drops them again for any
 * acting role below Admin (defence in depth, and the acting-as simulation).
 */
export function timelineEvents(
  events: readonly HistoryEvent[],
  canSeeElectionOutcomes: boolean,
): HistoryEvent[] {
  return canSeeElectionOutcomes
    ? [...events]
    : events.filter((e) => e.kind !== "petition_outcome");
}

// --- Election outcomes (Admin only) -----------------------------------------

export type ElectionOutcomeRow = {
  id: string;
  candidate: string;
  seat: number | null;
  outcome: string;
  votes: number | null;
  primaryDate: string | null;
};

const OUTCOME_STATUS_LABELS: Partial<Record<MembershipStatus, string>> = {
  ACTIVE: "Won",
  PETITIONED_LOST: "Lost",
  PETITIONED_TIE: "Tie",
};

const LATER_STATUS_LABELS: Partial<Record<MembershipStatus, string>> = {
  RESIGNED: "resigned",
  REMOVED: "removed",
  SUBMITTED: "submitted for review",
  REJECTED: "rejected",
  CONFIRMED: "confirmed",
};

/**
 * One row per candidate, ordered by petition seat then candidate. A candidate
 * whose membership has since moved on shows its current status ("Now
 * resigned") rather than a guessed result: `petitionContext` reports the
 * current status once the member has left.
 */
export function electionOutcomeRows(
  context: readonly PetitionOutcomeContext[],
): ElectionOutcomeRow[] {
  return context
    .map((row) => {
      const candidate = row.voter
        ? [row.voter.firstName, row.voter.lastName].filter(Boolean).join(" ") ||
          row.voterRecordId
        : row.voterRecordId;
      const outcome =
        OUTCOME_STATUS_LABELS[row.status] ??
        `Now ${LATER_STATUS_LABELS[row.status] ?? row.status.toLowerCase()}`;
      return {
        id: row.id,
        candidate,
        seat: row.petitionSeatNumber,
        outcome,
        votes: row.petitionVoteCount,
        primaryDate: row.petitionPrimaryDate
          ? formatCalendarDateForDisplay(row.petitionPrimaryDate)
          : null,
      };
    })
    .sort(
      (a, b) =>
        (a.seat ?? Number.MAX_SAFE_INTEGER) - (b.seat ?? Number.MAX_SAFE_INTEGER) ||
        a.candidate.localeCompare(b.candidate),
    );
}

/** "2 won · 1 lost · 0 tied", counted from the outcome labels. */
export function electionOutcomeCounts(rows: readonly ElectionOutcomeRow[]): {
  won: number;
  lost: number;
  tie: number;
} {
  return rows.reduce(
    (acc, r) => {
      if (r.outcome === "Won") acc.won += 1;
      else if (r.outcome === "Lost") acc.lost += 1;
      else if (r.outcome === "Tie") acc.tie += 1;
      return acc;
    },
    { won: 0, lost: 0, tie: 0 },
  );
}
