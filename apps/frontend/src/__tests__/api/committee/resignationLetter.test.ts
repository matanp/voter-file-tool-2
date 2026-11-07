/**
 * Resignation Letters (leader-feedback-2026-11 ticket 08) through the API:
 * the presign, the view access matrix, the late attach, and what file /
 * confirm / reject / Record resignation / removal / reactivation do with a
 * letter. R2 is mocked at the `s3Utils` boundary (jest.setup.ts); tokens are
 * real, signed with the test AUTH_SECRET.
 */
import { PrivilegeLevel, type UserJurisdiction } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { POST as uploadUrl } from "~/app/api/committee/resignation-letter/upload-url/route";
import { GET as viewLetter } from "~/app/api/committee/resignation-letter/route";
import { POST as attachLetter } from "~/app/api/committee/resignation-letter/attach/route";
import { POST as reportExit } from "~/app/api/committee/exitReport/route";
import { POST as confirmExitReport } from "~/app/api/committee/exitReport/confirm/route";
import { POST as rejectExitReport } from "~/app/api/committee/exitReport/reject/route";
import { POST as removeOrResign } from "~/app/api/committee/remove/route";
import { signStagingToken } from "~/app/api/lib/resignationLetterStorage";
import {
  copyObject,
  deleteObject,
  getPresignedReadUrl,
  getPresignedSizedUploadUrl,
  headObjectSize,
  readObjectPrefix,
} from "~/lib/s3Utils";
import {
  createMockCommittee,
  createMockMembership,
  createMockRequest,
  createMockSession,
  createMockVoterRecord,
  expectAuditLogCreate,
  jsonContaining,
  parseJsonResponse,
  selectedRow,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));

const REPORTED_AT = new Date("2026-10-30T15:04:05.678Z");
const MEMBERSHIP_ID = "membership-test-id-001";
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const LETTER_KEY = `resignation-letters/${MEMBERSHIP_ID}/old.pdf`;
const LETTER_COLUMNS = {
  resignationLetterKey: LETTER_KEY,
  resignationLetterContentType: "application/pdf",
  resignationLetterFileName: "old.pdf",
};
const NO_LETTER = {
  resignationLetterKey: null,
  resignationLetterContentType: null,
  resignationLetterFileName: null,
};

const memberKey = {
  cityTown: "Test City",
  legDistrict: 1,
  electionDistrict: 1,
  memberId: "TEST123456",
};

function signIn(privilegeLevel: PrivilegeLevel, granted = true) {
  mockAuthSession(createMockSession({ user: { privilegeLevel } }));
  mockHasPermission(granted);
}

function leaderJurisdictions(
  rows: Array<Pick<UserJurisdiction, "cityTown" | "legDistrict">>,
) {
  prismaMock.userJurisdiction.findMany.mockResolvedValue(
    rows.map((r, i) => ({
      id: `j-${i}`,
      userId: "test-user-id",
      termId: "term-default-2024-2026",
      createdAt: new Date("2026-01-01"),
      createdById: "admin-1",
      ...r,
    })),
  );
}

/** A staged upload the test user's presign would have produced. */
function staged(overrides: { userId?: string; membershipId?: string; expiresAt?: number } = {}) {
  const stagingKey = "resignation-letters/staging/s-1";
  return {
    stagingKey,
    fileName: "Signed letter.pdf",
    token: signStagingToken({
      stagingKey,
      userId: overrides.userId ?? "test-user-id",
      membershipId: overrides.membershipId ?? MEMBERSHIP_ID,
      contentType: "application/pdf",
      size: 6,
      expiresAt: overrides.expiresAt ?? Date.now() + 60_000,
    }),
  };
}

/** The staged object R2 holds: 6 bytes of PDF. */
function stagedObjectIsPdf() {
  jest.mocked(headObjectSize).mockResolvedValue(6);
  jest.mocked(readObjectPrefix).mockResolvedValue(PDF_BYTES);
}

function row(overrides: Parameters<typeof createMockMembership>[0] = {}) {
  return {
    ...createMockMembership({ status: "ACTIVE", seatNumber: 2, ...overrides }),
    voterRecord: createMockVoterRecord(),
    committeeList: createMockCommittee({ cityTown: "Test City", legDistrict: 1 }),
    term: { id: "term-default-2024-2026", label: "2024-2026" },
  };
}

