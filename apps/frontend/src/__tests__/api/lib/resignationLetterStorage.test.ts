/**
 * Resignation Letter storage (ticket 08): the staging token, the submit-time
 * checks of the real object, and the after-commit moves. R2 is mocked at the
 * `s3Utils` boundary (jest.setup.ts).
 */
import * as Sentry from "@sentry/nextjs";
import {
  copyObject,
  deleteObject,
  getPresignedReadUrl,
  getPresignedSizedUploadUrl,
  headObjectSize,
  readObjectPrefix,
} from "~/lib/s3Utils";
import {
  issueLetterUpload,
  letterReadUrl,
  promoteStagedLetter,
  relocateDetachedLetters,
  signStagingToken,
  verifyStagingToken,
} from "~/app/api/lib/resignationLetterStorage";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));

const PDF = new Uint8Array([...("%PDF-1.7\n" as string)].map((c) => c.charCodeAt(0)));
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);

const CLAIMS = {
  stagingKey: "resignation-letters/staging/k1",
  userId: "leader-1",
  membershipId: "m-1",
  contentType: "application/pdf" as const,
  size: 1234,
};

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret";
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("staging token", () => {
  const token = () =>
    signStagingToken({ ...CLAIMS, expiresAt: Date.now() + 60_000 });
  const expected = {
    stagingKey: CLAIMS.stagingKey,
    userId: CLAIMS.userId,
    membershipId: CLAIMS.membershipId,
  };

  it("should verify a token for the user, membership and key it was issued for", () => {
    expect(verifyStagingToken(token(), expected)).toEqual({
      contentType: "application/pdf",
      size: 1234,
    });
  });

  it("should refuse a token issued to another user, membership, or key", () => {
    const t = token();
    expect(verifyStagingToken(t, { ...expected, userId: "leader-2" })).toBeNull();
    expect(verifyStagingToken(t, { ...expected, membershipId: "m-2" })).toBeNull();
    expect(
      verifyStagingToken(t, { ...expected, stagingKey: "resignation-letters/staging/k2" }),
    ).toBeNull();
  });

  it("should refuse an expired or edited token", () => {
    const expired = signStagingToken({ ...CLAIMS, expiresAt: Date.now() - 1 });
    expect(verifyStagingToken(expired, expected)).toBeNull();
    const [exp, type, , sig] = token().split(".");
    expect(verifyStagingToken([exp, type, "999", sig].join("."), expected)).toBeNull();
    expect(verifyStagingToken("garbage", expected)).toBeNull();
  });
});

