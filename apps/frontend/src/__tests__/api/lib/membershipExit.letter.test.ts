/**
 * The letter columns in `writeMembershipExit` and the other membership writes
 * (ticket 08), against the mocked Prisma client. The CHECK constraints
 * themselves are in membershipExit.pg.integration.test.ts.
 */
import type { CommitteeMembership } from "@prisma/client";
import {
  writeMembershipExit,
  writeMembershipLeavingActive,
  type ExitReportState,
} from "~/app/api/lib/membershipExit";
import { CLEARED_LETTER_FIELDS } from "~/lib/resignationLetter";
import { createMockMembership, selectedRow } from "../../utils/testUtils";
import { prismaMock } from "../../utils/mocks";

const state: ExitReportState = {
  id: "m-1",
  exitReportedAt: new Date("2026-10-30T00:00:00Z"),
  exitReportedById: "leader-1",
  exitReportedKind: "RESIGNATION",
};

const removal = {
  status: "REMOVED",
  resignationDateReceived: null,
  resignationMethod: null,
  removalReason: "OTHER",
  removalNotes: null,
} as const;

const resignation = {
  status: "RESIGNED",
  resignationDateReceived: new Date("2026-10-29"),
  resignationMethod: "EMAIL",
  removalReason: null,
  removalNotes: null,
} as const;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.committeeMembership.update.mockResolvedValue(
    selectedRow<CommitteeMembership>(createMockMembership()),
  );
});

const written = () => prismaMock.committeeMembership.update.mock.calls[0]![0].data;

describe("writeMembershipExit letter", () => {
  it("should clear the letter by default", async () => {
    await writeMembershipExit(prismaMock, state, removal);
    expect(written()).toMatchObject(CLEARED_LETTER_FIELDS);
  });

  it("should leave the columns alone with keepReported", async () => {
    await writeMembershipExit(prismaMock, state, { ...resignation, letter: "keepReported" });
    expect(written()).not.toHaveProperty("resignationLetterKey");
  });

  it("should write a new upload", async () => {
    await writeMembershipExit(prismaMock, state, {
      ...resignation,
      letter: { key: "resignation-letters/m-1/b.png", contentType: "image/png", fileName: "b.png" },
    });
    expect(written()).toMatchObject({
      resignationLetterKey: "resignation-letters/m-1/b.png",
      resignationLetterContentType: "image/png",
      resignationLetterFileName: "b.png",
    });
  });

  it("should refuse a removal that keeps a letter", async () => {
    await expect(
      writeMembershipExit(prismaMock, state, { ...removal, letter: "keepReported" }),
    ).rejects.toThrow(/Only a resignation/);
    expect(prismaMock.committeeMembership.update).not.toHaveBeenCalled();
  });
});

describe("writeMembershipLeavingActive", () => {
  it("should clear the pending letter", async () => {
    await writeMembershipLeavingActive(prismaMock, state, { status: "PETITIONED_LOST" });
    expect(written()).toMatchObject(CLEARED_LETTER_FIELDS);
  });
});