function resolveMembership(r: object) {
  prismaMock.committeeMembership.findUnique.mockResolvedValue(selectedRow(r));
}

/** A pending resignation report carrying a letter. */
const reportedWithLetter = () =>
  row({
    exitReportedAt: REPORTED_AT,
    exitReportedById: "leader-1",
    exitReportedKind: "RESIGNATION",
    resignationDateReceived: new Date("2026-10-29"),
    resignationMethod: "EMAIL",
    ...LETTER_COLUMNS,
  });

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret";
});

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.committeeList.findUnique.mockResolvedValue(
    createMockCommittee({ cityTown: "Test City", legDistrict: 1 }),
  );
  prismaMock.voterRecord.findUnique.mockResolvedValue(createMockVoterRecord());
});

// --- Presign -------------------------------------------------------------------

describe("POST /api/committee/resignation-letter/upload-url", () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    ...memberKey,
    fileName: "letter.pdf",
    contentType: "application/pdf",
    size: 2048,
    ...overrides,
  });

  beforeEach(() => resolveMembership(row()));

  it("should return 401 when signed out", async () => {
    mockAuthSession(null);
    const response = await uploadUrl(createMockRequest(body()));
    expect(response.status).toBe(401);
  });

  it("should return 403 for ReadAccess", async () => {
    signIn(PrivilegeLevel.ReadAccess, false);
    const response = await uploadUrl(createMockRequest(body()));
    expect(response.status).toBe(403);
    expect(getPresignedSizedUploadUrl).not.toHaveBeenCalled();
  });

  it("should sign the declared type and size for a Leader in jurisdiction", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
    const response = await uploadUrl(createMockRequest(body()));
    expect(response.status).toBe(200);
    const grant = await parseJsonResponse<{ stagingKey: string; token: string }>(response);
    expect(grant.stagingKey).toMatch(/^resignation-letters\/staging\//);
    expect(getPresignedSizedUploadUrl).toHaveBeenCalledWith(
      grant.stagingKey,
      "application/pdf",
      2048,
      300,
    );
  });

  it("should return 403 for a Leader without jurisdiction", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Elsewhere", legDistrict: 9 }]);
    const response = await uploadUrl(createMockRequest(body()));
    expect(response.status).toBe(403);
    expect(getPresignedSizedUploadUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["a Word document", { contentType: "application/msword" }],
    ["a file over 10 MB", { size: 10 * 1024 * 1024 + 1 }],
    ["an empty file", { size: 0 }],
  ])("should refuse %s", async (_label, overrides) => {
    signIn(PrivilegeLevel.Admin);
    const response = await uploadUrl(createMockRequest(body(overrides)));
    expect(response.status).toBe(422);
    expect(getPresignedSizedUploadUrl).not.toHaveBeenCalled();
  });

  it("should refuse a Leader whose member already has a pending report (no editing)", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
    resolveMembership(reportedWithLetter());
    const response = await uploadUrl(createMockRequest(body()));
    expect(response.status).toBe(409);
  });

  it("should let only an Admin presign for a RESIGNED membership by id", async () => {
    resolveMembership(row({ status: "RESIGNED" }));
    const byId = { membershipId: MEMBERSHIP_ID, fileName: "a.pdf", contentType: "application/pdf", size: 10 };

    signIn(PrivilegeLevel.Leader);
    expect((await uploadUrl(createMockRequest(byId))).status).toBe(403);

    signIn(PrivilegeLevel.Admin);
    expect((await uploadUrl(createMockRequest(byId))).status).toBe(200);

    resolveMembership(row({ status: "REMOVED" }));
    expect((await uploadUrl(createMockRequest(byId))).status).toBe(400);
  });
});

// --- Viewing -----------------------------------------------------------------------

