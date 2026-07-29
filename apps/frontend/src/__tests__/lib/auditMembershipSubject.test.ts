import {
  buildMembershipAuditSubject,
  fetchMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import { prismaMock } from "../utils/mocks";
import { createMockCommittee, createMockVoterRecord, DEFAULT_ACTIVE_TERM_ID } from "../utils/testUtils";

describe("auditMembershipSubject", () => {
  const voterRecord = createMockVoterRecord({
    firstName: "Jane",
    lastName: "Smith",
  });
  const committee = createMockCommittee();
  const term = { id: DEFAULT_ACTIVE_TERM_ID, label: "2024–2026" };

  it("buildMembershipAuditSubject formats member and committee context", () => {
    const subject = buildMembershipAuditSubject({
      voterRecord,
      committee,
      term,
      seatNumber: 2,
    });

    expect(subject).toEqual({
      memberName: "Jane Smith",
      voterRecordId: "TEST123456",
      committeeListId: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      termLabel: "2024–2026",
      cityTown: "Test City",
      legDistrict: 1,
      electionDistrict: 1,
      seatNumber: 2,
    });
  });

  it("mergeAuditMetadata attaches subject without overwriting existing subject", () => {
    const subject = buildMembershipAuditSubject({
      voterRecord,
      committee,
      term,
    });
    const merged = mergeAuditMetadata({ source: "manual" }, subject);

    expect(merged).toEqual({
      source: "manual",
      subject,
    });

    const existing = mergeAuditMetadata(
      { source: "manual", subject: { memberName: "Existing" } },
      subject,
    );
    expect(existing).toEqual({
      source: "manual",
      subject: { memberName: "Existing" },
    });
  });

  it("fetchMembershipAuditSubject loads related records", async () => {
    prismaMock.voterRecord.findUnique.mockResolvedValue(voterRecord);
    prismaMock.committeeList.findUnique.mockResolvedValue({
      id: committee.id,
      cityTown: committee.cityTown,
      legDistrict: committee.legDistrict,
      electionDistrict: committee.electionDistrict,
      term,
    } as never);

    const subject = await fetchMembershipAuditSubject(prismaMock, {
      voterRecordId: voterRecord.VRCNUM,
      committeeListId: committee.id,
      termId: term.id,
      seatNumber: 3,
    });

    expect(subject.memberName).toBe("Jane Smith");
    expect(subject.seatNumber).toBe(3);
  });
});
