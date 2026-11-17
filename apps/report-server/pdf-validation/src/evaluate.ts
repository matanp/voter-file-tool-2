import { findPageCount, isAccepted, type Approvals, type BaselineEntry } from './approvals';
import { DIMENSION_TOLERANCE_PT, worstStatus, type BrowserName, type Check, type Status } from './common';
import type { ManifestFixture } from './fixtures';
import type { Inspection } from './inspect';
import type { LlmFinding, LoadedReview } from './llmReview';
import type { RenderRecord } from './manifest';
import { countOccurrences, includesWhole, normalizePageText } from './text';

/** Where an item's comparison reference came from. Only approved references can pass. */
export type Reference =
  | { kind: 'approved'; baseline: BaselineEntry; crossBrowser: boolean }
  | { kind: 'in-run-chrome'; sha256: string }
  | { kind: 'none' };

export type ItemResult = {
  id: string;
  fixtureId: string;
  browser: BrowserName;
  status: Status;
  checks: Check[];
  pages: number;
  candidateSha256: string | null;
  reference: { kind: Reference['kind']; sha256: string | null; crossBrowser: boolean };
  reviewNotes: string[];
};

const pass = (id: string, detail: string): Check => ({ id, status: 'pass', detail });
const fail = (id: string, detail: string): Check => ({ id, status: 'fail', detail });
const review = (id: string, detail: string): Check => ({ id, status: 'needs-review', detail });
const list = (items: string[], max = 8) => (items.length > max ? `${items.slice(0, max).join(', ')}, … (${items.length} total)` : items.join(', '));

/** Content checks against the fixture's independent expectations. Text is already normalized per page. */
export function contentChecks(
  fixture: ManifestFixture,
  pages: string[],
  approvals: Approvals,
  pageSizes: { widthPt: number; heightPt: number }[],
  colorSamples: Inspection['colorSamples'],
  rawOrderPages: string[] = pages,
): Check[] {
  const e = fixture.expect;
  const checks: Check[] = [];
  const doc = pages.join('\n');
  const rawDoc = rawOrderPages.join('\n');
  // Required strings may come from either extraction: -layout keeps rows on one line, -raw keeps
  // a wrapped cell's words together. Tokens, order and page placement use -layout only.
  const hasText = (text: string, page?: number) => {
    const needle = normalizePageText(text);
    return page === undefined
      ? includesWhole(doc, needle) || includesWhole(rawDoc, needle)
      : includesWhole(pages[page - 1] ?? '', needle) || includesWhole(rawOrderPages[page - 1] ?? '', needle);
  };

  // Page count: from the fixture, else from an approved full-Chrome reference. Never from the candidate.
  let expectedPages: number | null = null;
  if (e.pages === 'browser-paginated') {
    const approved = findPageCount(approvals, fixture.id, fixture.hash);
    if (approved) expectedPages = approved.pages;
    else checks.push(review('page-count', `browser-paginated, and no approved full-Chrome page count yet (rendered ${pages.length})`));
  } else {
    expectedPages = e.pages;
  }
  if (expectedPages !== null) {
    checks.push(pages.length === expectedPages ? pass('page-count', `${pages.length} page(s)`) : fail('page-count', `expected ${expectedPages}, got ${pages.length}`));
  }

  const wrongSize = pageSizes
    .map((s, i) => ({ s, page: i + 1 }))
    .filter(({ s }) => Math.abs(s.widthPt - e.paper.widthPt) > DIMENSION_TOLERANCE_PT || Math.abs(s.heightPt - e.paper.heightPt) > DIMENSION_TOLERANCE_PT);
  checks.push(
    wrongSize.length === 0 && pageSizes.length === pages.length
      ? pass('page-dimensions', `${e.paper.name}, ${e.paper.widthPt} x ${e.paper.heightPt} pt on every page`)
      : fail('page-dimensions', `expected ${e.paper.widthPt} x ${e.paper.heightPt} pt; ${list(wrongSize.map(({ s, page }) => `p${page} ${s.widthPt} x ${s.heightPt}`))}`),
  );

  const badCounts = Object.entries(e.tokenCounts)
    .map(([token, want]) => ({ token, want, got: countOccurrences(doc, token) }))
    .filter((c) => c.got !== c.want);
  checks.push(
    badCounts.length === 0
      ? pass('token-counts', `${Object.keys(e.tokenCounts).length} token(s) at their expected counts`)
      : fail('token-counts', list(badCounts.map((c) => `${c.token} x${c.got} (want ${c.want})`))),
  );

  let last = -1;
  const outOfOrder: string[] = [];
  for (const token of e.orderedTokens) {
    const at = doc.indexOf(token);
    if (at === -1) continue; // reported by token-counts
    if (at < last) outOfOrder.push(token);
    last = Math.max(last, at);
  }
  checks.push(outOfOrder.length === 0 ? pass('token-order', `${e.orderedTokens.length} token(s) in order`) : fail('token-order', `out of order: ${list(outOfOrder)}`));

  if (e.pageTokens) {
    const misplaced: string[] = [];
    e.pageTokens.forEach((tokens, i) => {
      const text = pages[i] ?? '';
      let pos = -1;
      for (const t of tokens) {
        const at = text.indexOf(t);
        if (at === -1 || at < pos) misplaced.push(`${t} (p${i + 1})`);
        else pos = at;
      }
    });
    checks.push(misplaced.length === 0 ? pass('page-tokens', 'every row on its expected page, in order') : fail('page-tokens', `missing or out of order: ${list(misplaced)}`));
  }

  const missingText = e.required.filter((t) => !hasText(t));
  checks.push(missingText.length === 0 ? pass('required-text', `${e.required.length} string(s) present`) : fail('required-text', `missing: ${list(missingText.map((t) => JSON.stringify(t)))}`));

  if (e.requiredOnPage?.length) {
    const missingOnPage = e.requiredOnPage.filter(({ page, text }) => !hasText(text, page));
    checks.push(
      missingOnPage.length === 0
        ? pass('page-text', `${e.requiredOnPage.length} per-page string(s) present`)
        : fail('page-text', `missing: ${list(missingOnPage.map(({ page, text }) => `p${page} ${JSON.stringify(text)}`))}`),
    );
  }

  const present = (e.forbidden ?? []).filter((t) => includesWhole(doc, t) || includesWhole(rawDoc, t));
  if (e.forbidden?.length) checks.push(present.length === 0 ? pass('forbidden-text', `${e.forbidden.length} string(s) absent`) : fail('forbidden-text', `present: ${list(present.map((t) => JSON.stringify(t)))}`));

  if (e.colorSamples?.length) {
    const problems: string[] = [];
    for (const s of e.colorSamples) {
      const seen = colorSamples.filter((c) => c.word === s.word);
      if (seen.length !== s.occurrences) problems.push(`${s.word}: sampled ${seen.length}, want ${s.occurrences}`);
      const wrong = seen.filter((c) => c.color !== s.expected);
      if (wrong.length) problems.push(`${s.word} on ${list(wrong.map((c) => `p${c.page} ${c.color}${c.rgb ? ` rgb(${c.rgb.join(',')})` : ''}`), 3)} (want ${s.expected})`);
    }
    checks.push(problems.length === 0 ? pass('outcome-colors', e.colorSamples.map((s) => `${s.word} ${s.expected}`).join(', ')) : fail('outcome-colors', problems.join('; ')));
  }
  return checks;
}

