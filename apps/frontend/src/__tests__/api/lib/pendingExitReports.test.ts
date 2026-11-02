import {
  toPendingExitReport,
  type PendingExitReportRow,
} from "~/app/api/lib/pendingExitReports";
import { createMockMembership } from "../../utils/testUtils";

const reportedAt = new Date("2026-11-01T12:34:56.789Z");

const row = (
  overrides: Partial<PendingExitReportRow> = {},
): PendingExitReportRow => ({
  ...createMockMembership({
    id: "m-1",
    status: "ACTIVE",
    seatNumber: 2,
    exitReportedAt: reportedAt,
    exitReportedById: "leader-1",
    exitReportedKind: "REMOVAL",
    removalReason: "OTHER",
    removalNotes: "Moved away",
  }),
  voterRecord: { VRCNUM: "V123", firstName: "Ada", lastName: null },
  exitReportedBy: { id: "leader-1", name: "Leader One" },
  ...overrides,
});

describe("toPendingExitReport", () => {
  it("includes Admin-only context for an Admin viewer", () => {
    expect(
      toPendingExitReport(row(), { userId: "admin-1", isAdmin: true }),
    ).toEqual({
      membershipId: "m-1",
      voterRecordId: "V123",
      firstName: "Ada",
      lastName: "",
      seatNumber: 2,
      kind: "REMOVAL",
      reportedAt: reportedAt.toISOString(),
      isOwnReport: false,
      reportedBy: { id: "leader-1", name: "Leader One" },
      removalReason: "OTHER",
      removalNotes: "Moved away",
      resignationDateReceived: null,
      resignationMethod: null,
    });
  });

  it("omits Admin-only context for a Leader and marks their own report", () => {
    const report = toPendingExitReport(row(), {
      userId: "leader-1",
      isAdmin: false,
    });
    expect(report).toMatchObject({ isOwnReport: true, kind: "REMOVAL" });
    expect(report).not.toHaveProperty("reportedBy");
    expect(report).not.toHaveProperty("removalNotes");
  });

  it("skips a row whose report fields are not set together", () => {
    expect(
      toPendingExitReport(row({ exitReportedKind: null }), {
        userId: "admin-1",
        isAdmin: true,
      }),
    ).toBeNull();
  });
});
