/**
 * Resignation Letters (leader-feedback-2026-11 ticket 08) through the API:
 * the presign, the view access matrix, and what file / confirm / reject /
 * Record resignation / removal do with a letter. R2 is mocked at the
 * `s3Utils` boundary (jest.setup.ts).
 */
import { PrivilegeLevel, type UserJurisdiction } from "@prisma/client";
import { POST as uploadUrl } from "~/app/api/committee/resignation-letter/upload-url/route";
import { GET as viewLetter } from "~/app/api/committee/resignation-letter/route";
import { POST as reportExit } from "~/app/api/committee/exitReport/route";
import { POST as confirmExitReport } from "~/app/api/committee/exitReport/confirm/route";
import { POST as rejectExitReport } from "~/app/api/committee/exitReport/reject/route";
import { POST as removeOrResign } from "~/app/api/committee/remove/route";
import {
  copyObject,
  deleteObject,
  getPresignedReadUrl,
  getPresignedSizedUploadUrl,
  headObject,
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
import { mockAuthSession, prismaMock } from "../../utils/mocks";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";

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

/** Signs in with the real privilege hierarchy (the routes also ask "is this an Admin?"). */
function signIn(privilegeLevel: PrivilegeLevel) {
  mockAuthSession(createMockSession({ user: { privilegeLevel } }));
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
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

const ETAG = '"etag-1"';
const STAGING_KEY = `resignation-letters/staging/${MEMBERSHIP_ID}/0f8fad5b-d9cb-469f-a165-70867728950e`;

/** A staged upload the presign for this membership would have produced. */
function staged(stagingKey = STAGING_KEY) {
  return { stagingKey, fileName: "Signed letter.pdf" };
}

/** The staged object R2 holds: 6 bytes of PDF. */
function stagedObjectIsPdf() {
  jest.mocked(headObject).mockResolvedValue({ size: 6, etag: ETAG });
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

/** The membership row (with the relations the routes select) a lookup returns. */
type MembershipRow = ReturnType<typeof row>;

function resolveMembership(r: MembershipRow) {
  prismaMock.committeeMembership.findUnique.mockResolvedValue(
    selectedRow<MembershipRow>(r),
  );
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
    signIn(PrivilegeLevel.ReadAccess);
    const response = await uploadUrl(createMockRequest(body()));
    expect(response.status).toBe(403);
    expect(getPresignedSizedUploadUrl).not.toHaveBeenCalled();
  });

  it("should sign the declared type and size for a Leader in jurisdiction", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
    const response = await uploadUrl(createMockRequest(body()));
    expect(response.status).toBe(200);
    const grant = await parseJsonResponse<{ stagingKey: string }>(response);
    expect(grant.stagingKey.startsWith(`resignation-letters/staging/${MEMBERSHIP_ID}/`)).toBe(true);
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

  it("should refuse a Leader without access before saying whether a letter exists", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Elsewhere", legDistrict: 9 }]);
    resolveMembership(
      row({ exitReportedAt: REPORTED_AT, exitReportedKind: "RESIGNATION" }),
    );
    expect((await view()).status).toBe(403);
  });

  it("should validate the query", async () => {
    signIn(PrivilegeLevel.Admin);
    const response = await viewLetter(
      createMockRequest({}, { membershipId: " " }, { method: "GET" }),
    );
    expect(response.status).toBe(422);
    expect(prismaMock.committeeMembership.findUnique).not.toHaveBeenCalled();
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
      STAGING_KEY,
      data.resignationLetterKey,
      "application/pdf",
      ETAG,
    );
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
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
    expect(headObject).not.toHaveBeenCalled();
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
    jest.mocked(headObject).mockResolvedValue({ size: 6, etag: ETAG });
    jest.mocked(readObjectPrefix).mockResolvedValue(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]));
    const response = await reportExit(createMockRequest(report()));
    expect(response.status).toBe(400);
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file over 10 MB", async () => {
    jest.mocked(headObject).mockResolvedValue({ size: 11 * 1024 * 1024, etag: ETAG });
    const response = await reportExit(createMockRequest(report()));
    expect(response.status).toBe(400);
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
  });

  it("should refuse a staging key issued for another membership", async () => {
    stagedObjectIsPdf();
    const otherKey = "resignation-letters/staging/other-membership/0f8fad5b-d9cb-469f-a165-70867728950e";
    const response = await reportExit(createMockRequest(report({ letter: staged(otherKey) })));
    expect(response.status).toBe(400);
    expect(copyObject).not.toHaveBeenCalled();
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("should delete the copied letter, but keep the staged one, when the report loses a race", async () => {
    stagedObjectIsPdf();
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 0 });
    const response = await reportExit(createMockRequest(report()));
    expect(response.status).toBe(409);
    const copiedTo = jest.mocked(copyObject).mock.calls[0]![1];
    expect(deleteObject).toHaveBeenCalledWith(copiedTo);
    expect(deleteObject).not.toHaveBeenCalledWith(STAGING_KEY);
  });

  it("should accept a retry with the same staging key after a failed write", async () => {
    stagedObjectIsPdf();
    prismaMock.committeeMembership.updateMany.mockRejectedValueOnce(new Error("db down"));
    expect((await reportExit(createMockRequest(report()))).status).toBe(500);
    expect(deleteObject).not.toHaveBeenCalledWith(STAGING_KEY);

    const retry = await reportExit(createMockRequest(report()));
    expect(retry.status).toBe(201);
    expect(copyObject).toHaveBeenCalledTimes(2);
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
  });
});

