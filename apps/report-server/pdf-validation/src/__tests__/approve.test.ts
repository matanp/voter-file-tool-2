import fs from 'fs';
import os from 'os';
import path from 'path';
import { approve } from '../approve';
import { loadApprovals, saveApprovals, type Approvals } from '../approvals';
import { sha256, writeJson, type BrowserName, type Check } from '../common';
import type { ItemResult } from '../evaluate';
import { fixtureById } from '../fixtures';
import { Storage, loadStorageConfig } from '../storage';

jest.mock('../approvals', () => ({ loadApprovals: jest.fn(), saveApprovals: jest.fn() }));
jest.mock('../storage');
const RUN = '20261116T153000Z-ab12cd';
let runsDir: string;
let approvals: Approvals;
beforeEach(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-approve-'));
  approvals = { version: 1, baselines: [], pageCounts: [], acceptances: [], thresholds: [] };
  jest.mocked(loadApprovals).mockReturnValue(approvals);
  jest.mocked(saveApprovals).mockClear();
  jest.mocked(loadStorageConfig).mockReturnValue({
    r2: { R2_ACCOUNT_ID: 'test', R2_ACCESS_KEY_ID: 'test', R2_SECRET_ACCESS_KEY: 'test', R2_BUCKET_NAME: 'test' },
    source: 'test-bucket', envFile: '', envFileFound: true,
  });
  jest.mocked(Storage.prototype.exists).mockReset().mockResolvedValue(false);
  jest.mocked(Storage.prototype.put).mockReset().mockResolvedValue(undefined);
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
    renders: [{ fixtureId, fixtureHash: fixture.hash, browser, key: `pdf-validation/${RUN}/${relative}` }],
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

describe.each([
  { baselines: true, pageCounts: false },
  { baselines: false, pageCounts: true },
  { baselines: true, pageCounts: true },
])('fixture identity with baselines=$baselines, pageCounts=$pageCounts', (options) => {
  it.each([false, true])('checks the manifest hash even when cached checks passed (stale=%s)', async (stale) => {
    const fixture = fixtureById('changes-quick');
    const fixtureHash = stale ? 'previous-fixture-definition' : fixture.hash;
    const runDir = path.join(runsDir, RUN);
    const relative = 'pdf/chrome/changes-quick.pdf';
    const pdf = Buffer.from('%PDF-1.4\n%%EOF');
    const item: ItemResult = {
      id: 'changes-quick.chrome', fixtureId: fixture.id, browser: 'chrome', status: 'pass', pages: 2,
      candidateSha256: sha256(pdf), reference: { kind: 'none', sha256: null, crossBrowser: false }, reviewNotes: [],
      checks: [{ id: 'fixture-hash', status: 'pass', detail: fixtureHash }],
    };
    fs.mkdirSync(path.join(runDir, 'downloaded', 'pdf', 'chrome'), { recursive: true });
    fs.writeFileSync(path.join(runDir, 'downloaded', relative), pdf);
    writeJson(path.join(runDir, 'results.json'), { llmReview: 'ok', items: [item] });
    writeJson(path.join(runDir, 'downloaded', 'manifest.json'), {
      deployed: { revision: { unavailable: 'test' } }, versions: { puppeteer: 'test' },
      renders: [{ fixtureId: fixture.id, fixtureHash, browser: 'chrome', key: `pdf-validation/${RUN}/${relative}` }],
    });
    writeJson(path.join(runDir, 'inspect', item.id, 'inspection.json'), { candidate: { fonts: [] } });

    const result = approve({ runId: RUN, runsDir, envFile: '', reviewer: 'Reviewer', fixtures: null, browser: 'chrome', ...options });
    if (stale) {
      await expect(result).rejects.toThrow('rendered fixture hash does not match the current definition');
      expect(saveApprovals).not.toHaveBeenCalled();
      expect(Storage.prototype.exists).not.toHaveBeenCalled();
      expect(Storage.prototype.put).not.toHaveBeenCalled();
      expect(approvals.baselines).toEqual([]);
      expect(approvals.pageCounts).toEqual([]);
    } else {
      await expect(result).resolves.toBe(0);
      expect(saveApprovals).toHaveBeenCalledWith(approvals);
      expect(approvals.baselines).toHaveLength(options.baselines ? 1 : 0);
      expect(approvals.pageCounts).toHaveLength(options.pageCounts ? 1 : 0);
      for (const entry of [...approvals.baselines, ...approvals.pageCounts]) {
        expect(entry).toMatchObject({ fixtureHash, pdfSha256: sha256(pdf) });
      }
    }
  });
});
