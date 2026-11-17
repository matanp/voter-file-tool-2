/** Committee History's "View letter" on a recorded resignation (ticket 08 decision 16). */
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

const letters = (isAdmin: boolean) =>
  build(isAdmin).map((e) => (e.kind === "resigned" ? e.letter : "not resigned"));

describe("history letter link", () => {
  it("should give an Admin the letter on the newest resignation only", () => {
    expect(letters(true)).toEqual([{ membershipId: "m-1", fileName: "a.pdf" }, undefined]);
  });

  it("should never give a Leader the letter", () => {
    expect(letters(false)).toEqual([undefined, undefined]);
  });
});
