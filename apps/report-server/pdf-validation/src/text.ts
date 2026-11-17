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
 * `needle` occurs in `haystack` and, when it ends in a digit, isn't followed by another digit,
 * so "Sheet No. 1" doesn't match inside "Sheet No. 10".
 */
export function includesWhole(haystack: string, needle: string): boolean {
  if (!/\d$/.test(needle)) return haystack.includes(needle);
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    if (!/\d/.test(haystack.charAt(i + needle.length))) return true;
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
