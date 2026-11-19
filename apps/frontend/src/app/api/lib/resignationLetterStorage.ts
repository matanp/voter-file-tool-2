/**
 * Resignation Letter storage (leader-feedback-2026-11 ticket 08): the R2 side
 * of a letter. The row side is `membershipExit.ts`.
 *
 * Upload is a presigned PUT (5 minutes, signed type and size) into
 * `resignation-letters/staging/<membershipId>/<uuid>`. At submit,
 * `promoteStagedLetter` checks the key is under that membership's staging
 * prefix, the object's real size (HEAD) and its type from its first bytes
 * (ranged GET), then copies it to `resignation-letters/<membershipId>/`. The
 * copy is conditional on the ETag the HEAD saw, so bytes PUT again after the
 * checks are never copied. A file that fails the checks is deleted and
 * refused with 400.
 *
 * The staging copy is kept until the caller's row write lands
 * (`releaseStagedLetter`), so a submit that fails afterwards (a 409 race or a
 * 500) can be retried with the same staging key.
 *
 * Letters are never moved or deleted once submitted: a letter cleared from
 * its row stays under the membership's prefix.
 */
import "server-only";

import { randomUUID } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { sanitizeForS3Key } from "@voter-file-tool/shared-validators";
import {
  copyObject,
  deleteObject,
  getPresignedReadUrl,
  getPresignedSizedUploadUrl,
  headObject,
  readObjectPrefix,
} from "~/lib/s3Utils";
import {
  LETTER_MAX_BYTES,
  LETTER_SNIFF_BYTES,
  letterDisposition,
  letterExtension,
  letterStagingPrefix,
  membershipLetterPrefix,
  sniffLetterContentType,
  type LetterContentType,
  type LetterUploadGrant,
  type ResignationLetter,
  type StagedLetter,
} from "~/lib/resignationLetter";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const READ_URL_TTL_SECONDS = 5 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A presigned PUT into the membership's staging prefix for one file. */
export async function issueLetterUpload(params: {
  membershipId: string;
  contentType: LetterContentType;
  size: number;
}): Promise<LetterUploadGrant> {
  const stagingKey = `${letterStagingPrefix(params.membershipId)}${randomUUID()}`;
  const uploadUrl = await getPresignedSizedUploadUrl(
    stagingKey,
    params.contentType,
    params.size,
    UPLOAD_URL_TTL_SECONDS,
  );
  return {
    uploadUrl,
    stagingKey,
    contentType: params.contentType,
    contentLength: params.size,
  };
}

/** "My Letter (signed).PDF" → "my-letter-signed.pdf", with the sniffed extension. */
export function letterDisplayName(fileName: string, type: LetterContentType): string {
  const base = fileName.replace(/\.[^.]*$/, "");
  const safe = sanitizeForS3Key(base, false, 100) || "letter";
  return `${safe}.${letterExtension(type)}`;
}

async function deleteQuietly(key: string): Promise<void> {
  try {
    await deleteObject(key);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "resignationLetterDelete" },
      extra: { key },
    });
  }
}

export type PromoteResult =
  | { ok: true; letter: ResignationLetter }
  | { ok: false; status: 400; error: string };

/**
 * Checks a staged upload and copies it into the membership's prefix. On
 * success the caller writes the returned letter to the row, then calls
 * `releaseStagedLetter` once the write lands, or `discardPromotedLetter` if
 * it doesn't (the staging copy stays for a retry).
 */
export async function promoteStagedLetter(
  staged: StagedLetter,
  membershipId: string,
): Promise<PromoteResult> {
  const prefix = letterStagingPrefix(membershipId);
  const { stagingKey } = staged;
  if (!stagingKey.startsWith(prefix) || !UUID.test(stagingKey.slice(prefix.length))) {
    return {
      ok: false,
      status: 400,
      error: "The letter upload is invalid. Attach the file again.",
    };
  }

  const head = await headObject(stagingKey);
  if (head === null) {
    return {
      ok: false,
      status: 400,
      error: "The letter upload didn't finish or has expired. Attach the file again.",
    };
  }
  if (head.size === 0 || head.size > LETTER_MAX_BYTES) {
    await deleteQuietly(stagingKey);
    return { ok: false, status: 400, error: "The letter must be a file of at most 10 MB." };
  }

  const contentType = sniffLetterContentType(
    await readObjectPrefix(stagingKey, LETTER_SNIFF_BYTES),
  );
  if (!contentType) {
    await deleteQuietly(stagingKey);
    return {
      ok: false,
      status: 400,
      error: "The letter must be a PDF, JPEG, PNG or HEIC file.",
    };
  }

  const key = `${membershipLetterPrefix(membershipId)}${randomUUID()}.${letterExtension(contentType)}`;
  if ((await copyObject(stagingKey, key, contentType, head.etag)) === "sourceChanged") {
    // Re-uploaded between the checks and the copy: the checked bytes are gone.
    await deleteQuietly(stagingKey);
    return {
      ok: false,
      status: 400,
      error: "The letter changed while it was being checked. Attach the file again.",
    };
  }
  return {
    ok: true,
    letter: { key, contentType, fileName: letterDisplayName(staged.fileName, contentType) },
  };
}

/** Deletes the staging copy once the promoted letter's row write has landed. */
export async function releaseStagedLetter(staged: StagedLetter): Promise<void> {
  await deleteQuietly(staged.stagingKey);
}

/**
 * Deletes a promoted copy whose DB write didn't land (lost a race, or threw).
 * The staging copy is left for a retry; the lifecycle rule clears it.
 */
export async function discardPromotedLetter(
  letter: ResignationLetter | null | undefined,
): Promise<void> {
  if (letter) await deleteQuietly(letter.key);
}

/** A 5-minute GET that serves the stored, sniffed type (decision 17). */
export async function letterReadUrl(letter: ResignationLetter): Promise<string> {
  const disposition = letterDisposition(letter.contentType);
  const name = letter.fileName.replace(/["\\\r\n]/g, "");
  return getPresignedReadUrl(letter.key, READ_URL_TTL_SECONDS, {
    contentType: letter.contentType,
    contentDisposition: `${disposition}; filename="${name}"`,
  });
}
