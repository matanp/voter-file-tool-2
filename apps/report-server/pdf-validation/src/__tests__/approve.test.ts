import fs from 'fs';
import os from 'os';
import path from 'path';
import { approve } from '../approve';
import { loadApprovals, saveApprovals, type Approvals } from '../approvals';
import { sha256, writeJson, type BrowserName, type Check } from '../common';
import type { ItemResult } from '../evaluate';
import { fixtureById } from '../fixtures';

jest.mock('../approvals', () => ({ loadApprovals: jest.fn(), saveApprovals: jest.fn() }));
const RUN = '20261116T153000Z-ab12cd';
let runsDir: string;
let approvals: Approvals;
beforeEach(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-approve-'));
  approvals = { version: 1, baselines: [], pageCounts: [], acceptances: [], thresholds: [] };
  jest.mocked(loadApprovals).mockReturnValue(approvals);
  jest.mocked(saveApprovals).mockClear();
});
afterEach(() => { fs.rmSync(runsDir, { recursive: true, force: true }); });

async function approveCount(fixtureId: string, browser: BrowserName, pageCounts: boolean, extraChecks: Check[] = []) {
  const fixture = fixtureById(fixtureId);
  const runDir = path.join(runsDir, RUN);
  const pdf = Buffer.from('%PDF-1.4\n%%EOF');
  const relative = `pdf/${browser}/${fixtureId}.pdf`;
  fs.mkdirSync(path.join(runDir, 'downloaded', 'pdf', browser), { recursive: true });
  fs.writeFileSync(path.join(runDir, 'downloaded', relative), pdf);
  approvals.pageCounts.push({ fixtureId, fixtureHash: fixture.hash, pages: 2, browser: 'chrome', pdfSha256: 'old', sourceRunId: 'old', reviewer: 'old', approvedAt: 'old' });
  const item: ItemResult = {
    id: `${fixtureId}.${browser}`, fixtureId, browser, status: 'fail', pages: 1, candidateSha256: sha256(pdf),
    reference: { kind: 'none', sha256: null, crossBrowser: false }, reviewNotes: [],
    checks: [{ id: 'page-count', status: 'fail', detail: 'expected 2, got 1' }, ...extraChecks],
  };
  writeJson(path.join(runDir, 'results.json'), { llmReview: 'ok', items: [item] });
  writeJson(path.join(runDir, 'downloaded', 'manifest.json'), {
    deployed: { revision: { unavailable: 'test' } },
    renders: [{ fixtureId, browser, key: `pdf-validation/${RUN}/${relative}` }],
  });
  writeJson(path.join(runDir, 'inspect', item.id, 'inspection.json'), {});
  await approve({ runId: RUN, runsDir, envFile: '', reviewer: 'Reviewer', baselines: false, pageCounts, fixtures: null, browser });
}

it('replaces an approved browser-paginated count after an explicit Chrome approval', async () => {
  await approveCount('changes-quick', 'chrome', true);
  expect(approvals.pageCounts).toHaveLength(1);
  expect(approvals.pageCounts[0]).toMatchObject({ pages: 1, reviewer: 'Reviewer', sourceRunId: RUN });
  expect(saveApprovals).toHaveBeenCalledWith(approvals);
});

it.each([
  ['fixed fixture count', 'roster-quick', 'chrome', true, []],
  ['shell render', 'changes-quick', 'shell', true, []],
  ['no page-count approval', 'changes-quick', 'chrome', false, []],
  ['missing content', 'changes-quick', 'chrome', true, [{ id: 'token-counts', status: 'fail', detail: 'missing row' }]],
] satisfies [string, string, BrowserName, boolean, Check[]][])('does not waive %s', async (_label, fixture, browser, pageCounts, checks) => {
  await approveCount(fixture, browser, pageCounts, checks);
  expect(approvals.pageCounts[0]?.pages).toBe(2);
});
