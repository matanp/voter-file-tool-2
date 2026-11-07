/**
 * `writeMembershipExit`'s required `letter` option and the other letter
 * writes (ticket 08), against the mocked Prisma client. The CHECK
 * constraints themselves are in membershipExit.pg.integration.test.ts.
 */
import {
  CLEARED_LETTER_FIELDS,
  writeMembershipExit,
  writeMembershipLeavingActive,
  type ExitReportState,
  type MembershipExit,
} from "~/app/api/lib/membershipExit";
import { createMockMembership, selectedRow } from "../../utils/testUtils";
import { prismaMock } from "../../utils/mocks";

const LETTER = {
  key: "resignation-letters/m-1/a.pdf",
  contentType: "application/pdf" as const,
  fileName: "a.pdf",
};

const withLetter: ExitReportState = {
  id: "m-1",
  exitReportedAt: new Date("2026-10-30T00:00:00Z"),
  exitReportedById: "leader-1",
  exitReportedKind: "RESIGNATION",
  resignationLetterKey: LETTER.key,
  resignationLetterContentType: LETTER.contentType,
  resignationLetterFileName: LETTER.fileName,
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
    selectedRow(createMockMembership()),
  );
});

const written = () => prismaMock.committeeMembership.update.mock.calls[0]![0].data;

describe("writeMembershipExit letter option", () => {
  it("should require the option at compile time", () => {
    // @ts-expect-error `letter` is required so no path can drop a letter silently.
    const missing: MembershipExit = { ...removal };
    expect(missing).toBeDefined();
  });

  it("should detach: clear the columns and hand the letter back", async () => {
    const result = await writeMembershipExit(prismaMock, withLetter, {
      ...removal,
      letter: "detach",
    });
    expect(written()).toMatchObject(CLEARED_LETTER_FIELDS);
    expect(result).toMatchObject({ kind: "written", detachedLetter: LETTER, letter: null });
  });

  it("should keep: leave the columns alone", async () => {
    const result = await writeMembershipExit(prismaMock, withLetter, {
      ...resignation,
      letter: "keep",
    });
    expect(written()).not.toHaveProperty("resignationLetterKey");
    expect(result).toMatchObject({ detachedLetter: null, letter: LETTER });
  });

  it("should attach a new letter and detach the pending one it replaces", async () => {
    const upload = { ...LETTER, key: "resignation-letters/m-1/b.png", contentType: "image/png" as const };
    const result = await writeMembershipExit(prismaMock, withLetter, {
      ...resignation,
      letter: upload,
    });
    expect(written()).toMatchObject({
      resignationLetterKey: upload.key,
      resignationLetterContentType: "image/png",
    });
    expect(result).toMatchObject({ detachedLetter: LETTER, letter: upload });
  });

  it("should refuse a removal that keeps or attaches a letter", async () => {
    await expect(
      writeMembershipExit(prismaMock, withLetter, { ...removal, letter: "keep" }),
    ).rejects.toThrow(/removal can only detach/);
    expect(prismaMock.committeeMembership.update).not.toHaveBeenCalled();
  });
});

describe("writeMembershipLeavingActive", () => {
  it("should always detach the pending letter", async () => {
    const result = await writeMembershipLeavingActive(prismaMock, withLetter, {
      status: "PETITIONED_LOST",
    });
    expect(written()).toMatchObject(CLEARED_LETTER_FIELDS);
    expect(result).toMatchObject({ kind: "written", detachedLetter: LETTER });
  });
});
