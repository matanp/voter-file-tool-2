import { EMPTY_APPROVALS, type Approvals, type BaselineEntry } from '../approvals';
import { worstStatus, type Check } from '../common';
import { contentChecks, evaluateItem, type EvaluateInput } from '../evaluate';
import { fixtureById, type ManifestFixture } from '../fixtures';
import type { Inspection, PdfFacts } from '../inspect';
import type { LlmReview } from '../llmReview';
import type { RenderRecord } from '../manifest';

/** Pages as pdftotext would give them if the PDF matched every expectation. */
function idealPages(f: ManifestFixture, pageCount = typeof f.expect.pages === 'number' ? f.expect.pages : 1): string[] {
  return Array.from({ length: pageCount }, (_, i) =>
    [
      ...(f.expect.pageTokens?.[i] ?? (i === 0 && !f.expect.pageTokens ? f.expect.orderedTokens : [])),
      ...(f.expect.requiredOnPage ?? []).filter((r) => r.page === i + 1).map((r) => r.text),
      ...(i === 0 ? f.expect.required : []),
    ].join(' '),
  );
}

const sizes = (f: ManifestFixture, n: number) => Array.from({ length: n }, () => ({ widthPt: f.expect.paper.widthPt, heightPt: f.expect.paper.heightPt }));
const byId = (checks: Check[], id: string) => checks.find((c) => c.id === id);

describe('contentChecks', () => {
  const roster = fixtureById('roster-ed45-split');

  it('passes a document that meets every expectation', () => {
    const pages = idealPages(roster);
    const checks = contentChecks(roster, pages, EMPTY_APPROVALS, sizes(roster, pages.length), []);
    expect(checks.filter((c) => c.status !== 'pass')).toEqual([]);
  });

  it('fails a missing row', () => {
    const pages = idealPages(roster).map((p) => p.replace('MEMBER00210', ''));
    const checks = contentChecks(roster, pages, EMPTY_APPROVALS, sizes(roster, 2), []);
    expect(byId(checks, 'token-counts')?.status).toBe('fail');
  });

  it('fails a duplicated row', () => {
    const pages = idealPages(roster);
    pages[1] = `${pages[1]} MEMBER00201`;
    expect(byId(contentChecks(roster, pages, EMPTY_APPROVALS, sizes(roster, 2), []), 'token-counts')?.status).toBe('fail');
  });

  it('fails rows out of order', () => {
    const pages = idealPages(roster).map((p) => p.replace('MEMBER00201', 'TMP').replace('MEMBER00202', 'MEMBER00201').replace('TMP', 'MEMBER00202'));
    const checks = contentChecks(roster, pages, EMPTY_APPROVALS, sizes(roster, 2), []);
    expect(byId(checks, 'token-order')?.status).toBe('fail');
    expect(byId(checks, 'page-tokens')?.status).toBe('fail');
  });

  it('fails a row on the wrong page even when the page count matches', () => {
    const pages = idealPages(roster);
    pages[0] = pages[0]!.replace(' MEMBER00229', '');
    pages[1] = `MEMBER00229 ${pages[1]}`;
    expect(byId(contentChecks(roster, pages, EMPTY_APPROVALS, sizes(roster, 2), []), 'page-tokens')?.status).toBe('fail');
  });

  it('fails a page count or size mismatch', () => {
    const pages = [...idealPages(roster), 'extra'];
    const checks = contentChecks(roster, pages, EMPTY_APPROVALS, [...sizes(roster, 2), { widthPt: 612, heightPt: 792 }], []);
    expect(byId(checks, 'page-count')?.status).toBe('fail');
    expect(byId(checks, 'page-dimensions')?.status).toBe('fail');
  });

  it('allows half a point of dimension tolerance', () => {
    const pages = idealPages(roster);
    const checks = contentChecks(roster, pages, EMPTY_APPROVALS, [{ widthPt: 792.4, heightPt: 611.6 }, { widthPt: 792, heightPt: 612 }], []);
    expect(byId(checks, 'page-dimensions')?.status).toBe('pass');
  });

  it('needs review for a browser-paginated count until a full-Chrome count is approved, then enforces it', () => {
    const vacancy = fixtureById('vacancy-200');
    const pages = idealPages(vacancy, 3);
    expect(byId(contentChecks(vacancy, pages, EMPTY_APPROVALS, sizes(vacancy, 3), []), 'page-count')?.status).toBe('needs-review');
    const approved: Approvals = {
      ...EMPTY_APPROVALS,
      pageCounts: [{ fixtureId: vacancy.id, fixtureHash: vacancy.hash, pages: 4, browser: 'chrome', pdfSha256: 'x', sourceRunId: 'r', reviewer: 'a', approvedAt: 't' }],
    };
    expect(byId(contentChecks(vacancy, pages, approved, sizes(vacancy, 3), []), 'page-count')?.status).toBe('fail');
  });

  it('fails a wrong outcome colour', () => {
    const outcomes = fixtureById('outcomes-quick');
    const samples: Inspection['colorSamples'] = [
      { word: 'Won', page: 1, rgb: [220, 252, 231], color: 'green' },
      { word: 'Unopposed', page: 1, rgb: [220, 252, 231], color: 'green' },
      { word: 'Tie', page: 1, rgb: [255, 255, 255], color: 'white' },
      { word: 'Lost', page: 1, rgb: [255, 255, 255], color: 'white' },
    ];
    expect(byId(contentChecks(outcomes, idealPages(outcomes), EMPTY_APPROVALS, sizes(outcomes, 1), samples), 'outcome-colors')?.status).toBe('fail');
  });
});

