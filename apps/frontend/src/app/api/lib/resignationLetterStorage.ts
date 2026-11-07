/**
 * Resignation Letter storage (leader-feedback-2026-11 ticket 08): the R2 side
 * of the letter lifecycle. The row side is `membershipExit.ts`.
 *
 * Upload is a presigned PUT into `resignation-letters/staging/<random>`
 * (decisions 9–10). The presign returns a token, an HMAC over the staging
 * key, the user, the membership, the declared type and size, and an expiry.
 * At submit, `promoteStagedLetter` checks the token, the object's real size
 * (HEAD) and its type from its first bytes (ranged GET), then copies it to
 * `resignation-letters/<membershipId>/<random>.<ext>` and deletes the staging
 * copy. A file that fails the checks is deleted and refused with 400.
 *
 * The R2 moves for detached letters happen after the DB commit
 * (`relocateDetachedLetters`). A failed move leaves the object in place and
 * reports to Sentry; the row is already correct.
 */
import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { sanitizeForS3Key } from "@voter-file-tool/shared-validators";
import {
  copyObject,
  deleteObject,
  getPresignedReadUrl,
  getPresignedSizedUploadUrl,
  headObjectSize,
  readObjectPrefix,
} from "~/lib/s3Utils";
import {
  LETTER_MAX_BYTES,
  LETTER_SNIFF_BYTES,
  LETTER_STAGING_PREFIX,
  isLetterContentType,
  letterDisposition,
  letterExtension,
  membershipLetterPrefix,
  rejectedLetterKey,
  sniffLetterContentType,
  type LetterContentType,
  type LetterUploadGrant,
  type StagedLetter,
} from "~/lib/resignationLetter";
import type { ResignationLetter } from "~/app/api/lib/membershipExit";

/** The presigned PUT's lifetime (decision 9). */
export const LETTER_UPLOAD_URL_TTL_SECONDS = 5 * 60;
/**
 * How long a staged upload can still be submitted: long enough to finish the
 * form after picking the file. Staging itself is cleared after a day.
 */
export const LETTER_STAGING_TOKEN_TTL_MS = 60 * 60 * 1000;
/** A presigned GET's lifetime (decision 13). */
export const LETTER_READ_URL_TTL_SECONDS = 5 * 60;

function signingKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to sign letter uploads");
  // Domain-separated from every other use of AUTH_SECRET.
  return createHmac("sha256", secret)
    .update("resignation-letter-staging-v1")
    .digest();
}

type TokenClaims = {
  stagingKey: string;
  userId: string;
  membershipId: string;
  contentType: LetterContentType;
  size: number;
  /** ms since epoch */
  expiresAt: number;
};

function signature(claims: TokenClaims): string {
  return createHmac("sha256", signingKey())
    .update(
      [
        claims.stagingKey,
        claims.userId,
        claims.membershipId,
        claims.contentType,
        String(claims.size),
        String(claims.expiresAt),
      ].join("\n"),
    )
    .digest("base64url");
}

/** `<expiresAt>.<contentType>.<size>.<signature>`; the rest is bound by the signature. */
export function signStagingToken(claims: TokenClaims): string {
  return [
    claims.expiresAt,
    Buffer.from(claims.contentType).toString("base64url"),
    claims.size,
    signature(claims),
  ].join(".");
}

/**
 * The declared type and size the token was issued for, or null when the
 * token is malformed, forged, for another user / membership / key, or expired.
 */
export function verifyStagingToken(
  token: string,
  expected: { stagingKey: string; userId: string; membershipId: string },
  now: number = Date.now(),
): { contentType: LetterContentType; size: number } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [expiresRaw, typeRaw, sizeRaw, sig] = parts as [string, string, string, string];
  const expiresAt = Number(expiresRaw);
  const size = Number(sizeRaw);
  const contentType = Buffer.from(typeRaw, "base64url").toString();
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(size)) return null;
  if (!isLetterContentType(contentType)) return null;
  const expectedSig = Buffer.from(
    signature({ ...expected, contentType, size, expiresAt }),
  );
  const given = Buffer.from(sig);
  if (given.length !== expectedSig.length || !timingSafeEqual(given, expectedSig)) {
    return null;
  }
  if (expiresAt <= now) return null;
  return { contentType, size };
}