// --- Admin resolves ------------------------------------------------------------------

describe("confirming and rejecting a report with a letter", () => {
  beforeEach(() => {
    signIn(PrivilegeLevel.Admin);
    resolveMembership(reportedWithLetter());
  });

  it("should keep the letter on confirm", async () => {
    prismaMock.committeeMembership.update.mockResolvedValue(
      selectedRow<MembershipRow>({ ...reportedWithLetter(), status: "RESIGNED" }),
    );
    const response = await confirmExitReport(
      createMockRequest({ membershipId: MEMBERSHIP_ID, exitReportedAt: REPORTED_AT.toISOString() }),
    );
    expect(response.status).toBe(200);
    const data = prismaMock.committeeMembership.update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("resignationLetterKey");
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should clear the letter on reject and leave the file in place", async () => {
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
    const response = await rejectExitReport(
      createMockRequest({ membershipId: MEMBERSHIP_ID, exitReportedAt: REPORTED_AT.toISOString() }),
    );
    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.updateMany.mock.calls[0]![0].data).toMatchObject(
      NO_LETTER,
    );
    expect(copyObject).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
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
      selectedRow<MembershipRow>({ ...reportedWithLetter(), status: "RESIGNED" }),
    );
  });

  it("should keep the Leader's letter when the Admin uploads none", async () => {
    const response = await resign();
    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update.mock.calls[0]![0].data).not.toHaveProperty(
      "resignationLetterKey",
    );
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should replace the Leader's letter with the Admin's upload", async () => {
    stagedObjectIsPdf();
    const response = await resign({ letter: staged() });
    expect(response.status).toBe(200);
    const data = prismaMock.committeeMembership.update.mock.calls[0]![0].data;
    expect(data.resignationLetterKey).toMatch(new RegExp(`^resignation-letters/${MEMBERSHIP_ID}/`));
    expect(data.resignationLetterKey).not.toBe(LETTER_KEY);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_RESIGNED",
        metadata: jsonContaining({ resignationLetterKey: data.resignationLetterKey }),
      }),
    );
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
  });

  it("should keep the Admin's staged upload for a retry when the write fails", async () => {
    stagedObjectIsPdf();
    prismaMock.committeeMembership.update.mockRejectedValueOnce(new Error("db down"));
    const response = await resign({ letter: staged() });
    expect(response.status).toBe(500);
    const copiedTo = jest.mocked(copyObject).mock.calls[0]![1];
    expect(deleteObject).toHaveBeenCalledWith(copiedTo);
    expect(deleteObject).not.toHaveBeenCalledWith(STAGING_KEY);
  });

  it("should clear the letter on a removal", async () => {
    prismaMock.committeeMembership.update.mockResolvedValue(
      selectedRow<MembershipRow>({ ...reportedWithLetter(), status: "REMOVED" }),
    );
    const response = await removeOrResign(
      createMockRequest({ ...memberKey, removalReason: "DECEASED" }),
    );
    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update.mock.calls[0]![0].data).toMatchObject(
      NO_LETTER,
    );
  });
});
