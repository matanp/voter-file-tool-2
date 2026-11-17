/**
 * Text normalization for comparing extracted PDF text: Unicode NFC and whitespace collapsed
 * within each page. Page boundaries, token order, punctuation, numbers and case are kept;
 * nothing else (no date or digit stripping).
 */
export const normalizePageText = (raw: string): string => raw.normalize('NFC').replace(/\s+/g, ' ').trim();

/** pdftotext separates pages with form feeds and ends the last one with one too. */
export function splitPages(raw: string, pageCount: number): string[] {
  const pages = raw.split('\f');
  if (pages.length === pageCount + 1 && pages[pageCount]!.trim() === '') pages.pop();
  return pages;
}

/**
 * Numeric edges must not touch another digit: "1 MAIN ST" must not match "11 MAIN ST",
 * and "Sheet No. 1" must not match "Sheet No. 10".
 */
export function includesWhole(haystack: string, needle: string): boolean {
  const startsWithDigit = /^\d/.test(needle);
  const endsWithDigit = /\d$/.test(needle);
  if (!startsWithDigit && !endsWithDigit) return haystack.includes(needle);
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    const leadingBoundary = !startsWithDigit || !/\d/.test(haystack.charAt(i - 1));
    const trailingBoundary = !endsWithDigit || !/\d/.test(haystack.charAt(i + needle.length));
    if (leadingBoundary && trailingBoundary) return true;
  }
  return false;
}

/** Non-overlapping occurrences of `needle` in `haystack`. */
export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) count++;
  return count;
}
