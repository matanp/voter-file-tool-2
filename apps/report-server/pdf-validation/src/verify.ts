/**
 * `verify` (on the operator's machine): downloads a run's manifest and PDFs from R2, checks
 * their SHA-256s, inspects them in the pinned comparison image, evaluates them against the
 * fixtures, approved baselines and the LLM review, and writes results.json and summary.md.
 * Owns the run's exit code: 0 pass, 1 fail, 2 needs-review.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { findBaseline, loadApprovals } from './approvals';
import {
  CHECKLIST_FILE,
  COMPARISON_IMAGE_DIR,
  EXIT_CODE,
  HARNESS_DIR,
  MANIFEST_NAME,
  REPO_DIR,
  assertKeyInRun,
  assertRunId,
  errorMessage,
  readJson,
  runPrefix,
  sha256,
  sha256File,
  worstStatus,
  writeJson,
  type Check,
  type Status,
} from './common';
import { cleanupVerifiedRun, type CleanupResult } from './cleanup';
import { gitRevision, isUnavailable, treeHash } from './diagnostics';
import { evaluateItem, type ItemResult, type Reference } from './evaluate';
import { ALL_FIXTURES, FIXTURE_MANIFEST_VERSION, jobTypesCovered } from './fixtures';
import { PDF_JOB_TYPES } from './fixtures/types';
import type { InspectItem, InspectJob, Inspection, ToolVersions } from './inspect';
import { loadReview, type LoadedReview } from './llmReview';
import { MANIFEST_VERSION, READABLE_MANIFEST_VERSIONS, type RemoteObject, type RenderRecord, type RunManifest } from './manifest';
import { memoryChecks, scenarioChecks, type MemoryGroup } from './measurementChecks';
import type { MeasurementsFile } from './measurements';
import type { FailureScenariosFile, ScenarioResult } from './scenarios';
import { Storage, loadStorageConfig } from './storage';
import { writeLlmRequest, writeSummary } from './summary';

export type VerifyOptions = {
  runId: string;
  runsDir: string;
  envFile: string;
  keepRemote: boolean;
  platform: string;
  reinspect: boolean;
  downloadTimeoutMs: number;
};

export type ComparisonImage = { tag: string; imageId: string; platform: string; dockerfileSha256: string; baseImage: string };

export type VerifyResults = {
  runId: string;
  status: Status;
  verifiedAt: string;
  verifier: { revision: ReturnType<typeof gitRevision>; node: string };
  image: ComparisonImage | null;
  tools: ToolVersions | null;
  approvalsSha256: string | null;
  llmReview: LoadedReview['state'];
  runChecks: Check[];
  items: ItemResult[];
  /** `--measured` runs: per fixture and browser, judged against approved thresholds. */
  memory?: MemoryGroup[];
  failureScenarios?: ScenarioResult[] | null;
  cleanup: CleanupResult | { skipped: string };
  counts: Record<Status, number>;
};

const containerPath = (runDir: string, file: string) => `/work/${path.relative(runDir, file).split(path.sep).join('/')}`;

export function comparisonImage(platform: string): ComparisonImage {
  const dockerfile = path.join(COMPARISON_IMAGE_DIR, 'Dockerfile');
  const dockerfileSha256 = sha256File(dockerfile);
  const tag = `vft-pdf-compare:${dockerfileSha256.slice(0, 12)}`;
  const baseImage = /^FROM\s+(\S+)/m.exec(fs.readFileSync(dockerfile, 'utf8'))?.[1] ?? 'unknown';
  const inspectId = () => spawnSync('docker', ['image', 'inspect', '--format', '{{.Id}} {{.Os}}/{{.Architecture}}', tag], { encoding: 'utf8' });
  let found = inspectId();
  if (found.status !== 0 || !found.stdout.includes(platform)) {
    console.log(`building ${tag} (${platform}) from ${dockerfile}`);
    const build = spawnSync('docker', ['build', '--platform', platform, '-t', tag, COMPARISON_IMAGE_DIR], { stdio: 'inherit' });
    if (build.status !== 0) throw new Error(`docker build failed (exit ${String(build.status)})`);
    found = inspectId();
  }
  if (found.status !== 0) throw new Error(`docker image inspect ${tag} failed: ${found.stderr}`);
  const [imageId] = found.stdout.trim().split(' ');
  return { tag, imageId: imageId ?? 'unknown', platform, dockerfileSha256, baseImage };
}

