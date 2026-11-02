/**
 * Splits plain text into text and link parts, so Admin-written instructions
 * can show email addresses and URLs as links without accepting any markup.
 * Only `mailto:` and `http(s):` hrefs are ever produced.
 */

export type LinkifiedPart =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

// URLs (http/https/www.) or email addresses. Trailing sentence punctuation is
// trimmed below so "write to a@b.org." links "a@b.org".
const LINK_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>"]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]'"]+$/;

export function linkifyText(text: string): LinkifiedPart[] {
  const parts: LinkifiedPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const linkText = raw.replace(TRAILING_PUNCTUATION, "");
    if (linkText === "") continue;
    if (start > cursor) {
      parts.push({ kind: "text", text: text.slice(cursor, start) });
    }
    const href = linkText.includes("@") && !/^(https?:\/\/|www\.)/i.test(linkText)
      ? `mailto:${linkText}`
      : /^www\./i.test(linkText)
        ? `https://${linkText}`
        : linkText;
    parts.push({ kind: "link", text: linkText, href });
    cursor = start + linkText.length;
  }
  if (cursor < text.length) {
    parts.push({ kind: "text", text: text.slice(cursor) });
  }
  return parts;
}