/** A presigned PUT into staging for one file, plus its submit token. */
export async function issueLetterUpload(params: {
  userId: string;
  membershipId: string;
  contentType: LetterContentType;
  size: number;
}): Promise<LetterUploadGrant> {
  const stagingKey = `${LETTER_STAGING_PREFIX}${randomUUID()}`;
  const uploadUrl = await getPresignedSizedUploadUrl(
    stagingKey,
    params.contentType,
    params.size,
    LETTER_UPLOAD_URL_TTL_SECONDS,
  );
  const token = signStagingToken({
    stagingKey,
    userId: params.userId,
    membershipId: params.membershipId,
    contentType: params.contentType,
    size: params.size,
    expiresAt: Date.now() + LETTER_STAGING_TOKEN_TTL_MS,
  });
  return {
    uploadUrl,
    stagingKey,
    token,
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

async function deleteQuietly(key: string, operation: string): Promise<void> {
  try {
    await deleteObject(key);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation },
      extra: { key },
    });
  }
}

export type PromoteResult =
  | { ok: true; letter: ResignationLetter }
  | { ok: false; status: 400; error: string };

const REFUSED_UPLOAD =
  "The letter upload is invalid or has expired. Attach the file again.";

/**
 * Checks a staged upload and copies it into the membership's prefix. On
 * success the caller writes the returned letter to the row; if that write
 * doesn't land, call `discardPromotedLetter`.
 */
export async function promoteStagedLetter(params: {
  staged: StagedLetter;
  userId: string;
  membershipId: string;
}): Promise<PromoteResult> {
  const { staged, userId, membershipId } = params;
  const claims = verifyStagingToken(staged.token, {
    stagingKey: staged.stagingKey,
    userId,
    membershipId,
  });
  if (!claims) return { ok: false, status: 400, error: REFUSED_UPLOAD };

  const size = await headObjectSize(staged.stagingKey);
  if (size === null) {
    return {
      ok: false,
      status: 400,
      error: "The letter upload didn't finish. Attach the file again.",
    };
  }
  if (size === 0 || size > LETTER_MAX_BYTES || size !== claims.size) {
    await deleteQuietly(staged.stagingKey, "resignationLetterRejectStaged");
    return {
      ok: false,
      status: 400,
      error: "The letter must be a file of at most 10 MB.",
    };
  }

  const head = await readObjectPrefix(staged.stagingKey, LETTER_SNIFF_BYTES);
  const contentType = sniffLetterContentType(head);
  if (!contentType) {
    await deleteQuietly(staged.stagingKey, "resignationLetterRejectStaged");
    return {
      ok: false,
      status: 400,
      error: "The letter must be a PDF, JPEG, PNG or HEIC file.",
    };
  }

  const key = `${membershipLetterPrefix(membershipId)}${randomUUID()}.${letterExtension(contentType)}`;
  await copyObject(staged.stagingKey, key, contentType);
  await deleteQuietly(staged.stagingKey, "resignationLetterDeleteStaged");
  return {
    ok: true,
    letter: {
      key,
      contentType,
      fileName: letterDisplayName(staged.fileName, contentType),
    },
  };
}

/** Deletes a promoted copy whose DB write didn't land (lost a race, or threw). */
export async function discardPromotedLetter(
  letter: ResignationLetter | null | undefined,
): Promise<void> {
  if (letter) await deleteQuietly(letter.key, "resignationLetterDiscardPromoted");
}

/**
 * Moves detached unconfirmed letters under `rejected/` (90-day lifecycle).
 * Call after the transaction commits. Never throws: a failed move leaves the
 * object where it was and reports to Sentry.
 */
export async function relocateDetachedLetters(
  letters: ReadonlyArray<ResignationLetter | null | undefined>,
): Promise<void> {
  for (const letter of letters) {
    if (!letter) continue;
    const destination = rejectedLetterKey(letter.key);
    try {
      await copyObject(letter.key, destination, letter.contentType);
      await deleteObject(letter.key);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: "resignationLetterRelocate" },
        extra: { key: letter.key, destination },
      });
    }
  }
}

/** A 5-minute GET that serves the stored, sniffed type (decision 17). */
export async function letterReadUrl(letter: ResignationLetter): Promise<string> {
  const disposition = letterDisposition(letter.contentType);
  const name = letter.fileName.replace(/["\\\r\n]/g, "");
  return getPresignedReadUrl(letter.key, LETTER_READ_URL_TTL_SECONDS, {
    contentType: letter.contentType,
    contentDisposition: `${disposition}; filename="${name}"`,
  });
}
