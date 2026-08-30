import { AuditAction } from "@prisma/client";
import {
  AUDIT_ENTITY_TYPE_OPTIONS,
  buildSummary,
  extractMembershipSubject,
  formatCommitteeLocation,
  formatCommitteeContext,
  formatEntityTypeLabel,
  getAuditEntityTypeOption,
} from "~/app/admin/audit/auditUtils";
import { DEFAULT_ACTIVE_TERM_ID } from "../../../utils/testUtils";

const membershipSubject = {
  memberName: "Jane Smith",
  voterRecordId: "VRC123",
  committeeListId: 1,
  termId: DEFAULT_ACTIVE_TERM_ID,
  termLabel: "2024–2026",
  cityTown: "Brighton",
  legDistrict: 28,
  electionDistrict: 3,
  seatNumber: 2,
};

describe("auditUtils membership subject", () => {
  it("extractMembershipSubject parses metadata.subject", () => {
    expect(
      extractMembershipSubject({ subject: membershipSubject }),
    ).toEqual(membershipSubject);
    expect(extractMembershipSubject(null)).toBeNull();
  });

  it("formatCommitteeLocation and formatCommitteeContext render readable labels", () => {
    expect(formatCommitteeLocation(membershipSubject)).toBe(
      "Brighton LD 28 ED 3",
    );
    expect(formatCommitteeContext(membershipSubject)).toBe(
      "Brighton LD 28 ED 3 · Seat 2 · 2024–2026",
    );
  });

  it("buildSummary uses metadata.subject for membership actions", () => {
    const baseEntry = {
      entityType: "CommitteeMembership",
      entityId: "cm-1",
      beforeValue: { status: "ACTIVE" },
      afterValue: { status: "REMOVED", removalReason: "PARTY_CHANGE" },
      metadata: { subject: membershipSubject },
    };

    expect(
      buildSummary({
        ...baseEntry,
        action: AuditAction.MEMBER_ACTIVATED,
        afterValue: { status: "ACTIVE", seatNumber: 2 },
      }),
    ).toBe("Jane Smith activated in Brighton LD 28 ED 3 Seat 2");

    expect(
      buildSummary({
        ...baseEntry,
        action: AuditAction.MEMBER_REMOVED,
      }),
    ).toBe("Jane Smith removed (PARTY_CHANGE)");

    expect(
      buildSummary({
        entityType: "CommitteeMembership",
        entityId: "cm-1",
        action: AuditAction.MEMBER_SUBMITTED,
        afterValue: { status: "SUBMITTED" },
        metadata: { subject: membershipSubject },
      }),
    ).toBe("Jane Smith submitted for committee (Brighton LD 28 ED 3)");

    expect(
      buildSummary({
        entityType: "CommitteeMembership",
        entityId: "cm-1",
        action: AuditAction.PETITION_RECORDED,
        afterValue: { status: "ACTIVE", seatNumber: 2 },
        metadata: { subject: membershipSubject },
      }),
    ).toBe("Petition outcome recorded for Brighton LD 28 ED 3 Seat 2");
  });
});

describe("auditUtils entity type labels", () => {
  /**
   * Every entityType any code path writes to `AuditLog.entityType`.
   *
   * This list is maintained by hand, so it only catches drift if you update it —
   * re-derive it whenever you add audit logging. Note that `entityType` is the 4th
   * *positional* argument to the helpers, and that some writes bypass the helpers
   * entirely (`packages/shared-prisma/src/boeEligibilityFlagging.ts` calls
   * `db.auditLog.create` directly), so the search has to cover both:
   *
   *   grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist -A8 \
   *     -E 'logAuditEvent\(|logAuditEventOrThrow\(|auditLog\.create\(' apps packages
   */
  const LOGGED_ENTITY_TYPES = [
    "CommitteeMembership",
    "CommitteeTerm",
    "CommitteeUploadDiscrepancy",
    "MeetingRecord",
    "CommitteeGovernanceConfig",
    "UserJurisdiction",
    "EligibilityFlag",
    "LtedDistrictCrosswalk",
    "Seat",
  ] as const;

  it("formatEntityTypeLabel returns human-readable labels for known types", () => {
    expect(formatEntityTypeLabel("CommitteeMembership")).toBe("Committee membership");
    expect(formatEntityTypeLabel("MeetingRecord")).toBe("Meeting");
    expect(formatEntityTypeLabel("UserJurisdiction")).toBe("User jurisdiction");
  });

  it("formatEntityTypeLabel falls back to raw value for unknown types", () => {
    expect(formatEntityTypeLabel("FutureRecordType")).toBe("FutureRecordType");
  });

  it("AUDIT_ENTITY_TYPE_OPTIONS includes all currently logged entity types", () => {
    const optionValues = AUDIT_ENTITY_TYPE_OPTIONS.map((option) => option.value);
    for (const entityType of LOGGED_ENTITY_TYPES) {
      expect(optionValues).toContain(entityType);
    }
  });

  it("AUDIT_ENTITY_TYPE_OPTIONS offers no record type that is never logged", () => {
    // A filter option nothing writes always returns an empty table, which an admin
    // reads as "this never happened" instead of "this was never recorded".
    for (const option of AUDIT_ENTITY_TYPE_OPTIONS) {
      expect(LOGGED_ENTITY_TYPES).toContain(option.value);
    }
  });

  it("AUDIT_ENTITY_TYPE_OPTIONS is sorted alphabetically by label", () => {
    const labels = AUDIT_ENTITY_TYPE_OPTIONS.map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it("getAuditEntityTypeOption returns description for known types", () => {
    expect(getAuditEntityTypeOption("EligibilityFlag")).toEqual(
      expect.objectContaining({
        label: "Eligibility flag",
        description: "BOE eligibility flag reviews",
      }),
    );
    expect(getAuditEntityTypeOption("UnknownType")).toBeUndefined();
  });

  it("buildSummary fallback uses label for non-membership entity types", () => {
    expect(
      buildSummary({
        action: AuditAction.MEMBER_REMOVED,
        entityType: "EligibilityFlag",
        entityId: "flag-1",
      }),
    ).toBe("Removed (Eligibility flag)");
  });

  it("buildSummary describes term create, update, and activate", () => {
    expect(
      buildSummary({
        action: AuditAction.TERM_CREATED,
        entityType: "CommitteeTerm",
        entityId: "term-1",
        afterValue: { label: "2026–2028" },
      }),
    ).toBe("Term created: 2026–2028");

    expect(
      buildSummary({
        action: AuditAction.TERM_UPDATED,
        entityType: "CommitteeTerm",
        entityId: "term-1",
        afterValue: { label: "2026–2028" },
      }),
    ).toBe("Term updated: 2026–2028");

    expect(
      buildSummary({
        action: AuditAction.TERM_UPDATED,
        entityType: "CommitteeTerm",
        entityId: "term-1",
        afterValue: { label: "2026–2028", isActive: true },
      }),
    ).toBe("Term activated: 2026–2028");
  });
});
