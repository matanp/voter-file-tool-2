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

/** "10 MB", from `LETTER_MAX_BYTES`. */
export const LETTER_MAX_LABEL = `${LETTER_MAX_BYTES / (1024 * 1024)} MB`;

export const LETTER_TYPE_MESSAGE = `The letter must be a ${LETTER_TYPE_LABEL} file.`;
export const LETTER_SIZE_MESSAGE = `The letter must be at most ${LETTER_MAX_LABEL}.`;

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

/**
 * How many leading bytes `sniffLetterContentType` needs: enough for the
 * `ftyp` box's compatible brands, which follow its first 16 bytes.
 */
export const LETTER_SNIFF_BYTES = 64;

/** HEVC-coded HEIF brands, i.e. HEIC (ISO/IEC 23008-12). */
const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx"]);

/**
 * Generic HEIF brands. AVIF and other non-HEVC HEIF files use them too, so
 * they count only alongside a HEIC brand among the compatible brands.
 */
const GENERIC_HEIF_BRANDS = new Set(["mif1", "msf1"]);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/**
 * True for an ISO BMFF `ftyp` box (at the start of the file) that declares
 * HEIC: a HEIC major brand, or a generic HEIF one with a HEIC compatible
 * brand.
 */
function isHeicFtyp(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 8) !== "ftyp") return false;
  const major = ascii(bytes, 8, 12);
  if (HEIC_BRANDS.has(major)) return true;
  if (!GENERIC_HEIF_BRANDS.has(major)) return false;
  const boxSize =
    ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  const end = Math.min(boxSize, bytes.length);
  // Compatible brands start after the major brand and minor version.
  for (let at = 16; at + 4 <= end; at += 4) {
    if (HEIC_BRANDS.has(ascii(bytes, at, at + 4))) return true;
  }
  return false;
}

/**
 * The file's real type from its first bytes (magic numbers), or null when it
 * isn't one we accept:
 *
 * - PDF: `%PDF-`
 * - JPEG: `FF D8 FF`
 * - PNG: `89 50 4E 47 0D 0A 1A 0A`
 * - HEIC: an ISO BMFF `ftyp` box at offset 4 declaring HEIC (`isHeicFtyp`)
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
  if (isHeicFtyp(bytes)) return "image/heic";
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

export type LetterColumns = {
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
