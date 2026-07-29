import { AuditAction } from "@prisma/client";
import {
  buildSummary,
  extractMembershipSubject,
  formatCommitteeLocation,
  formatCommitteeContext,
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
