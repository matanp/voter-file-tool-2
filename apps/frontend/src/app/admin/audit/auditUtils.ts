import { AuditAction } from "@prisma/client";
import type { AuditMembershipSubject } from "~/lib/auditMembershipSubject";

/** Human-readable labels for AuditAction enum. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  MEMBER_SUBMITTED: "Member Submitted",
  MEMBER_REJECTED: "Member Rejected",
  MEMBER_CONFIRMED: "Member Confirmed",
  MEMBER_ACTIVATED: "Member Activated",
  MEMBER_RESIGNED: "Member Resigned",
  MEMBER_REMOVED: "Member Removed",
  PETITION_RECORDED: "Petition Recorded",
  MEETING_CREATED: "Meeting Created",
  REPORT_GENERATED: "Report Generated",
  TERM_CREATED: "Term Created",
  GOVERNANCE_CONFIG_UPDATED: "Governance Config Updated",
  JURISDICTION_ASSIGNED: "Jurisdiction Assigned",
  JURISDICTION_REMOVED: "Jurisdiction Removed",
  DISCREPANCY_RESOLVED: "Discrepancy Resolved",
  CROSSWALK_IMPORTED: "Crosswalk Imported",
};

/** Entity types shown in the filter dropdown. */
export const AUDIT_ENTITY_TYPES = [
  "CommitteeMembership",
  "MeetingRecord",
  "CommitteeTerm",
  "CommitteeGovernanceConfig",
  "Report",
] as const;

export type AuditEntityTypeOption = (typeof AUDIT_ENTITY_TYPES)[number];

