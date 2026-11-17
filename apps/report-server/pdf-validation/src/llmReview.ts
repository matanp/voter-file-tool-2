import fs from 'fs';
import { BROWSERS, sha256File, type BrowserName } from './common';

/**
 * The LLM pass's output, written by Claude Code (or another reviewer following the checklist)
 * into the run directory as llm-review.json. It can only add problems: `defect` fails the item
 * unless a human accepts it, `question` makes it needs-review, `none` records a clean page.
 */
export const SEVERITIES = ['defect', 'question', 'none'] as const;
export type Severity = (typeof SEVERITIES)[number];
export type LlmFinding = { fixture: string; browser: BrowserName; page: number; finding: string; severity: Severity };
export type LlmReview = { runId: string; checklistSha256: string; reviewer: string; reviewedAt: string; findings: LlmFinding[] };

export type LoadedReview =
  | { state: 'missing' }
  | { state: 'invalid'; error: string }
  | { state: 'ok'; review: LlmReview; checklistCurrent: boolean };

export function validateReview(value: unknown, runId: string): LlmReview {
  const r = value as Partial<LlmReview>;
  if (!r || typeof r !== 'object') throw new Error('not an object');
  if (r.runId !== runId) throw new Error(`runId is ${JSON.stringify(r.runId)}, expected ${runId}`);
  for (const k of ['checklistSha256', 'reviewer', 'reviewedAt'] as const) if (typeof r[k] !== 'string' || !r[k]) throw new Error(`${k} must be a non-empty string`);
  if (!Array.isArray(r.findings)) throw new Error('findings must be an array');
  r.findings.forEach((f, i) => {
    const where = `findings[${i}]`;
    if (typeof f.fixture !== 'string') throw new Error(`${where}.fixture must be a string`);
    if (!BROWSERS.includes(f.browser)) throw new Error(`${where}.browser must be one of ${BROWSERS.join(', ')}`);
    if (!Number.isInteger(f.page) || f.page < 1) throw new Error(`${where}.page must be a page number from 1`);
    if (typeof f.finding !== 'string') throw new Error(`${where}.finding must be a string`);
    if (!SEVERITIES.includes(f.severity)) throw new Error(`${where}.severity must be one of ${SEVERITIES.join(', ')}`);
  });
  return r as LlmReview;
}

export function loadReview(file: string, runId: string, checklistFile: string): LoadedReview {
  if (!fs.existsSync(file)) return { state: 'missing' };
  try {
    const review = validateReview(JSON.parse(fs.readFileSync(file, 'utf8')), runId);
    return { state: 'ok', review, checklistCurrent: review.checklistSha256 === sha256File(checklistFile) };
  } catch (error) {
    return { state: 'invalid', error: error instanceof Error ? error.message : String(error) };
  }
}