/** Download and hash-check every evidence object, including non-PDF logs. */
export async function downloadObjects(
  storage: Pick<Storage, 'get'>,
  objects: RemoteObject[],
  runId: string,
  downloadDir: string,
  timeoutMs: number,
) {
  const prefix = runPrefix(runId);
  const downloaded = new Map<string, { ok: boolean; detail: string; file: string }>();
  for (const object of objects) {
    assertKeyInRun(object.key, runId);
    const file = path.join(downloadDir, object.key.slice(prefix.length));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      if (!fs.existsSync(file) || sha256File(file) !== object.sha256) {
        console.log(`downloading ${object.key}`);
        fs.writeFileSync(file, await storage.get(object.key, timeoutMs));
      }
      const got = sha256File(file);
      downloaded.set(object.key, got === object.sha256 ? { ok: true, detail: `sha256 ${got.slice(0, 12)} matches the manifest`, file } : { ok: false, detail: `sha256 ${got.slice(0, 12)}, manifest says ${object.sha256.slice(0, 12)}`, file });
    } catch (error) {
      downloaded.set(object.key, { ok: false, detail: `download failed: ${errorMessage(error)}`, file });
    }
  }

  const checks: Check[] = [...downloaded].filter(([, d]) => !d.ok).map(([key, d]) => fail('evidence-download', `${key}: ${d.detail}`));
  return { downloaded, checks };
}

/** Hash all compiled helpers as well as the inspection entry point. */
export function inspectionJobKey(job: InspectJob, imageId: string, distDir = path.join(HARNESS_DIR, 'dist')): string {
  const harness = treeHash(distDir, (rel) => rel.endsWith('.js'));
  if (isUnavailable(harness)) throw new Error(harness.unavailable);
  return sha256(JSON.stringify({ job, image: imageId, harness: harness.sha256 }));
}