/** Minimal audit entry shape used to generate a summary (from API list/detail or export row). */
export interface AuditEntryForSummary {
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Parses metadata.subject when present on a CommitteeMembership audit entry. */
export function extractMembershipSubject(
  metadata: unknown,
): AuditMembershipSubject | null {
  if (!isRecord(metadata) || !isRecord(metadata.subject)) {
    return null;
  }

  const subject = metadata.subject;
  const memberName =
    typeof subject.memberName === "string" ? subject.memberName : null;
  const voterRecordId =
    typeof subject.voterRecordId === "string" ? subject.voterRecordId : null;
  const committeeListId =
    typeof subject.committeeListId === "number" ? subject.committeeListId : null;
  const termId = typeof subject.termId === "string" ? subject.termId : null;
  const termLabel =
    typeof subject.termLabel === "string" ? subject.termLabel : null;
  const cityTown =
    typeof subject.cityTown === "string" ? subject.cityTown : null;
  const electionDistrict =
    typeof subject.electionDistrict === "number"
      ? subject.electionDistrict
      : null;

  if (
    memberName == null ||
    voterRecordId == null ||
    committeeListId == null ||
    termId == null ||
    termLabel == null ||
    cityTown == null ||
    electionDistrict == null
  ) {
    return null;
  }

  const legDistrict =
    typeof subject.legDistrict === "number" ? subject.legDistrict : null;
  const seatNumber =
    typeof subject.seatNumber === "number"
      ? subject.seatNumber
      : subject.seatNumber === null
        ? null
        : undefined;

  return {
    memberName,
    voterRecordId,
    committeeListId,
    termId,
    termLabel,
    cityTown,
    legDistrict,
    electionDistrict,
    ...(seatNumber !== undefined ? { seatNumber } : {}),
  };
}

/** Formats committee location from a membership subject snapshot. */
export function formatCommitteeLocation(
  subject: Pick<
    AuditMembershipSubject,
    "cityTown" | "legDistrict" | "electionDistrict"
  >,
): string {
  const locationParts: string[] = [subject.cityTown];
  if (subject.legDistrict != null) {
    locationParts.push(`LD ${subject.legDistrict}`);
  }
  locationParts.push(`ED ${subject.electionDistrict}`);
  return locationParts.join(" ");
}

/** Formats committee context including optional seat and term label. */
export function formatCommitteeContext(subject: AuditMembershipSubject): string {
  const location = formatCommitteeLocation(subject);
  const seatPart =
    subject.seatNumber != null ? ` · Seat ${subject.seatNumber}` : "";
  return `${location}${seatPart} · ${subject.termLabel}`;
}

type SummaryContext = {
  name: string | null;
  location: string | null;
  seatNumber: number | null;
};

/** Resolves display fields from metadata.subject and legacy flat fields. */
function resolveSummaryContext(entry: AuditEntryForSummary): SummaryContext {
  const after = entry.afterValue ?? {};
  const meta = entry.metadata ?? {};
  const subject = extractMembershipSubject(meta);

  const rawName =
    subject?.memberName ??
    (typeof after.memberName === "string"
      ? after.memberName
      : typeof after.name === "string"
        ? after.name
        : typeof meta.memberName === "string"
          ? meta.memberName
          : null);
  const name = rawName === "" ? null : rawName;

  const location = subject
    ? formatCommitteeLocation(subject)
    : (() => {
        const cityTown =
          typeof after.cityTown === "string" ? after.cityTown : null;
        const legDistrict =
          typeof after.legDistrict === "number"
            ? after.legDistrict
            : typeof after.legDistrict === "string"
              ? parseInt(after.legDistrict, 10)
              : null;
        const electionDistrict =
          typeof after.electionDistrict === "number"
            ? after.electionDistrict
            : typeof after.electionDistrict === "string"
              ? parseInt(after.electionDistrict, 10)
              : null;

        const locationParts: string[] = [];
        if (cityTown) locationParts.push(cityTown);
        if (legDistrict != null && !Number.isNaN(legDistrict)) {
          locationParts.push(`LD ${legDistrict}`);
        }
        if (electionDistrict != null && !Number.isNaN(electionDistrict)) {
          locationParts.push(`ED ${electionDistrict}`);
        }
        return locationParts.length > 0 ? locationParts.join(" ") : null;
      })();

  const seatNumber =
    subject?.seatNumber ??
    (typeof after.seatNumber === "number"
      ? after.seatNumber
      : typeof after.seatNumber === "string"
        ? parseInt(after.seatNumber, 10)
        : null);

  return {
    name,
    location,
    seatNumber:
      seatNumber != null && !Number.isNaN(seatNumber) ? seatNumber : null,
  };
}

/** Produces a human-readable one-liner for the audit entry. */
export function buildSummary(entry: AuditEntryForSummary): string {
  const { action, entityType, entityId, afterValue, metadata } = entry;
  const after = afterValue ?? {};
  const meta = metadata ?? {};
  const { name, location, seatNumber } = resolveSummaryContext(entry);

  const removalReason =
    typeof after.removalReason === "string"
      ? after.removalReason
      : typeof meta.removalReason === "string"
        ? meta.removalReason
        : null;

  switch (action) {
    case AuditAction.MEMBER_ACTIVATED:
      if (entityType === "CommitteeMembership" && (name ?? location)) {
        return `${name ?? "Member"} activated${location ? ` in ${location}` : ""}${seatNumber != null ? ` Seat ${seatNumber}` : ""}`.trim();
      }
      return `Member activated (${entityType})`;
    case AuditAction.MEMBER_REMOVED:
      if (entityType === "CommitteeMembership") {
        const who = name ?? "Member";
        return removalReason ? `${who} removed (${removalReason})` : `${who} removed`;
      }
      return `Removed (${entityType})`;
    case AuditAction.MEMBER_RESIGNED:
      if (entityType === "CommitteeMembership" && (name ?? location)) {
        return `${name ?? "Member"} resigned${location ? ` from ${location}` : ""}`.trim();
      }
      return `Member resigned (${entityType})`;
    case "MEMBER_SUBMITTED":
      return entityType === "CommitteeMembership"
        ? `${name ?? "Member"} submitted for committee${location ? ` (${location})` : ""}`
        : `Submitted (${entityType})`;
    case AuditAction.MEMBER_REJECTED:
      return entityType === "CommitteeMembership"
        ? `${name ?? "Request"} rejected${location ? ` (${location})` : ""}`
        : `Rejected (${entityType})`;
    case AuditAction.MEMBER_CONFIRMED:
      return entityType === "CommitteeMembership"
        ? `${name ?? "Member"} confirmed${location ? ` (${location})` : ""}`
        : `Confirmed (${entityType})`;
    case "PETITION_RECORDED":
      if (location && seatNumber != null) {
        return `Petition outcome recorded for ${location} Seat ${seatNumber}`;
      }
      if (location) return `Petition outcome recorded for ${location}`;
      return "Petition outcome recorded";
    case AuditAction.MEETING_CREATED:
      return typeof after.title === "string"
        ? `Meeting created: ${after.title}`
        : "Meeting created";
    case "REPORT_GENERATED":
      return typeof after.title === "string"
        ? `Report generated: ${after.title}`
        : "Report generated";
    case AuditAction.TERM_CREATED:
      return typeof after.label === "string"
        ? `Term created: ${after.label}`
        : "Term created";
    case AuditAction.GOVERNANCE_CONFIG_UPDATED:
      return "Governance config updated";
    case "JURISDICTION_ASSIGNED":
      return location ? `Jurisdiction assigned: ${location}` : "Jurisdiction assigned";
    case AuditAction.DISCREPANCY_RESOLVED:
      return entityType === "CommitteeMembership"
        ? `Discrepancy resolved${name ? `: ${name}` : ""}`
        : "Discrepancy resolved";
    default:
      return `${AUDIT_ACTION_LABELS[action] ?? action} — ${entityType} ${entityId.slice(0, 8)}`;
  }
}

/** Builds a drawer title from action label and summary text. */
export function buildDrawerTitle(entry: AuditEntryForSummary & { timestamp?: string }): string {
  const summary = buildSummary(entry);
  const actionLabel = AUDIT_ACTION_LABELS[entry.action] ?? entry.action;
  return `${actionLabel} — ${summary}`;
}