describe('evaluateItem', () => {
  const fixture = fixtureById('roster-quick');
  const pages = idealPages(fixture);
  const facts: PdfFacts = {
    readable: true,
    pages: 1,
    pageSizes: sizes(fixture, 1),
    fonts: [{ name: 'ArialMT', type: 'CID TrueType', embedded: true }],
    normalizedPages: pages,
    normalizedRawOrderPages: pages,
  };
  const record: RenderRecord = {
    fixtureId: fixture.id,
    fixtureHash: fixture.hash,
    family: fixture.family,
    jobType: fixture.input.jobType,
    browser: 'shell',
    orderInPair: 0,
    key: 'pdf-validation/x/pdf/shell/roster-quick.pdf',
    startedAt: 't',
    durationMs: 1,
    status: 'ok',
    checks: [],
    sha256: 'cand',
    cssRequests: [],
    interference: { serviceActivity: {}, foreignChrome: [] },
    leftoverProcesses: [],
  };
  const baseline: BaselineEntry = {
    fixtureId: fixture.id,
    fixtureHash: fixture.hash,
    browser: 'chrome',
    pdfSha256: 'ref',
    key: 'k',
    pages: 1,
    sourceRunId: 'r0',
    reviewer: 'a',
    approvedAt: 't',
    versions: { browserVersion: '', puppeteer: '', deployedCommit: '', comparisonImage: '', poppler: '', fonts: [] },
  };
  const cleanReview = (findings: LlmReview['findings'] = [{ fixture: fixture.id, browser: 'shell', page: 1, severity: 'none', finding: 'ok' }]): EvaluateInput['llm'] => ({
    state: 'ok',
    checklistCurrent: true,
    review: { runId: 'r', checklistSha256: 'x', reviewer: 'claude', reviewedAt: 't', findings },
  });
  const inspection = (changedPixels: number, refText = pages): Inspection => ({
    id: 'roster-quick.shell',
    candidate: facts,
    reference: { ...facts, normalizedPages: refText },
    pages: [{ page: 1, png: 'p', diff: { sameSize: true, changedPixels, totalPixels: 100, changedRatio: changedPixels / 100, maxChannelDelta: changedPixels ? 9 : 0, bbox: null, png: null } }],
    colorSamples: [],
  });
  const input = (over: Partial<EvaluateInput> = {}): EvaluateInput => ({
    fixture,
    record,
    downloaded: { ok: true, detail: 'ok' },
    inspection: inspection(0),
    reference: { kind: 'approved', baseline, crossBrowser: true },
    approvals: EMPTY_APPROVALS,
    llm: cleanReview(),
    runId: 'r',
    ...over,
  });

  it('passes a clean, pixel-identical render against an approved baseline with a clean review', () => {
    const result = evaluateItem(input());
    expect(result.checks.filter((c) => c.status !== 'pass')).toEqual([]);
    expect(result.status).toBe('pass');
  });

  it('needs review when the LLM review is missing', () => {
    expect(evaluateItem(input({ llm: { state: 'missing' } })).status).toBe('needs-review');
  });

  it('fails an LLM defect, and a human acceptance of that exact render clears it', () => {
    const llm = cleanReview([{ fixture: fixture.id, browser: 'shell', page: 1, severity: 'defect', finding: 'footer overlaps' }]);
    expect(evaluateItem(input({ llm })).status).toBe('fail');
    const approvals: Approvals = {
      ...EMPTY_APPROVALS,
      acceptances: [{ kind: 'layout-finding', fixtureId: fixture.id, browser: 'shell', page: 1, candidateSha256: 'cand', referenceSha256: null, finding: 'footer overlaps', reason: 'known', reviewer: 'a', runId: 'r', acceptedAt: 't' }],
    };
    expect(evaluateItem(input({ llm, approvals })).status).toBe('pass');
    expect(evaluateItem(input({ llm, approvals, record: { ...record, sha256: 'other' } })).status).toBe('fail');
    // A different finding on the same page is not covered by that acceptance.
    const another = cleanReview([{ fixture: fixture.id, browser: 'shell', page: 1, severity: 'defect', finding: 'row clipped' }]);
    expect(evaluateItem(input({ llm: another, approvals })).status).toBe('fail');
  });

  it('needs review for visual changes until a reviewer accepts them for this candidate and reference', () => {
    expect(evaluateItem(input({ inspection: inspection(5) })).status).toBe('needs-review');
    const approvals: Approvals = {
      ...EMPTY_APPROVALS,
      acceptances: [{ kind: 'visual-change', fixtureId: fixture.id, browser: 'shell', page: 1, candidateSha256: 'cand', referenceSha256: 'ref', finding: null, reason: 'glyph advances', reviewer: 'a', runId: 'r', acceptedAt: 't' }],
    };
    expect(evaluateItem(input({ inspection: inspection(5), approvals })).status).toBe('pass');
  });

  it('fails text that differs from an approved baseline, but only needs review against an unapproved one', () => {
    const drifted = inspection(0, ['something else']);
    expect(evaluateItem(input({ inspection: drifted })).status).toBe('fail');
    expect(evaluateItem(input({ inspection: drifted, reference: { kind: 'in-run-chrome', sha256: 'ref' } })).status).toBe('needs-review');
  });

  it('fails when the box rendered a different fixture definition', () => {
    const result = evaluateItem(input({ record: { ...record, fixtureHash: 'stale' } }));
    expect(result.checks.find((c) => c.id === 'fixture-hash')?.status).toBe('fail');
  });

  it('fails a hash mismatch and a failed box render', () => {
    expect(evaluateItem(input({ downloaded: { ok: false, detail: 'sha256 differs' } })).status).toBe('fail');
    expect(evaluateItem(input({ record: { ...record, status: 'failed', checks: [{ id: 'completed', ok: false, detail: 'timeout' }] } })).status).toBe('fail');
  });

  it('fails a render that was never inspected', () => {
    expect(evaluateItem(input({ inspection: null })).checks.find((c) => c.id === 'inspection')?.status).toBe('fail');
  });

  it('needs review without any baseline', () => {
    expect(evaluateItem(input({ reference: { kind: 'none' } })).status).toBe('needs-review');
  });
});