describe("GET /api/committee/resignation-letter", () => {
  const view = () =>
    viewLetter(
      createMockRequest({}, { membershipId: MEMBERSHIP_ID }, { method: "GET" }),
    );

  it("should let an Admin view a confirmed letter, served inline as its stored type", async () => {
    signIn(PrivilegeLevel.Admin);
    resolveMembership(row({ status: "RESIGNED", ...LETTER_COLUMNS }));
    const response = await view();
    expect(response.status).toBe(200);
    expect(await parseJsonResponse(response)).toEqual({ url: "https://r2.test/read" });
    expect(getPresignedReadUrl).toHaveBeenCalledWith(LETTER_KEY, 300, {
      contentType: "application/pdf",
      contentDisposition: 'inline; filename="old.pdf"',
    });
  });

  it("should serve HEIC as a download", async () => {
    signIn(PrivilegeLevel.Admin);
    resolveMembership(
      row({
        status: "RESIGNED",
        resignationLetterKey: "resignation-letters/m/x.heic",
        resignationLetterContentType: "image/heic",
        resignationLetterFileName: "x.heic",
      }),
    );
    await view();
    expect(getPresignedReadUrl).toHaveBeenCalledWith("resignation-letters/m/x.heic", 300, {
      contentType: "image/heic",
      contentDisposition: 'attachment; filename="x.heic"',
    });
  });

  it("should let a Leader in jurisdiction view while the report is pending", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
    resolveMembership(reportedWithLetter());
    expect((await view()).status).toBe(200);
  });

  it("should refuse a Leader once the resignation is confirmed", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
    resolveMembership(row({ status: "RESIGNED", ...LETTER_COLUMNS }));
    expect((await view()).status).toBe(403);
    expect(getPresignedReadUrl).not.toHaveBeenCalled();
  });

  it("should refuse a Leader without jurisdiction", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Elsewhere", legDistrict: 9 }]);
    resolveMembership(reportedWithLetter());
    expect((await view()).status).toBe(403);
  });

  it("should return 404 when no letter is attached", async () => {
    signIn(PrivilegeLevel.Admin);
    resolveMembership(row({ status: "RESIGNED" }));
    expect((await view()).status).toBe(404);
  });
});

// --- Filing ------------------------------------------------------------------------

describe("POST /api/committee/exitReport with a letter", () => {
  const report = (overrides: Record<string, unknown> = {}) => ({
    ...memberKey,
    kind: "RESIGNATION",
    resignationDateReceived: "2026-10-29",
    resignationMethod: "EMAIL",
    letter: staged(),
    ...overrides,
  });

  beforeEach(() => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
    resolveMembership(row());
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
  });

  it("should check the file, copy it into the membership's prefix, and file it with the report", async () => {
    stagedObjectIsPdf();
    const response = await reportExit(createMockRequest(report()));
    expect(response.status).toBe(201);

    const data = prismaMock.committeeMembership.updateMany.mock.calls[0]![0].data;
    expect(data.resignationLetterKey).toMatch(
      new RegExp(`^resignation-letters/${MEMBERSHIP_ID}/.+\\.pdf$`),
    );
    expect(data).toMatchObject({
      exitReportedKind: "RESIGNATION",
      resignationLetterContentType: "application/pdf",
      resignationLetterFileName: "signed-letter.pdf",
    });
    expect(copyObject).toHaveBeenCalledWith(
      "resignation-letters/staging/s-1",
      data.resignationLetterKey,
      "application/pdf",
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_EXIT_REPORTED",
        metadata: jsonContaining({ resignationLetterKey: data.resignationLetterKey }),
      }),
    );
  });

  it("should file without a letter", async () => {
    const response = await reportExit(createMockRequest(report({ letter: undefined })));
    expect(response.status).toBe(201);
    expect(prismaMock.committeeMembership.updateMany.mock.calls[0]![0].data).toMatchObject(
      NO_LETTER,
    );
    expect(headObjectSize).not.toHaveBeenCalled();
  });

  it("should refuse a letter on a removal report", async () => {
    const response = await reportExit(
      createMockRequest(
        report({
          kind: "REMOVAL",
          removalReason: "DECEASED",
          resignationDateReceived: undefined,
          resignationMethod: undefined,
        }),
      ),
    );
    expect(response.status).toBe(422);
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file whose first bytes aren't a letter type", async () => {
    jest.mocked(headObjectSize).mockResolvedValue(6);
    jest.mocked(readObjectPrefix).mockResolvedValue(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]));
    const response = await reportExit(createMockRequest(report()));
    expect(response.status).toBe(400);
    expect(deleteObject).toHaveBeenCalledWith("resignation-letters/staging/s-1");
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file whose real size isn't the declared size", async () => {
    jest.mocked(headObjectSize).mockResolvedValue(5_000);
    const response = await reportExit(createMockRequest(report()));
    expect(response.status).toBe(400);
    expect(deleteObject).toHaveBeenCalledWith("resignation-letters/staging/s-1");
  });

  it.each([
    ["another user", { userId: "someone-else" }],
    ["another membership", { membershipId: "other-membership" }],
    ["an expired upload", { expiresAt: Date.now() - 1 }],
  ])("should refuse a staging key issued to %s", async (_label, overrides) => {
    stagedObjectIsPdf();
    const response = await reportExit(createMockRequest(report({ letter: staged(overrides) })));
    expect(response.status).toBe(400);
    expect(copyObject).not.toHaveBeenCalled();
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("should delete the copied letter when the report loses a race", async () => {
    stagedObjectIsPdf();
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 0 });
    const response = await reportExit(createMockRequest(report()));
    expect(response.status).toBe(409);
    const copiedTo = jest.mocked(copyObject).mock.calls[0]![1];
    expect(deleteObject).toHaveBeenCalledWith(copiedTo);
  });
});