export async function verify(opts: VerifyOptions): Promise<number> {
  assertRunId(opts.runId);
  const runDir = path.join(opts.runsDir, opts.runId);
  const downloadDir = path.join(runDir, 'downloaded');
  const baselineCache = path.join(opts.runsDir, '.baseline-cache');
  fs.mkdirSync(downloadDir, { recursive: true });
  fs.mkdirSync(baselineCache, { recursive: true });
  const runChecks: Check[] = [];
  const prefix = runPrefix(opts.runId);
  const config = loadStorageConfig(opts.envFile);
  const storage = new Storage(config.r2, opts.downloadTimeoutMs);

  // ------------------------------------------------------------ manifest and downloads
  const manifestFile = path.join(downloadDir, MANIFEST_NAME);
  if (!fs.existsSync(manifestFile)) {
    console.log(`downloading ${prefix}${MANIFEST_NAME} from ${storage.bucket}`);
    try {
      fs.writeFileSync(manifestFile, await storage.get(`${prefix}${MANIFEST_NAME}`, opts.downloadTimeoutMs));
    } catch (error) {
      console.error(`Could not download the run manifest: ${errorMessage(error)}\nIs the harness env file pointing at the bucket render used?`);
      return EXIT_CODE.fail;
    }
  }
  const manifest = readJson<RunManifest>(manifestFile);
  if (manifest.runId !== opts.runId) throw new Error(`manifest is for run ${manifest.runId}`);
  runChecks.push(
    READABLE_MANIFEST_VERSIONS.includes(manifest.manifestVersion)
      ? pass('manifest', `version ${manifest.manifestVersion}`)
      : fail('manifest', `version ${manifest.manifestVersion}, this harness reads ${READABLE_MANIFEST_VERSIONS.join(', ')} (writes ${MANIFEST_VERSION})`),
  );
  runChecks.push(
    manifest.storage.bucket === storage.bucket ? pass('bucket', `${storage.bucket}, ${manifest.storage.source}`) : fail('bucket', `render used ${manifest.storage.bucket}, verify is configured for ${storage.bucket}`),
  );

  const { downloaded, checks: downloadChecks } = await downloadObjects(storage, manifest.objects, opts.runId, downloadDir, opts.downloadTimeoutMs);
  runChecks.push(...downloadChecks);

  // ------------------------------------------------------------ references
  const approvals = loadApprovals();
  const references = new Map<string, Reference>();
  for (const r of manifest.renders) {
    const fixture = ALL_FIXTURES.find((f) => f.id === r.fixtureId);
    const same = fixture ? findBaseline(approvals, fixture.id, fixture.hash, r.browser) : null;
    const chrome = fixture && r.browser !== 'chrome' ? findBaseline(approvals, fixture.id, fixture.hash, 'chrome') : null;
    const inRunChrome = r.browser !== 'chrome' ? manifest.renders.find((x) => x.fixtureId === r.fixtureId && x.browser === 'chrome' && x.sha256) : undefined;
    const baseline = same ?? chrome;
    references.set(
      `${r.fixtureId}.${r.browser}`,
      baseline ? { kind: 'approved', baseline, crossBrowser: baseline.browser !== r.browser } : inRunChrome ? { kind: 'in-run-chrome', sha256: inRunChrome.sha256! } : { kind: 'none' },
    );
  }
  const referenceFile = async (ref: Reference, record: RenderRecord): Promise<string | null> => {
    if (ref.kind === 'in-run-chrome') return downloaded.get(manifest.renders.find((x) => x.fixtureId === record.fixtureId && x.browser === 'chrome')!.key)?.file ?? null;
    if (ref.kind !== 'approved') return null;
    const file = path.join(baselineCache, `${ref.baseline.pdfSha256}.pdf`);
    if (!fs.existsSync(file) || sha256File(file) !== ref.baseline.pdfSha256) {
      try {
        fs.writeFileSync(file, await storage.get(ref.baseline.key, opts.downloadTimeoutMs));
      } catch (error) {
        console.log(`could not download baseline ${ref.baseline.key}: ${errorMessage(error)}`);
        return null;
      }
    }
    return sha256File(file) === ref.baseline.pdfSha256 ? file : null;
  };

  // ------------------------------------------------------------ inspection in the pinned image
  let image: ComparisonImage | null = null;
  let tools: ToolVersions | null = null;
  const inspections = new Map<string, Inspection>();
  const inspectDir = path.join(runDir, 'inspect');
  const items: InspectItem[] = [];
  for (const r of manifest.renders) {
    const d = downloaded.get(r.key);
    if (r.status !== 'ok' || !d?.ok) continue;
    const id = `${r.fixtureId}.${r.browser}`;
    const ref = await referenceFile(references.get(id)!, r);
    const fixture = ALL_FIXTURES.find((f) => f.id === r.fixtureId);
    items.push({
      id,
      pdf: containerPath(runDir, d.file),
      reference: ref ? (ref.startsWith(baselineCache) ? `/baselines/${path.basename(ref)}` : containerPath(runDir, ref)) : null,
      colorWords: fixture?.expect.colorSamples?.map((s) => s.word) ?? [],
      outDir: `/work/inspect/${id}`,
    });
  }
  try {
    image = comparisonImage(opts.platform);
    runChecks.push(pass('comparison-image', `${image.tag} ${image.imageId.slice(0, 19)} (${image.platform}), base ${image.baseImage.split('@')[1]?.slice(0, 19) ?? image.baseImage}`));
    const job: InspectJob = { items };
    const jobFile = path.join(inspectDir, 'job.json');
    const jobKey = inspectionJobKey(job, image.imageId);
    const stampFile = path.join(inspectDir, 'job.sha256');
    const fresh = !opts.reinspect && fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === jobKey && items.every((i) => fs.existsSync(path.join(inspectDir, i.id, 'inspection.json')));
    if (!fresh) {
      fs.rmSync(inspectDir, { recursive: true, force: true });
      writeJson(jobFile, job);
      console.log(`inspecting ${items.length} PDF(s) in ${image.tag}`);
      const run = spawnSync(
        'docker',
        [
          'run', '--rm', '--network', 'none', '--platform', image.platform,
          '-v', `${runDir}:/work`,
          '-v', `${baselineCache}:/baselines:ro`,
          '-v', `${path.join(HARNESS_DIR, 'dist')}:/harness:ro`,
          image.tag, 'node', '/harness/inspect.js', '/work/inspect/job.json',
        ],
        { stdio: 'inherit' },
      );
      if (run.status !== 0) throw new Error(`inspection container exited ${String(run.status)}`);
      fs.writeFileSync(stampFile, jobKey);
    }
    tools = readJson<ToolVersions>(path.join(inspectDir, 'tools.json'));
    for (const i of items) inspections.set(i.id, readJson<Inspection>(path.join(inspectDir, i.id, 'inspection.json')));
    runChecks.push(pass('comparison-tools', `Poppler ${tools.poppler} (${tools.popplerPackage}), ${tools.os}, node ${tools.node}`));
  } catch (error) {
    runChecks.push(fail('comparison-image', errorMessage(error)));
  }

  // ------------------------------------------------------------ evaluation
  const llm = loadReview(path.join(runDir, 'llm-review.json'), opts.runId, CHECKLIST_FILE);
  const results = manifest.renders.map((record) =>
    evaluateItem({
      fixture: ALL_FIXTURES.find((f) => f.id === record.fixtureId) ?? null,
      record,
      downloaded: downloaded.get(record.key) ?? { ok: false, detail: record.status === 'ok' ? 'not in the manifest objects' : 'not rendered' },
      inspection: inspections.get(`${record.fixtureId}.${record.browser}`) ?? null,
      reference: references.get(`${record.fixtureId}.${record.browser}`)!,
      approvals,
      llm,
      runId: opts.runId,
    }),
  );
  runChecks.push(...runLevelChecks(manifest, llm));

  // ------------------------------------------------------------ memory and failure scenarios
  const evidence = <T>(kind: RemoteObject['kind']): T | null => {
    const object = manifest.objects.find((o) => o.kind === kind);
    const d = object ? downloaded.get(object.key) : undefined;
    return d?.ok ? readJson<T>(d.file) : null;
  };
  const memory = memoryChecks(manifest, evidence<MeasurementsFile>('measurements'), approvals);
  runChecks.push(...memory.checks);
  const scenarios = evidence<FailureScenariosFile>('failure-scenarios');
  runChecks.push(...scenarioChecks(manifest, scenarios));

  // ------------------------------------------------------------ remote cleanup
  const cleanupResult = await cleanupVerifiedRun(storage, {
    runId: opts.runId,
    runDir,
    keepRemote: opts.keepRemote,
    manifest,
    downloadedKeys: new Set([...downloaded].filter(([, d]) => d.ok).map(([key]) => key)),
  });
  if ('skipped' in cleanupResult) runChecks.push(pass('remote-cleanup', `skipped: ${cleanupResult.skipped}`));
  else if (cleanupResult.errors.length || cleanupResult.unlisted.length) {
    runChecks.push(fail('remote-cleanup', [...cleanupResult.errors, ...cleanupResult.unlisted.map((k) => `not listed, not deleted: ${k}`)].join('; ')));
  } else runChecks.push(pass('remote-cleanup', `deleted ${cleanupResult.deleted.length} listed object(s)`));

  const status = worstStatus([...runChecks, ...results].map((c) => c.status));
  const counts = { pass: 0, fail: 0, 'needs-review': 0 } as Record<Status, number>;
  for (const r of results) counts[r.status]++;
  const approvalsFile = path.join(HARNESS_DIR, 'baselines', 'approvals.json');
  const out: VerifyResults = {
    runId: opts.runId,
    status,
    verifiedAt: new Date().toISOString(),
    verifier: { revision: gitRevision(REPO_DIR), node: process.version },
    image,
    tools,
    approvalsSha256: fs.existsSync(approvalsFile) ? sha256File(approvalsFile) : null,
    llmReview: llm.state,
    runChecks,
    items: results,
    memory: memory.groups,
    failureScenarios: manifest.failureScenarios ? (scenarios?.results ?? null) : null,
    cleanup: cleanupResult,
    counts,
  };
  writeJson(path.join(runDir, 'results.json'), out);
  writeLlmRequest(runDir, manifest, results, inspections);
  writeSummary(runDir, manifest, out, inspections);
  console.log(`\n${status.toUpperCase()}: ${counts.pass} pass, ${counts['needs-review']} needs-review, ${counts.fail} fail (${results.length} render(s))`);
  for (const c of runChecks.filter((x) => x.status !== 'pass')) console.log(`  run ${c.status}: ${c.id}: ${c.detail}`);
  console.log(`summary: ${path.join(runDir, 'summary.md')}`);
  return EXIT_CODE[status];
}

