/**
 * Human approval, recorded in baselines/approvals.json for committing. A person runs these
 * after reading the run's summary, images, diffs and LLM findings; the harness never approves.
 *
 *   approve --run-id <id> --reviewer <name> --baselines [--page-counts] [--fixtures a,b] [--browser chrome]
 *   accept  --run-id <id> --reviewer <name> --kind visual-change|layout-finding --item <fixture>.<browser> --page <n> --reason <text>
 */
import fs from 'fs';
import path from 'path';
import { loadApprovals, saveApprovals, type Acceptance, type BaselineEntry } from './approvals';
import { baselineKey, readJson, runPrefix, sha256File, type BrowserName } from './common';
import { isUnavailable } from './diagnostics';
import { fixtureById } from './fixtures';
import type { Inspection } from './inspect';
import type { RunManifest } from './manifest';
import { Storage, loadStorageConfig } from './storage';
import type { VerifyResults } from './verify';

/** Checks that compare against an older baseline; a new baseline is what replaces it. */
const SUPERSEDED_BY_APPROVAL = new Set(['baseline-pages', 'baseline-text']);

function load(runsDir: string, runId: string) {
  const runDir = path.join(runsDir, runId);
  const resultsFile = path.join(runDir, 'results.json');
  if (!fs.existsSync(resultsFile)) throw new Error(`No results.json for ${runId}: run verify first`);
  return {
    runDir,
    results: readJson<VerifyResults>(resultsFile),
    manifest: readJson<RunManifest>(path.join(runDir, 'downloaded', 'manifest.json')),
  };
}

export async function approve(opts: {
  runId: string;
  runsDir: string;
  envFile: string;
  reviewer: string;
  baselines: boolean;
  pageCounts: boolean;
  fixtures: string[] | null;
  browser: BrowserName | null;
}): Promise<number> {
  if (!opts.reviewer.trim()) throw new Error('--reviewer is required');
  const { runDir, results, manifest } = load(opts.runsDir, opts.runId);
  if (results.llmReview !== 'ok') throw new Error('The LLM review has not been merged for this run (results.json llmReview is not ok)');
  const approvals = loadApprovals();
  const storage = opts.baselines ? new Storage(loadStorageConfig(opts.envFile).r2) : null;
  const now = new Date().toISOString();
  const rev = manifest.deployed.revision;
  let changed = 0;

  for (const item of results.items) {
    if (opts.fixtures && !opts.fixtures.includes(item.fixtureId)) continue;
    if (opts.browser && item.browser !== opts.browser) continue;
    const blocking = item.checks.filter((c) => c.status === 'fail' && !SUPERSEDED_BY_APPROVAL.has(c.id));
    if (blocking.length) {
      console.log(`skip ${item.id}: failing ${blocking.map((c) => c.id).join(', ')}; a failing render can't become a baseline`);
      continue;
    }
    const record = manifest.renders.find((r) => r.fixtureId === item.fixtureId && r.browser === item.browser)!;
    const fixture = fixtureById(item.fixtureId);
    const pdf = path.join(runDir, 'downloaded', record.key.slice(runPrefix(opts.runId).length));
    if (!item.candidateSha256 || sha256File(pdf) !== item.candidateSha256) throw new Error(`${pdf} doesn't match its verified hash`);
    const inspection = readJson<Inspection>(path.join(runDir, 'inspect', item.id, 'inspection.json'));

    if (opts.pageCounts && fixture.expect.pages === 'browser-paginated' && item.browser === 'chrome') {
      approvals.pageCounts = approvals.pageCounts.filter((p) => !(p.fixtureId === fixture.id && p.fixtureHash === fixture.hash));
      approvals.pageCounts.push({ fixtureId: fixture.id, fixtureHash: fixture.hash, pages: item.pages, browser: 'chrome', pdfSha256: item.candidateSha256, sourceRunId: opts.runId, reviewer: opts.reviewer, approvedAt: now });
      console.log(`page count ${fixture.id}: ${item.pages} (from full Chrome)`);
      changed++;
    }
    if (opts.baselines && storage) {
      const key = baselineKey(item.candidateSha256);
      if (!(await storage.exists(key))) await storage.put(key, fs.readFileSync(pdf), 'application/pdf');
      const entry: BaselineEntry = {
        fixtureId: fixture.id,
        fixtureHash: fixture.hash,
        browser: item.browser,
        pdfSha256: item.candidateSha256,
        key,
        pages: item.pages,
        sourceRunId: opts.runId,
        reviewer: opts.reviewer,
        approvedAt: now,
        versions: {
          browserVersion: record.browserVersion ?? 'unknown',
          puppeteer: manifest.versions.puppeteer,
          deployedCommit: isUnavailable(rev) ? 'unknown' : rev.commit,
          comparisonImage: results.image?.imageId ?? 'unknown',
          poppler: results.tools ? `${results.tools.poppler} (${results.tools.popplerPackage})` : 'unknown',
          fonts: [...new Set(inspection.candidate.fonts.map((f) => f.name))],
        },
      };
      approvals.baselines = approvals.baselines.filter((b) => !(b.fixtureId === entry.fixtureId && b.fixtureHash === entry.fixtureHash && b.browser === entry.browser));
      approvals.baselines.push(entry);
      console.log(`baseline ${item.id}: ${item.candidateSha256.slice(0, 12)} -> ${key}`);
      changed++;
    }
  }
  approvals.baselines.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId) || a.browser.localeCompare(b.browser));
  approvals.pageCounts.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId));
  saveApprovals(approvals);
  console.log(`${changed} approval(s) recorded in baselines/approvals.json; commit it, then verify again.`);
  return 0;
}

export function accept(opts: { runId: string; runsDir: string; reviewer: string; kind: Acceptance['kind']; item: string; page: number; reason: string }): number {
  if (!opts.reviewer.trim() || !opts.reason.trim()) throw new Error('--reviewer and --reason are required');
  const { results } = load(opts.runsDir, opts.runId);
  const item = results.items.find((i) => i.id === opts.item);
  if (!item?.candidateSha256) throw new Error(`No verified render ${opts.item} in ${opts.runId}`);
  if (!Number.isInteger(opts.page) || opts.page < 1 || opts.page > item.pages) throw new Error(`${opts.item} has pages 1-${item.pages}`);
  if (opts.kind === 'visual-change' && !item.reference.sha256) throw new Error(`${opts.item} has no reference to accept a visual change against`);
  const contentFailures = item.checks.filter((c) => c.status === 'fail' && !['llm-defects', ...SUPERSEDED_BY_APPROVAL].includes(c.id));
  if (contentFailures.length) throw new Error(`${opts.item} fails ${contentFailures.map((c) => c.id).join(', ')}: missing or duplicated content can't be waived`);
  const approvals = loadApprovals();
  approvals.acceptances.push({
    kind: opts.kind,
    fixtureId: item.fixtureId,
    browser: item.browser,
    page: opts.page,
    candidateSha256: item.candidateSha256,
    referenceSha256: opts.kind === 'visual-change' ? item.reference.sha256 : null,
    reason: opts.reason,
    reviewer: opts.reviewer,
    runId: opts.runId,
    acceptedAt: new Date().toISOString(),
  });
  saveApprovals(approvals);
  console.log(`accepted ${opts.kind} on ${opts.item} page ${opts.page}; verify again to apply it.`);
  return 0;
}
