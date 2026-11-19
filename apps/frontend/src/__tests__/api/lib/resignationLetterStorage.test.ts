/**
 * Resignation Letter storage (ticket 08): the staging key, the submit-time
 * checks of the real object, and serving. R2 is mocked at the `s3Utils`
 * boundary (jest.setup.ts).
 */
import {
  copyObject,
  deleteObject,
  getPresignedReadUrl,
  getPresignedSizedUploadUrl,
  headObject,
  readObjectPrefix,
} from "~/lib/s3Utils";
import {
  discardPromotedLetter,
  issueLetterUpload,
  letterReadUrl,
  promoteStagedLetter,
  releaseStagedLetter,
} from "~/app/api/lib/resignationLetterStorage";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));

const PDF = new Uint8Array([...("%PDF-1.7\n" as string)].map((c) => c.charCodeAt(0)));
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const STAGING_KEY =
  "resignation-letters/staging/m-1/0f8fad5b-d9cb-469f-a165-70867728950e";
const ETAG = '"etag-1"';

/** R2 holds a staged object of `size` bytes. */
function stagedObject(size: number) {
  jest.mocked(headObject).mockResolvedValue({ size, etag: ETAG });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("issueLetterUpload", () => {
  it("should sign the declared type and size into a 5-minute PUT under the membership's staging prefix", async () => {
    const grant = await issueLetterUpload({
      membershipId: "m-1",
      contentType: "image/png",
      size: 2048,
    });
    expect(grant.stagingKey).toMatch(/^resignation-letters\/staging\/m-1\/[0-9a-f-]{36}$/);
    expect(getPresignedSizedUploadUrl).toHaveBeenCalledWith(
      grant.stagingKey,
      "image/png",
      2048,
      300,
    );
  });
});

describe("promoteStagedLetter", () => {
  const promote = (stagingKey = STAGING_KEY, membershipId = "m-1") =>
    promoteStagedLetter({ stagingKey, fileName: "My Letter (signed).PDF" }, membershipId);

  it("should copy a checked file into the membership's prefix, only while it still has the checked ETag", async () => {
    stagedObject(1234);
    jest.mocked(readObjectPrefix).mockResolvedValue(PDF);

    const result = await promote();

    if (!result.ok) throw new Error("expected the letter to be promoted");
    const { key } = result.letter;
    expect(key).toMatch(/^resignation-letters\/m-1\/[0-9a-f-]+\.pdf$/);
    expect(result.letter).toMatchObject({
      contentType: "application/pdf",
      fileName: "my-letter-signed.pdf",
    });
    expect(copyObject).toHaveBeenCalledWith(STAGING_KEY, key, "application/pdf", ETAG);
    // Kept until the row write lands, so a failed submit can be retried.
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file re-uploaded between the checks and the copy", async () => {
    stagedObject(1234);
    jest.mocked(readObjectPrefix).mockResolvedValue(PDF);
    jest.mocked(copyObject).mockResolvedValueOnce("sourceChanged");

    expect(await promote()).toMatchObject({ ok: false, status: 400 });
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
  });

  it("should refuse a staging key issued for another membership, without touching R2", async () => {
    expect(await promote(STAGING_KEY, "m-2")).toMatchObject({ ok: false, status: 400 });
    expect(await promote("resignation-letters/staging/m-1/../m-2/x")).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(headObject).not.toHaveBeenCalled();
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file over 10 MB", async () => {
    stagedObject(11 * 1024 * 1024);
    expect(await promote()).toMatchObject({ ok: false, status: 400 });
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should refuse and delete a file whose first bytes aren't an accepted type", async () => {
    stagedObject(1234);
    jest.mocked(readObjectPrefix).mockResolvedValue(ZIP);
    expect(await promote()).toEqual({
      ok: false,
      status: 400,
      error: "The letter must be a PDF, JPEG, PNG or HEIC file.",
    });
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("should store the sniffed type, not the declared one", async () => {
    // Declared as PDF, but the bytes are a PNG: stored and served as PNG.
    stagedObject(1234);
    jest
      .mocked(readObjectPrefix)
      .mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(await promote()).toMatchObject({ ok: true, letter: { contentType: "image/png" } });
  });

  it("should refuse an upload that never arrived or has expired", async () => {
    jest.mocked(headObject).mockResolvedValue(null);
    expect(await promote()).toMatchObject({ ok: false, status: 400 });
  });
});

describe("after the row write", () => {
  it("should delete the staging copy once the write lands", async () => {
    await releaseStagedLetter({ stagingKey: STAGING_KEY, fileName: "a.pdf" });
    expect(deleteObject).toHaveBeenCalledWith(STAGING_KEY);
  });

  it("should delete only the promoted copy when the write doesn't land", async () => {
    await discardPromotedLetter({
      key: "resignation-letters/m-1/x.pdf",
      contentType: "application/pdf",
      fileName: "a.pdf",
    });
    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).toHaveBeenCalledWith("resignation-letters/m-1/x.pdf");
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