export type EvaluateInput = {
  fixture: ManifestFixture | null;
  record: RenderRecord;
  downloaded: { ok: boolean; detail: string };
  inspection: Inspection | null;
  reference: Reference;
  approvals: Approvals;
  llm: LoadedReview;
  runId: string;
};

export function evaluateItem(input: EvaluateInput): ItemResult {
  const { record, fixture, inspection, reference, approvals } = input;
  const id = `${record.fixtureId}.${record.browser}`;
  const checks: Check[] = [];
  const refSha = reference.kind === 'approved' ? reference.baseline.pdfSha256 : reference.kind === 'in-run-chrome' ? reference.sha256 : null;
  const result = (): ItemResult => ({
    id,
    fixtureId: record.fixtureId,
    browser: record.browser,
    status: worstStatus(checks.map((c) => c.status)),
    checks,
    pages: inspection?.candidate.pages ?? 0,
    candidateSha256: record.sha256 ?? null,
    reference: { kind: reference.kind, sha256: refSha, crossBrowser: reference.kind === 'approved' && reference.crossBrowser },
    reviewNotes: fixture?.expect.reviewNotes ?? [],
  });

  checks.push(
    record.status === 'ok'
      ? pass('box-render', `rendered and uploaded in ${record.durationMs} ms; ${record.checks.map((c) => c.id).join(', ')} ok`)
      : fail('box-render', record.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail.split('\n')[0]}`).join('; ')),
  );
  if (!fixture) {
    checks.push(fail('fixture-hash', `this harness has no fixture ${record.fixtureId}`));
    return result();
  }
  checks.push(
    fixture.hash === record.fixtureHash
      ? pass('fixture-hash', fixture.hash.slice(0, 12))
      : fail('fixture-hash', `rendered from fixture ${record.fixtureHash.slice(0, 12)}, this harness has ${fixture.hash.slice(0, 12)}: render and verify with the same harness revision`),
  );
  checks.push(input.downloaded.ok ? pass('sha256', input.downloaded.detail) : fail('sha256', input.downloaded.detail));
  if (record.status !== 'ok' || !input.downloaded.ok) return result();
  if (!inspection) {
    // An uninspected PDF had none of the page, text or visual checks; it can't count as passing.
    checks.push(fail('inspection', 'not inspected (see the comparison-image run check)'));
    return result();
  }

  const c = inspection.candidate;
  if (!c.readable) {
    checks.push(fail('readable', c.error ?? 'unreadable'));
    return result();
  }
  checks.push(pass('readable', `${c.pages} page(s); fonts ${[...new Set(c.fonts.map((f) => `${f.name}${f.embedded ? '' : ' (NOT embedded)'}`))].join(', ') || 'none'}`));
  if (c.fonts.some((f) => !f.embedded)) checks.push(review('fonts-embedded', 'a font is not embedded'));
  checks.push(...contentChecks(fixture, c.normalizedPages, approvals, c.pageSizes, inspection.colorSamples, c.normalizedRawOrderPages));

  // ------------------------------------------------------------ baseline comparison
  if (reference.kind === 'none') {
    checks.push(review('baseline', 'no approved baseline for this fixture and browser (and no full-Chrome render in this run to compare with)'));
  } else {
    const approved = reference.kind === 'approved';
    const label = approved ? `approved ${reference.baseline.browser} baseline from ${reference.baseline.sourceRunId}` : "this run's chrome render (not approved)";
    checks.push(approved ? pass('baseline', label) : review('baseline', `no approved baseline; compared with ${label}`));
    const r = inspection.reference;
    if (!r?.readable) {
      checks.push(fail('baseline-readable', r?.error ?? 'reference PDF missing'));
    } else {
      const mismatch = approved ? fail : review;
      checks.push(r.pages === c.pages ? pass('baseline-pages', `${c.pages} page(s), as the reference`) : mismatch('baseline-pages', `reference has ${r.pages}, candidate ${c.pages}`));
      const textDiff = c.normalizedPages.map((t, i) => ({ page: i + 1, same: t === r.normalizedPages[i] })).filter((p) => !p.same);
      checks.push(textDiff.length === 0 ? pass('baseline-text', 'normalized text identical on every page') : mismatch('baseline-text', `differs on ${list(textDiff.map((p) => `p${p.page}`))}`));
      const changed = inspection.pages.filter((p) => p.diff && p.diff.changedPixels > 0);
      const unaccepted = changed.filter(
        (p) => !isAccepted(approvals, 'visual-change', { fixtureId: record.fixtureId, browser: record.browser, page: p.page, candidateSha256: record.sha256 ?? '', referenceSha256: refSha }),
      );
      checks.push(
        changed.length === 0
          ? pass('visual-diff', 'pixel-identical to the reference at 144 DPI')
          : unaccepted.length === 0
            ? pass('visual-diff', `${changed.length} changed page(s), all accepted by a reviewer`)
            : review('visual-diff', `changed pixels on ${list(unaccepted.map((p) => `p${p.page} ${(p.diff!.changedRatio * 100).toFixed(2)}%`))}; see diff/`),
      );
    }
  }

  // ------------------------------------------------------------ LLM review
  const llm = input.llm;
  if (llm.state === 'missing') checks.push(review('llm-review', 'llm-review.json not written yet'));
  else if (llm.state === 'invalid') checks.push(fail('llm-review', `llm-review.json is invalid: ${llm.error}`));
  else {
    const mine = llm.review.findings.filter((f) => f.fixture === record.fixtureId && f.browser === record.browser);
    const unreviewed = Array.from({ length: c.pages }, (_, i) => i + 1).filter((p) => !mine.some((f) => f.page === p));
    if (unreviewed.length) checks.push(review('llm-coverage', `pages not reviewed: ${list(unreviewed.map(String))}`));
    const accepted = (f: LlmFinding) =>
      isAccepted(approvals, 'layout-finding', { fixtureId: record.fixtureId, browser: record.browser, page: f.page, candidateSha256: record.sha256 ?? '', referenceSha256: null, finding: f.finding });
    const defects = mine.filter((f) => f.severity === 'defect' && !accepted(f));
    const questions = mine.filter((f) => f.severity === 'question' && !accepted(f));
    if (defects.length) checks.push(fail('llm-defects', defects.map((f) => `p${f.page}: ${f.finding}`).join(' | ')));
    if (questions.length) checks.push(review('llm-questions', questions.map((f) => `p${f.page}: ${f.finding}`).join(' | ')));
    if (!defects.length && !questions.length && !unreviewed.length) checks.push(pass('llm-review', `${c.pages} page(s) reviewed, no open findings`));
  }
  return result();
}
