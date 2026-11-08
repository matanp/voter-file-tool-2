/**
 * Chooses a font size for sign-in sheet values that would otherwise need a
 * third line. Measures with font width tables, not the browser, so it works
 * with any renderer. No React, Puppeteer or `utils.ts` import.
 */
import {
  LIBERATION_SANS_BOLD,
  LIBERATION_SANS_REGULAR,
  type FontWidthTable,
} from './signInSheetFontWidths';
import { usableColumnWidthPx } from './signInSheetLayout';

/** Largest first. */
export const SIGN_IN_TEXT_SIZES = [15.5, 13, 11] as const;
export type SignInTextSize = (typeof SIGN_IN_TEXT_SIZES)[number];

const MAX_LINES = 2;

type Font = {
  table: FontWidthTable;
  /** Width of any character outside the table: the widest one in it. */
  fallback: number;
};

const font = (table: FontWidthTable): Font => ({
  table,
  fallback: Math.max(...table.ranges.flatMap((range) => range.widths)),
});

const REGULAR = font(LIBERATION_SANS_REGULAR);
const BOLD = font(LIBERATION_SANS_BOLD);

const charWidth = ({ table, fallback }: Font, char: string): number => {
  const codePoint = char.codePointAt(0) ?? 0;
  for (const { first, widths } of table.ranges) {
    const width = widths[codePoint - first];
    if (width !== undefined) return width;
  }
  return fallback;
};

/** Width in CSS px. Iterates code points, so an astral character counts once. */
const textWidth = (f: Font, text: string, sizePx: number): number => {
  let units = 0;
  for (const char of text) units += charWidth(f, char);
  return (units / f.table.unitsPerEm) * sizePx;
};

/**
 * Splits text at its break opportunities: spaces, and after each hyphen (as
 * in `MONTGOMERY-` / `WILLIAMSON`). A segment after a hyphen joins its line
 * without a space.
 */
const breakSegments = (text: string): { text: string; afterSpace: boolean }[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) =>
      (word.match(/[^-]*-+|[^-]+$/g) ?? [word]).map((part, i) => ({
        text: part,
        afterSpace: i === 0,
      })),
    );

/**
 * Greedy wrap at spaces and hyphens, as the browser does. A segment longer
 * than a whole line breaks by character (`overflow-wrap: break-word`).
 */
function wrappedLineCount(
  f: Font,
  text: string,
  sizePx: number,
  maxWidth: number,
): number {
  const space = textWidth(f, ' ', sizePx);
  let lines = 1;
  let lineWidth = 0;

  for (const segment of breakSegments(text)) {
    const word = segment.text;
    const gap = segment.afterSpace ? space : 0;
    const wordWidth = textWidth(f, word, sizePx);
    if (lineWidth > 0 && lineWidth + gap + wordWidth <= maxWidth) {
      lineWidth += gap + wordWidth;
      continue;
    }
    if (lineWidth > 0) lines += 1;

    if (wordWidth <= maxWidth) {
      lineWidth = wordWidth;
      continue;
    }
    lineWidth = 0;
    for (const char of word) {
      const width = textWidth(f, char, sizePx);
      if (lineWidth > 0 && lineWidth + width > maxWidth) {
        lines += 1;
        lineWidth = 0;
      }
      lineWidth += width;
    }
  }
  return lines;
}

/** `break-all` text breaks anywhere, so only its total width matters. */
const breakAllLineCount = (
  f: Font,
  text: string,
  sizePx: number,
  maxWidth: number,
): number => Math.max(1, Math.ceil(textWidth(f, text, sizePx) / maxWidth));

const largestFitting = (
  lineCount: (sizePx: number) => number,
): SignInTextSize =>
  SIGN_IN_TEXT_SIZES.find((size) => lineCount(size) <= MAX_LINES) ?? 11;

/** Bold member name in the Member name column. */
export function fitMemberNameSize(name: string): SignInTextSize {
  const maxWidth = usableColumnWidthPx('name');
  return largestFitting((size) => wrappedLineCount(BOLD, name, size, maxWidth));
}

/** Email on file (`break-all`). */
export function fitEmailSize(email: string): SignInTextSize {
  const maxWidth = usableColumnWidthPx('email');
  return largestFitting((size) =>
    breakAllLineCount(REGULAR, email, size, maxWidth),
  );
}

/**
 * Phone on file (`break-all`). Formatted numbers always fit at full size; a
 * value that didn't format prints raw and follows the email rule.
 */
export function fitPhoneSize(phone: string): SignInTextSize {
  const maxWidth = usableColumnWidthPx('phone');
  return largestFitting((size) =>
    breakAllLineCount(REGULAR, phone, size, maxWidth),
  );
}