const pass = (id: string, detail: string): Check => ({ id, status: 'pass', detail });
const fail = (id: string, detail: string): Check => ({ id, status: 'fail', detail });
const review = (id: string, detail: string): Check => ({ id, status: 'needs-review', detail });

export function runLevelChecks(manifest: RunManifest, llm: LoadedReview): Check[] {
  const checks: Check[] = [];
  checks.push(manifest.status === 'ok' ? pass('render-run', 'render finished ok') : fail('render-run', `render ${manifest.status}: ${manifest.failures.join('; ') || 'no reason recorded'}`));

  const missing = manifest.fixtures.flatMap((f) => manifest.browsers.filter((b) => !manifest.renders.some((r) => r.fixtureId === f.id && r.browser === b)).map((b) => `${f.id}.${b}`));
  checks.push(missing.length === 0 ? pass('renders-complete', `${manifest.renders.length} render(s) for ${manifest.fixtures.length} fixture(s)`) : fail('renders-complete', `not rendered: ${missing.join(', ')}`));

  const covered = jobTypesCovered(ALL_FIXTURES.filter((f) => manifest.fixtures.some((m) => m.id === f.id)));
  const uncovered = PDF_JOB_TYPES.filter((t) => !covered.has(t));
  if (manifest.fixtureFilter) checks.push(review('coverage', `run limited to --fixtures ${manifest.fixtureFilter.join(',')}`));
  else checks.push(uncovered.length === 0 ? pass('coverage', `all ${PDF_JOB_TYPES.length} PDF job types`) : fail('coverage', `job types without a fixture: ${uncovered.join(', ')}`));

  checks.push(
    manifest.harness.fixtureManifestVersion === FIXTURE_MANIFEST_VERSION
      ? pass('fixture-manifest', `v${FIXTURE_MANIFEST_VERSION}`)
      : fail('fixture-manifest', `render used v${manifest.harness.fixtureManifestVersion}, verify has v${FIXTURE_MANIFEST_VERSION}`),
  );

  const rev = manifest.deployed.revision;
  if (isUnavailable(rev)) checks.push(review('deployed-revision', rev.unavailable));
  else {
    const dirty = rev.dirty.filter((l) => !l.includes('pdf-validation/'));
    checks.push(dirty.length === 0 ? pass('deployed-revision', `${rev.commit.slice(0, 12)} (${rev.branch}), clean`) : review('deployed-revision', `${rev.commit.slice(0, 12)} with local changes: ${dirty.slice(0, 5).join('; ')}`));
  }
  // Same fixtures are enforced by fixture hashes; this catches other harness edits on the box (callShapes, worker).
  const boxHarness = manifest.harness.srcTree;
  const here = treeHash(path.join(HARNESS_DIR, 'src'));
  const boxDirty = isUnavailable(manifest.harness.revision) ? [] : manifest.harness.revision.dirty.filter((l) => l.includes('pdf-validation/src'));
  if (isUnavailable(boxHarness) || isUnavailable(here)) checks.push(review('harness-revision', 'harness source hash unavailable'));
  else if (boxHarness.sha256 !== here.sha256 || boxDirty.length) {
    checks.push(review('harness-revision', `box harness src ${boxHarness.sha256.slice(0, 12)}${boxDirty.length ? ` (local edits: ${boxDirty.join('; ')})` : ''}, verify harness ${here.sha256.slice(0, 12)}`));
  } else checks.push(pass('harness-revision', `same harness source on both machines (${here.sha256.slice(0, 12)})`));
  const newer = manifest.deployed.build.sourcesNewerThanDist;
  checks.push(newer.length === 0 ? pass('deployed-build', `dist built ${manifest.deployed.build.distBuiltAt}`) : review('deployed-build', `dist may not match the checkout: ${newer.length} source file(s) are newer (${newer.slice(0, 3).join(', ')})`));

  const before = manifest.service.before;
  const after = manifest.service.after;
  if (isUnavailable(before) || !after || isUnavailable(after)) {
    checks.push(review('service-restarts', `unavailable: ${isUnavailable(before) ? before.unavailable : after && isUnavailable(after) ? after.unavailable : 'not recorded'}`));
  } else {
    const restarted = after.restarts > before.restarts || after.pid !== before.pid;
    checks.push(restarted ? review('service-restarts', `report-server restarted during the run (restarts ${before.restarts} -> ${after.restarts}, pid ${before.pid} -> ${after.pid})`) : pass('service-restarts', `no restarts; ${after.status}`));
  }
  const oom = manifest.service.oomEvents;
  if (!oom || isUnavailable(oom)) checks.push(review('oom-events', `unavailable: ${oom ? oom.unavailable : 'not recorded'}`));
  else checks.push(oom.lines.length ? review('oom-events', `${oom.lines.length} OOM line(s) from ${oom.source}: ${oom.lines.slice(0, 2).join(' | ')}`) : pass('oom-events', `none (${oom.source})`));
  const health = manifest.service.healthAfter;
  if (!health || isUnavailable(health)) checks.push(review('service-health', `unavailable: ${health ? health.unavailable : 'not recorded'}`));

  if (llm.state === 'missing') checks.push(review('llm-review', 'llm-review.json missing: run the LLM pass (see llm-review-request.md), then verify again'));
  else if (llm.state === 'invalid') checks.push(fail('llm-review', llm.error));
  else if (!llm.checklistCurrent) checks.push(review('llm-review', 'llm-review.json was made with a different checklist version; review again'));
  else checks.push(pass('llm-review', `by ${llm.review.reviewer} at ${llm.review.reviewedAt}`));

  return checks;
}