describe("issueLetterUpload", () => {
  it("should sign the declared type and size into a 5-minute PUT to staging", async () => {
    const grant = await issueLetterUpload({
      userId: "leader-1",
      membershipId: "m-1",
      contentType: "image/png",
      size: 2048,
    });
    expect(grant.stagingKey).toMatch(/^resignation-letters\/staging\//);
    expect(getPresignedSizedUploadUrl).toHaveBeenCalledWith(
      grant.stagingKey,
      "image/png",
      2048,
      300,
    );
    expect(
      verifyStagingToken(grant.token, {
        stagingKey: grant.stagingKey,
        userId: "leader-1",
        membershipId: "m-1",
      }),
    ).toEqual({ contentType: "image/png", size: 2048 });
  });
});

describe("promoteStagedLetter", () => {
  const staged = (claims = CLAIMS) => ({
    stagingKey: claims.stagingKey,
    token: signStagingToken({ ...claims, expiresAt: Date.now() + 60_000 }),
    fileName: "My Letter (signed).PDF",
  });
  const promote = (s = staged(), userId = CLAIMS.userId) =>
    promoteStagedLetter({ staged: s, userId, membershipId: CLAIMS.membershipId });

  it("should copy a checked file into the membership's prefix and delete the staging copy", async () => {
    jest.mocked(headObjectSize).mockResolvedValue(1234);
    jest.mocked(readObjectPrefix).mockResolvedValue(PDF);

    const result = await promote();

    if (!result.ok) throw new Error("expected the letter to be promoted");
    const { key } = result.letter;
    expect(key).toMatch(/^resignation-letters\/m-1\/[0-9a-f-]+\.pdf$/);
    expect(result.letter).toMatchObject({
      contentType: "application/pdf",
      fileName: "my-letter-signed.pdf",
    });
    expect(copyObject).toHaveBeenCalledWith(CLAIMS.stagingKey, key, "application/pdf");
    expect(deleteObject).toHaveBeenCalledWith(CLAIMS.stagingKey);
  });

  it("should refuse a staging key issued to another user, without touching R2", async () => {
    const result = await promote(staged(), "leader-2");
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(headObjectSize).not.toHaveBeenCalled();
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file whose real size differs from the declared one", async () => {
    jest.mocked(headObjectSize).mockResolvedValue(9999);
    const result = await promote();
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(deleteObject).toHaveBeenCalledWith(CLAIMS.stagingKey);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file over 10 MB even when its token says so", async () => {
    const big = { ...CLAIMS, size: 11 * 1024 * 1024 };
    jest.mocked(headObjectSize).mockResolvedValue(big.size);
    const result = await promote(staged(big));
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(deleteObject).toHaveBeenCalledWith(CLAIMS.stagingKey);
  });

  it("should refuse and delete a file whose first bytes aren't an accepted type", async () => {
    jest.mocked(headObjectSize).mockResolvedValue(1234);
    jest.mocked(readObjectPrefix).mockResolvedValue(ZIP);
    const result = await promote();
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "The letter must be a PDF, JPEG, PNG or HEIC file.",
    });
    expect(deleteObject).toHaveBeenCalledWith(CLAIMS.stagingKey);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should store the sniffed type, not the declared one", async () => {
    // Declared as PDF, but the bytes are a PNG: stored and served as PNG.
    jest.mocked(headObjectSize).mockResolvedValue(1234);
    jest
      .mocked(readObjectPrefix)
      .mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const result = await promote();
    expect(result).toMatchObject({ ok: true, letter: { contentType: "image/png" } });
  });

  it("should refuse an upload that never arrived", async () => {
    jest.mocked(headObjectSize).mockResolvedValue(null);
    expect(await promote()).toMatchObject({ ok: false, status: 400 });
  });
});

describe("relocateDetachedLetters", () => {
  const letter = {
    key: "resignation-letters/m-1/a.pdf",
    contentType: "application/pdf" as const,
    fileName: "a.pdf",
  };

  it("should move a detached letter under rejected/", async () => {
    await relocateDetachedLetters([letter, null]);
    expect(copyObject).toHaveBeenCalledWith(
      letter.key,
      "resignation-letters/rejected/m-1/a.pdf",
      "application/pdf",
    );
    expect(deleteObject).toHaveBeenCalledWith(letter.key);
  });

  it("should report a failed move to Sentry and leave the object in place, without throwing", async () => {
    jest.mocked(copyObject).mockRejectedValueOnce(new Error("R2 down"));
    await expect(relocateDetachedLetters([letter])).resolves.toBeUndefined();
    expect(deleteObject).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { operation: "resignationLetterRelocate" } }),
    );
  });
});

describe("letterReadUrl", () => {
  it("should serve the stored type, inline for PDF and as a download for HEIC, for 5 minutes", async () => {
    await letterReadUrl({ key: "k.pdf", contentType: "application/pdf", fileName: "a.pdf" });
    expect(getPresignedReadUrl).toHaveBeenLastCalledWith("k.pdf", 300, {
      contentType: "application/pdf",
      contentDisposition: 'inline; filename="a.pdf"',
    });
    await letterReadUrl({ key: "k.heic", contentType: "image/heic", fileName: "a.heic" });
    expect(getPresignedReadUrl).toHaveBeenLastCalledWith("k.heic", 300, {
      contentType: "image/heic",
      contentDisposition: 'attachment; filename="a.heic"',
    });
  });
});
