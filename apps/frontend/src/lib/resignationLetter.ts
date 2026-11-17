/**
 * Resignation Letter file rules (leader-feedback-2026-11 ticket 08), shared by
 * the upload field (client-side checks) and the server (the checks that
 * count). Client-safe: no Node or R2 imports.
 *
 * - Types: PDF, JPEG, PNG, HEIC; at most 10 MB (decision 3).
 * - The type that counts is sniffed from the file's first bytes at submit;
 *   the browser's declared type only gets a presigned URL.
 * - HEIC is served as a download, the others inline (decision 17).
 */
import { z } from "zod";

export const LETTER_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
] as const;

export type LetterContentType = (typeof LETTER_CONTENT_TYPES)[number];

export const LETTER_MAX_BYTES = 10 * 1024 * 1024;

/** For `<input type="file" accept>`. Extensions too, since browsers often leave HEIC untyped. */
export const LETTER_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/jpeg,image/png,image/heic";

export const LETTER_TYPE_LABEL = "PDF, JPEG, PNG or HEIC";

const EXTENSIONS: Record<LetterContentType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
};

const BY_EXTENSION: Record<string, LetterContentType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heic",
};

export function isLetterContentType(value: unknown): value is LetterContentType {
  return (
    typeof value === "string" &&
    (LETTER_CONTENT_TYPES as readonly string[]).includes(value)
  );
}

export function letterExtension(type: LetterContentType): string {
  return EXTENSIONS[type];
}

/**
 * The type to declare for a picked file: the browser's type when it is one we
 * accept, else one inferred from the extension (Safari and Chrome often give
 * HEIC files an empty type). Null when neither is acceptable.
 */
export function declaredLetterType(file: {
  name: string;
  type: string;
}): LetterContentType | null {
  const type = file.type === "image/heif" ? "image/heic" : file.type;
  if (isLetterContentType(type)) return type;
  if (type !== "" && type !== "application/octet-stream") return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[ext] ?? null;
}

/** How many leading bytes `sniffLetterContentType` needs. */
export const LETTER_SNIFF_BYTES = 16;

/** HEIF brands that mean an HEIC / HEIF still image (ISO/IEC 23008-12). */
const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/**
 * The file's real type from its first bytes (magic numbers), or null when it
 * isn't one we accept:
 *
 * - PDF: `%PDF-`
 * - JPEG: `FF D8 FF`
 * - PNG: `89 50 4E 47 0D 0A 1A 0A`
 * - HEIC: an ISO BMFF `ftyp` box at offset 4 with a HEIF major brand
 */
export function sniffLetterContentType(
  bytes: Uint8Array,
): LetterContentType | null {
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((b, i) => bytes[i] === b)) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 4, 8) === "ftyp" &&
    HEIC_BRANDS.has(ascii(bytes, 8, 12))
  ) {
    return "image/heic";
  }
  return null;
}

/** Opened in the browser tab, or downloaded (HEIC: browsers can't show it). */
export function letterDisposition(type: LetterContentType): "inline" | "attachment" {
  return type === "image/heic" ? "attachment" : "inline";
}

// --- R2 keys ----------------------------------------------------------------

export const LETTER_PREFIX = "resignation-letters/";

/** Where a membership's letters live once submitted. Cleared letters stay here. */
export function membershipLetterPrefix(membershipId: string): string {
  return `${LETTER_PREFIX}${membershipId}/`;
}

/**
 * Presigned uploads for one membership land here; a 1-day lifecycle rule
 * clears `resignation-letters/staging/`. Submit accepts only a key under the
 * membership's own staging prefix.
 */
export function letterStagingPrefix(membershipId: string): string {
  return `${LETTER_PREFIX}staging/${membershipId}/`;
}

// --- The row's columns -------------------------------------------------------

/** A letter on a membership row: its R2 key, sniffed type, and display name. */
export type ResignationLetter = {
  key: string;
  contentType: LetterContentType;
  fileName: string;
};

type LetterColumns = {
  resignationLetterKey: string | null;
  resignationLetterContentType: string | null;
  resignationLetterFileName: string | null;
};

export const CLEARED_LETTER_FIELDS = {
  resignationLetterKey: null,
  resignationLetterContentType: null,
  resignationLetterFileName: null,
} as const satisfies LetterColumns;

export function letterColumns(letter: ResignationLetter): LetterColumns {
  return {
    resignationLetterKey: letter.key,
    resignationLetterContentType: letter.contentType,
    resignationLetterFileName: letter.fileName,
  };
}

/** The row's letter, or null. */
export function letterOnRow(row: LetterColumns): ResignationLetter | null {
  const { resignationLetterKey: key, resignationLetterContentType: type } = row;
  if (!key || !isLetterContentType(type)) return null;
  return { key, contentType: type, fileName: row.resignationLetterFileName ?? "letter" };
}

// --- Wire shapes --------------------------------------------------------------

/** A letter the browser PUT to staging, as a submit sends it back. */
export const stagedLetterSchema = z
  .object({
    stagingKey: z.string().trim().startsWith(`${LETTER_PREFIX}staging/`, "Invalid letter upload"),
    fileName: z.string().trim().min(1).max(255),
  })
  .strict();

export type StagedLetter = z.infer<typeof stagedLetterSchema>;

/** `POST /api/committee/resignation-letter/upload-url` success body. */
export const letterUploadGrantSchema = z.object({
  uploadUrl: z.string(),
  stagingKey: z.string(),
  /** Send these exactly; both are signed. */
  contentType: z.enum(LETTER_CONTENT_TYPES),
  contentLength: z.number().int(),
});

export type LetterUploadGrant = z.infer<typeof letterUploadGrantSchema>;

/** What a viewer is told about an attached letter (never the key). */
export const letterSummarySchema = z.object({
  fileName: z.string(),
  contentType: z.enum(LETTER_CONTENT_TYPES),
});

export type LetterSummary = z.infer<typeof letterSummarySchema>;

/** The summary for a row's letter columns, or null when none is attached. */
export function letterSummaryOf(row: LetterColumns): LetterSummary | null {
  const letter = letterOnRow(row);
  return letter ? { fileName: letter.fileName, contentType: letter.contentType } : null;
}

/** Link that opens (or downloads) a membership's letter through the access check. */
export function letterViewHref(membershipId: string): string {
  return `/api/committee/resignation-letter?membershipId=${encodeURIComponent(membershipId)}&redirect=1`;
}
