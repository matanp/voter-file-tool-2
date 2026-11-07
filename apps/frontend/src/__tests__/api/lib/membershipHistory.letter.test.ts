/** Committee History's Resignation Letter pieces (ticket 08 decisions 12, 16). */
import { buildHistoryEvents, type HistoryAuditRow, type HistoryMembershipRow } from "~/app/api/lib/membershipHistory";

const membership: HistoryMembershipRow = {
  id: "m-1",
  voterRecordId: "V1",
  seatNumber: null,
  submissionMetadata: null,
  voterRecord: { firstName: "Rita", middleInitial: null, lastName: "Resigned" },
  status: "RESIGNED",
  resignationLetterKey: "resignation-letters/m-1/a.pdf",
  resignationLetterContentType: "application/pdf",
  resignationLetterFileName: "a.pdf",
};

const auditRow = (overrides: Partial<HistoryAuditRow>): HistoryAuditRow => ({
  id: "a-1",
  action: "MEMBER_RESIGNED",
  entityId: "m-1",
  timestamp: new Date("2026-11-01T00:00:00Z"),
  userRole: "Admin",
  beforeValue: null,
  afterValue: { status: "RESIGNED", resignationDateReceived: "2026-10-29" },
  metadata: {},
  user: { name: "Ada Admin" },
  ...overrides,
});

const rows = [
  auditRow({
    id: "a-3",
    action: "RESIGNATION_LETTER_ATTACHED",
    afterValue: { resignationLetterFileName: "a.pdf" },
    metadata: { previousLetterKey: "resignation-letters/m-1/old.pdf" },
  }),
  auditRow({ id: "a-2" }),
  // An earlier resignation cycle of the same membership.
  auditRow({ id: "a-1", timestamp: new Date("2025-01-01T00:00:00Z") }),
];

const build = (isAdmin: boolean) =>
  buildHistoryEvents(rows, {
    isAdmin,
    membershipsById: new Map([["m-1", membership]]),
    membershipsByVoterRecordId: new Map([["V1", membership]]),
    meetingsById: new Map(),
  });

describe("history letter events", () => {
  it("should give an Admin the letter target on the newest resignation only", () => {
    const resigned = build(true).filter((e) => e.kind === "resigned");
    expect(resigned.map((e) => e.kind === "resigned" && e.letterTarget)).toEqual([
      {
        membershipId: "m-1",
        letter: { fileName: "a.pdf", contentType: "application/pdf" },
      },
      undefined,
    ]);
  });

  it("should show an Admin the letter attach as a replacement", () => {
    expect(build(true)[0]).toMatchObject({
      kind: "letter_attached",
      fileName: "a.pdf",
      replaced: true,
    });
  });

  it("should give a Leader neither the letter target nor the attach event", () => {
    const events = build(false);
    expect(events.some((e) => e.kind === "letter_attached")).toBe(false);
    expect(
      events.every((e) => e.kind !== "resigned" || e.letterTarget === undefined),
    ).toBe(true);
  });
});