// --- Admin resolves ------------------------------------------------------------------

describe("confirming and rejecting a report with a letter", () => {
  beforeEach(() => {
    signIn(PrivilegeLevel.Admin);
    resolveMembership(reportedWithLetter());
  });

  it("should keep the letter on confirm and record it in the audit", async () => {
    prismaMock.committeeMembership.update.mockResolvedValue(
      selectedRow({ ...reportedWithLetter(), status: "RESIGNED" }),
    );
    const response = await confirmExitReport(
      createMockRequest({ membershipId: MEMBERSHIP_ID, exitReportedAt: REPORTED_AT.toISOString() }),
    );
    expect(response.status).toBe(200);
    const data = prismaMock.committeeMembership.update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("resignationLetterKey");
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_RESIGNED",
        metadata: jsonContaining({ resignationLetterKey: LETTER_KEY }),
      }),
    );
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should detach the letter on reject, move it to rejected/ after commit, and name it in the audit", async () => {
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
    const response = await rejectExitReport(
      createMockRequest({ membershipId: MEMBERSHIP_ID, exitReportedAt: REPORTED_AT.toISOString() }),
    );
    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.updateMany.mock.calls[0]![0].data).toMatchObject(
      NO_LETTER,
    );
    const rejectedKey = `resignation-letters/rejected/${MEMBERSHIP_ID}/old.pdf`;
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_EXIT_REPORT_REJECTED",
        metadata: jsonContaining({
          detachedResignationLetter: {
            key: rejectedKey,
            originalKey: LETTER_KEY,
            fileName: "old.pdf",
          },
        }),
      }),
    );
    expect(copyObject).toHaveBeenCalledWith(LETTER_KEY, rejectedKey, "application/pdf");
    expect(deleteObject).toHaveBeenCalledWith(LETTER_KEY);
  });

  it("should still answer 200 when the R2 move fails after commit, reporting to Sentry", async () => {
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
    jest.mocked(copyObject).mockRejectedValueOnce(new Error("R2 unavailable"));
    const response = await rejectExitReport(
      createMockRequest({ membershipId: MEMBERSHIP_ID, exitReportedAt: REPORTED_AT.toISOString() }),
    );
    expect(response.status).toBe(200);
    expect(deleteObject).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { operation: "resignationLetterRelocate" } }),
    );
  });
});

