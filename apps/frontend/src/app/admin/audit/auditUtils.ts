import { AuditAction } from "@prisma/client";

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

/** Produces a human-readable one-liner for the audit entry. */
export function buildSummary(entry: AuditEntryForSummary): string {
  const { action, entityType, entityId, afterValue, metadata } = entry;
  const after = afterValue ?? {};
  const meta = metadata ?? {};

  const removalReason =
    typeof after.removalReason === "string"
      ? after.removalReason
      : typeof meta.removalReason === "string"
        ? meta.removalReason
        : null;

  const name =
    typeof after.memberName === "string"
      ? after.memberName
      : typeof after.name === "string"
        ? after.name
        : typeof meta.memberName === "string"
          ? meta.memberName
          : null;

  const cityTown = typeof after.cityTown === "string" ? after.cityTown : null;
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
  const seatNumber =
    typeof after.seatNumber === "number"
      ? after.seatNumber
      : typeof after.seatNumber === "string"
        ? parseInt(after.seatNumber, 10)
        : null;

  const locationParts: string[] = [];
  if (cityTown) locationParts.push(cityTown);
  if (legDistrict != null && !Number.isNaN(legDistrict))
    locationParts.push(`LD ${legDistrict}`);
  if (electionDistrict != null && !Number.isNaN(electionDistrict))
    locationParts.push(`ED ${electionDistrict}`);
  const location = locationParts.length > 0 ? locationParts.join(" ") : null;

  switch (action) {
    case AuditAction.MEMBER_ACTIVATED:
      if (entityType === "CommitteeMembership" && (name || location)) {
        return `${name ?? "Member"} activated${location ? ` in ${location}` : ""}${seatNumber != null && !Number.isNaN(seatNumber) ? ` Seat ${seatNumber}` : ""}`.trim();
      }
      return `Member activated (${entityType})`;
    case AuditAction.MEMBER_REMOVED:
      if (entityType === "CommitteeMembership") {
        const who = name ?? "Member";
        return removalReason ? `${who} removed (${removalReason})` : `${who} removed`;
      }
      return `Removed (${entityType})`;
    case AuditAction.MEMBER_RESIGNED:
      if (entityType === "CommitteeMembership" && (name || location)) {
        return `${name ?? "Member"} resigned${location ? ` from ${location}` : ""}`.trim();
      }
      return `Member resigned (${entityType})`;
    case "MEMBER_SUBMITTED":
      return entityType === "CommitteeMembership"
        ? `${name ?? "Member"} submitted for committee`
        : `Submitted (${entityType})`;
    case AuditAction.MEMBER_REJECTED:
      return entityType === "CommitteeMembership"
        ? `${name ?? "Request"} rejected`
        : `Rejected (${entityType})`;
    case AuditAction.MEMBER_CONFIRMED:
      return entityType === "CommitteeMembership"
        ? `${name ?? "Member"} confirmed`
        : `Confirmed (${entityType})`;
    case "PETITION_RECORDED":
      if (location && seatNumber != null && !Number.isNaN(seatNumber)) {
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
    case "JURISDICTION_ASSIGNED":
      return location ? `Jurisdiction assigned: ${location}` : "Jurisdiction assigned";
    case AuditAction.DISCREPANCY_RESOLVED:
      return entityType === "CommitteeMembership"
        ? `Discrepancy resolved (${entityId})`
        : "Discrepancy resolved";
    default:
      return `${AUDIT_ACTION_LABELS[action] ?? action} — ${entityType} ${entityId.slice(0, 8)}`;
  }
}