describe('required text across extractions', () => {
  const changes = fixtureById('changes-quick');

  it('finds a wrapped cell in raw-order text when -layout interleaves it', () => {
    const layout = idealPages(changes).map((p) => p.replace('Feb 23, 2026', 'Feb CHG00004 23, BRIGHTON 2026'));
    const raw = idealPages(changes);
    expect(byId(contentChecks(changes, layout, EMPTY_APPROVALS, sizes(changes, 1), []), 'required-text')?.status).toBe('fail');
    expect(byId(contentChecks(changes, layout, EMPTY_APPROVALS, sizes(changes, 1), [], raw), 'required-text')?.status).toBe('pass');
  });

  it('does not match "Sheet No. 1" inside "Sheet No. 10"', () => {
    const petition = fixtureById('petition-10-long');
    const pages = idealPages(petition);
    pages[0] = pages[0]!.replace('Sheet No. 1', 'Sheet No. 10');
    expect(byId(contentChecks(petition, pages, EMPTY_APPROVALS, sizes(petition, 10), []), 'page-text')?.status).toBe('fail');
  });
});

describe('worstStatus', () => {
  it('ranks fail over needs-review over pass', () => {
    expect(worstStatus(['pass', 'needs-review', 'fail', 'pass'])).toBe('fail');
    expect(worstStatus(['pass', 'needs-review'])).toBe('needs-review');
    expect(worstStatus([])).toBe('pass');
  });
});