describe("Record resignation and removal with a pending letter", () => {
  const resign = (overrides: Record<string, unknown> = {}) =>
    removeOrResign(
      createMockRequest({
        ...memberKey,
        action: "RESIGN",
        resignationDateReceived: "2026-11-01",
        resignationMethod: "MAIL",
        ...overrides,
      }),
    );

  beforeEach(() => {
    signIn(PrivilegeLevel.Admin);
    resolveMembership(reportedWithLetter());
    prismaMock.committeeMembership.update.mockResolvedValue(
      selectedRow({ ...reportedWithLetter(), status: "RESIGNED" }),
    );
  });

  it("should carry the Leader's letter over when the Admin keeps it", async () => {
    const response = await resign({ keepReportedLetter: true });
    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update.mock.calls[0]![0].data).not.toHaveProperty(
      "resignationLetterKey",
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_RESIGNED",
        metadata: jsonContaining({ letterCarriedOver: true, resignationLetterKey: LETTER_KEY }),
      }),
    );
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should detach the Leader's letter when the Admin unticks it", async () => {
    const response = await resign();
    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update.mock.calls[0]![0].data).toMatchObject(
      NO_LETTER,
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        metadata: jsonContaining({
          letterCarriedOver: false,
          detachedResignationLetter: expect.objectContaining({ originalKey: LETTER_KEY }),
        }),
      }),
    );
    expect(copyObject).toHaveBeenCalledWith(
      LETTER_KEY,
      `resignation-letters/rejected/${MEMBERSHIP_ID}/old.pdf`,
      "application/pdf",
    );
  });

  it("should replace the Leader's letter with the Admin's upload", async () => {
    stagedObjectIsPdf();
    const response = await resign({ letter: staged() });
    expect(response.status).toBe(200);
    const data = prismaMock.committeeMembership.update.mock.calls[0]![0].data;
    expect(data.resignationLetterKey).toMatch(new RegExp(`^resignation-letters/${MEMBERSHIP_ID}/`));
    expect(data.resignationLetterKey).not.toBe(LETTER_KEY);
    // The Leader's letter is detached to rejected/.
    expect(copyObject).toHaveBeenCalledWith(
      LETTER_KEY,
      `resignation-letters/rejected/${MEMBERSHIP_ID}/old.pdf`,
      "application/pdf",
    );
  });

  it("should refuse keeping and uploading at once", async () => {
    const response = await resign({ keepReportedLetter: true, letter: staged() });
    expect(response.status).toBe(422);
  });

  it("should detach the letter on a removal and record letterCarriedOver: false", async () => {
    prismaMock.committeeMembership.update.mockResolvedValue(
      selectedRow({ ...reportedWithLetter(), status: "REMOVED" }),
    );
    const response = await removeOrResign(
      createMockRequest({ ...memberKey, removalReason: "DECEASED" }),
    );
    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update.mock.calls[0]![0].data).toMatchObject(
      NO_LETTER,
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        metadata: jsonContaining({ letterCarriedOver: false }),
      }),
    );
  });
});

// --- Late attach ----------------------------------------------------------------------

describe("POST /api/committee/resignation-letter/attach", () => {
  const attach = () =>
    attachLetter(createMockRequest({ membershipId: MEMBERSHIP_ID, letter: staged() }));

  beforeEach(() => {
    signIn(PrivilegeLevel.Admin);
    stagedObjectIsPdf();
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
  });

  it("should return 403 for a Leader", async () => {
    signIn(PrivilegeLevel.Leader, false);
    expect((await attach()).status).toBe(403);
  });

  it("should replace a RESIGNED member's letter, keep the old object, and audit it", async () => {
    resolveMembership(row({ status: "RESIGNED", ...LETTER_COLUMNS }));
    const response = await attach();
    expect(response.status).toBe(200);
    const args = prismaMock.committeeMembership.updateMany.mock.calls[0]![0];
    expect(args.where).toEqual({
      id: MEMBERSHIP_ID,
      status: "RESIGNED",
      resignationLetterKey: LETTER_KEY,
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "RESIGNATION_LETTER_ATTACHED",
        metadata: jsonContaining({ previousLetterKey: LETTER_KEY }),
      }),
    );
    // The replaced object is left in place: never moved or deleted.
    expect(deleteObject).not.toHaveBeenCalledWith(LETTER_KEY);
    expect(copyObject).not.toHaveBeenCalledWith(LETTER_KEY, expect.anything(), expect.anything());
  });

  it("should refuse a membership that isn't RESIGNED", async () => {
    resolveMembership(reportedWithLetter());
    expect((await attach()).status).toBe(400);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should answer 409 and delete the copy when the row changed", async () => {
    resolveMembership(row({ status: "RESIGNED" }));
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 0 });
    const response = await attach();
    expect(response.status).toBe(409);
    expect(deleteObject).toHaveBeenCalledWith(jest.mocked(copyObject).mock.calls[0]![1]);
  });
});
