/**
 * `render` (on the box): renders fixtures through the deployed code in isolated workers, uploads
 * each PDF to R2 under pdf-validation/<run-id>/, checks what needs no extra tooling, and uploads
 * a run manifest for `verify`. Exit 0 means "ready to verify", not validated; 1 is a failure.
 */
import { fork, type ChildProcess } from 'child_process';
import { parse } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { deployedPuppeteer, resolveBrowser, type ResolvedBrowser } from './browsers';
import {
  BROWSERS,
  DEFAULT_TIMEOUTS,
  HARNESS_DIR,
  MANIFEST_NAME,
  SERVER_DIR,
  assertKeyInRun,
  errorMessage,
  newRunId,
  runPrefix,
  sha256,
  writeJson,
  type BrowserName,
} from './common';
import { CssServer } from './cssServer';
import {
  ServiceLog,
  deployedBuild,
  foreignChrome,
  gitRevision,
  httpOk,
  instanceResources,
  isUnavailable,
  oomEvents,
  processesInGroup,
  serviceState,
  treeHash,
} from './diagnostics';
import { ALL_FIXTURES, FIXTURE_MANIFEST_VERSION, fixturesFor, type ManifestFixture } from './fixtures';
import { MANIFEST_VERSION, type RemoteObject, type RenderRecord, type RunManifest } from './manifest';
import { Storage, loadStorageConfig } from './storage';
import type { WorkerJob, WorkerMessage } from './worker';

export type RenderOptions = {
  mode: 'quick' | 'full';
  browser: BrowserName | 'both';
  runsDir: string;
  envFile: string;
  deployedDistDir: string;
  caseTimeoutMs: number;
  invocationTimeoutMs: number;
  overridden: string[];
  fixtures: string[] | null;
  allowInstall: boolean;
  runId?: string;
};

/** A dead database URL for the worker: the PDF paths never query, and nothing can by accident. */
const NO_DATABASE_URL = 'postgresql://pdf-validation-no-database.invalid:1/none';

class Logger {
  constructor(private readonly file: string) {}
  line(text: string) {
    const stamped = `${new Date().toISOString()} ${text}`;
    fs.appendFileSync(this.file, `${stamped}\n`);
    process.stdout.write(`${stamped}\n`);
  }
}

/** For `--browser both`, alternates which browser goes first from one fixture to the next. */
export function renderPlan(fixtures: ManifestFixture[], browser: BrowserName | 'both'): { fixture: ManifestFixture; browser: BrowserName; orderInPair: number }[] {
  return fixtures.flatMap((fixture, i) => {
    const order: BrowserName[] = browser === 'both' ? (i % 2 === 0 ? [...BROWSERS] : [...BROWSERS].reverse()) : [browser];
    return order.map((b, orderInPair) => ({ fixture, browser: b, orderInPair }));
  });
}

/** Box-side PDF checks: no Poppler, just bytes. */
export function boxChecks(pdf: Buffer): { id: string; ok: boolean; detail: string }[] {
  const tail = pdf.subarray(Math.max(0, pdf.length - 1024)).toString('latin1').trimEnd();
  return [
    { id: 'nonempty', ok: pdf.length > 0, detail: `${pdf.length} bytes` },
    { id: 'pdf-header', ok: pdf.subarray(0, 5).toString('latin1') === '%PDF-', detail: JSON.stringify(pdf.subarray(0, 8).toString('latin1')) },
    { id: 'pdf-eof', ok: tail.endsWith('%%EOF'), detail: JSON.stringify(tail.slice(-12)) },
  ];
}

export async function render(opts: RenderOptions): Promise<number> {
  const runId = opts.runId ?? newRunId();
  const runDir = path.join(opts.runsDir, runId);
  fs.mkdirSync(runDir, { recursive: true });
  const log = new Logger(path.join(runDir, 'render.log'));
  const journalFile = path.join(runDir, 'remote-keys.jsonl');
  const prefix = runPrefix(runId);
  const journal = (key: string) => {
    assertKeyInRun(key, runId);
    fs.appendFileSync(journalFile, `${JSON.stringify({ key, at: new Date().toISOString() })}\n`);
  };
  log.line(`run ${runId}: render ${opts.mode}, browser ${opts.browser}; evidence in ${runDir}`);

  const selected = (opts.fixtures ? ALL_FIXTURES.filter((f) => opts.fixtures!.includes(f.id)) : fixturesFor(opts.mode));
  const missing = (opts.fixtures ?? []).filter((id) => !ALL_FIXTURES.some((f) => f.id === id));
  const startedAt = new Date();
  const serviceBefore = serviceState();
  const outLog = isUnavailable(serviceBefore) ? null : serviceBefore.outLogPath;
  const serviceLog = new ServiceLog(outLog); // per render
  const runServiceLog = new ServiceLog(outLog); // the whole run
  const build = deployedBuild(opts.deployedDistDir);

  const manifest: RunManifest = {
    manifestVersion: MANIFEST_VERSION,
    runId,
    mode: opts.mode,
    browsers: opts.browser === 'both' ? [...BROWSERS] : [opts.browser],
    fixtureFilter: opts.fixtures,
    status: 'running',
    failures: [],
    startedAt: startedAt.toISOString(),
    timeouts: { caseMs: opts.caseTimeoutMs, invocationMs: opts.invocationTimeoutMs, overridden: opts.overridden },
    storage: { bucket: '', prefix, source: 'test-bucket' },
    harness: {
      revision: gitRevision(),
      srcTree: treeHash(path.join(HARNESS_DIR, 'src')),
      distTree: treeHash(path.join(HARNESS_DIR, 'dist'), (rel) => rel.endsWith('.js')),
      fixtureManifestVersion: FIXTURE_MANIFEST_VERSION,
    },
    deployed: { revision: gitRevision(), build },
    versions: { node: process.version, puppeteer: '', puppeteerCore: '', puppeteerBrowsers: '', pinnedBuilds: {} },
    browsersResolved: [],
    instance: instanceResources(),
    css: { port: 0, sha256: '', unchangedAtEnd: null },
    service: { before: serviceBefore, after: null, healthAfter: null, oomEvents: null, activityDuringRun: null },
    fixtures: selected.map((f) => ({ id: f.id, hash: f.hash, family: f.family, jobType: f.input.jobType, tier: f.tier })),
    renders: [],
    objects: [],
  };
  const save = () => writeJson(path.join(runDir, MANIFEST_NAME), manifest);
  const fail = (reason: string) => {
    manifest.failures.push(reason);
    log.line(`FAIL: ${reason}`);
  };

  // ------------------------------------------------------------ interruption and timeouts
  let current: { child: ChildProcess; chromePgid: number | null } | null = null;
  // An object, so TypeScript doesn't narrow it to null across the async calls that set it.
  const halt: { reason: string | null } = { reason: null };
  const killCurrent = () => {
    if (!current) return;
    // Only processes this run created: its worker and the Chrome group that worker launched.
    if (current.chromePgid) killGroup(current.chromePgid);
    current.child.kill('SIGKILL');
  };
  const stop = (reason: string) => {
    if (halt.reason) {
      killCurrent();
      process.exit(1);
    }
    halt.reason = reason;
    log.line(`stopping: ${reason}`);
    killCurrent();
  };
  const onSigint = () => stop('SIGINT');
  const onSigterm = () => stop('SIGTERM');
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
  const invocationTimer = setTimeout(() => stop(`invocation timeout after ${opts.invocationTimeoutMs} ms`), opts.invocationTimeoutMs);

  let storage: Storage | null = null;
  let cssServer: CssServer | null = null;
  const browsers: ResolvedBrowser[] = [];
  // Set once preflight knows the CSS port and storage config. Built from scratch, not from
  // process.env, so the operator shell's variables (database URLs and the like) don't leak in.
  let workerEnv: NodeJS.ProcessEnv = {};

  // ------------------------------------------------------------ helpers (closures over the run)

  async function renderOne(step: { fixture: ManifestFixture; browser: BrowserName; orderInPair: number }, resolved: ResolvedBrowser): Promise<RenderRecord> {
    const key = `${prefix}pdf/${step.browser}/${step.fixture.id}.pdf`;
    journal(key);
    const foreignBefore = foreignChrome(new Set());
    serviceLog.activitySince();
    const record: RenderRecord = {
      fixtureId: step.fixture.id,
      fixtureHash: step.fixture.hash,
      family: step.fixture.family,
      jobType: step.fixture.input.jobType,
      browser: step.browser,
      orderInPair: step.orderInPair,
      key,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      status: 'ok',
      checks: [],
      cssRequests: [],
      interference: { serviceActivity: {}, foreignChrome: [] },
      leftoverProcesses: [],
    };
    const t0 = Date.now();
    const job: WorkerJob = {
      fixtureId: step.fixture.id,
      deployedDistDir: opts.deployedDistDir,
      key,
      headless: resolved.headless,
      executablePath: resolved.executablePath,
    };
    const outcome = await runWorker(job, record, (child, pgid) => {
      current = { child, chromePgid: pgid };
    });
    current = null;
    record.durationMs = Date.now() - t0;
    record.checks.push({ id: 'completed', ok: outcome.ok, detail: outcome.detail });
    if (!outcome.ok) record.error = outcome.detail;

    record.cssRequests = cssServer!.between(t0, Date.now());
    const cssOk = record.cssRequests.some((r) => r.path === '/tailwind.css' && r.status === 200);
    record.checks.push({ id: 'stylesheet-loaded', ok: cssOk, detail: `${record.cssRequests.length} request(s) to the harness CSS endpoint` });

    // Chrome runs as its own process group; anything left in it after the worker exits is ours.
    if (record.chromePid) {
      await new Promise((r) => setTimeout(r, 300));
      record.leftoverProcesses = processesInGroup(record.chromePid);
      if (record.leftoverProcesses.length) killGroup(record.chromePid);
    }
    record.checks.push({ id: 'no-leftover-chrome', ok: record.leftoverProcesses.length === 0, detail: `${record.leftoverProcesses.length} process(es) left in Chrome's group` });

    record.interference = {
      serviceActivity: serviceLog.activitySince(),
      foreignChrome: [...foreignBefore, ...foreignChrome(new Set(record.chromePid ? [record.chromePid] : []))].filter(
        (p, i, all) => all.findIndex((q) => q.pid === p.pid) === i,
      ),
    };

    if (outcome.ok && storage) {
      try {
        const pdf = await storage.get(key, opts.caseTimeoutMs);
        record.bytes = pdf.length;
        record.sha256 = sha256(pdf);
        for (const c of boxChecks(pdf)) record.checks.push(c);
        manifest.objects.push({ key, kind: 'pdf', bytes: pdf.length, sha256: record.sha256 });
      } catch (error) {
        record.checks.push({ id: 'downloaded', ok: false, detail: errorMessage(error) });
      }
    }
    record.status = record.checks.every((c) => c.ok) ? 'ok' : 'failed';
    log.line(`  ${record.status} in ${record.durationMs} ms${record.bytes ? `, ${record.bytes} bytes` : ''}${record.error ? `: ${record.error.split('\n')[0]}` : ''}`);
    return record;
  }

  function runWorker(job: WorkerJob, record: RenderRecord, track: (child: ChildProcess, chromePgid: number | null) => void): Promise<{ ok: boolean; detail: string }> {
    return new Promise((resolve) => {
      const child = fork(path.join(__dirname, 'worker.js'), [], {
        cwd: runDir, // dotenv in dist/s3Utils finds no .env here; the worker's env is all it gets
        env: workerEnv,
        execArgv: [],
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      track(child, null);
      const prefixLines = (chunk: Buffer) =>
        chunk
          .toString('utf8')
          .split('\n')
          .filter(Boolean)
          .forEach((l) => log.line(`  worker: ${l}`));
      child.stdout?.on('data', prefixLines);
      child.stderr?.on('data', prefixLines);
      let done: { ok: boolean; detail: string } | null = null;
      child.on('message', (m: WorkerMessage) => {
        if (m.type === 'launch') record.launch = { requested: m.requested, effective: m.effective };
        if (m.type === 'launched') {
          record.chromePid = m.pid;
          record.browserVersion = m.browserVersion;
          track(child, m.pid);
        }
        if (m.type === 'html') record.htmlBytes = m.bytes;
        if (m.type === 'done') done = m.ok ? { ok: true, detail: `rendered and uploaded in ${m.renderMs} ms` } : { ok: false, detail: m.error };
      });
      const timer = setTimeout(() => {
        done = { ok: false, detail: `timeout after ${opts.caseTimeoutMs} ms` };
        if (record.chromePid) killGroup(record.chromePid);
        child.kill('SIGKILL');
      }, opts.caseTimeoutMs);
      child.on('exit', (code, signal) => {
        clearTimeout(timer);
        if (halt.reason && !done) done = { ok: false, detail: `stopped: ${halt.reason}` };
        resolve(done ?? { ok: false, detail: `worker exited (${signal ?? code}) without a result` });
      });
      child.send(job);
    });
  }

  async function finishDiagnostics() {
    try {
      manifest.service.activityDuringRun = runServiceLog.activitySince();
      manifest.service.after = serviceState();
      manifest.service.oomEvents = oomEvents(startedAt);
      const servicePort = readServicePort();
      manifest.service.healthAfter = await httpOk(`http://127.0.0.1:${servicePort}/tailwind.css`);
      const after = manifest.service.after;
      if (!isUnavailable(after) && after.status !== 'online') fail(`service is ${after.status} after the run`);
      if (!isUnavailable(manifest.service.healthAfter) && manifest.service.healthAfter.status !== 200) {
        fail(`service health check returned ${manifest.service.healthAfter.status}`);
      }
    } catch (error) {
      log.line(`diagnostics error: ${errorMessage(error)}`);
    }
  }

  async function uploadEvidence(store: Storage) {
    try {
      const logKey = `${prefix}render.log`;
      journal(logKey);
      const logBody = fs.readFileSync(path.join(runDir, 'render.log'));
      await store.put(logKey, logBody, 'text/plain');
      manifest.objects.push({ key: logKey, kind: 'log', bytes: logBody.length, sha256: sha256(logBody) } satisfies RemoteObject);
      const manifestKey = `${prefix}${MANIFEST_NAME}`;
      journal(manifestKey);
      save();
      await store.put(manifestKey, fs.readFileSync(path.join(runDir, MANIFEST_NAME)), 'application/json');
      log.line(`uploaded ${manifest.objects.length} object(s) and the manifest to ${prefix}`);
    } catch (error) {
      log.line(`could not upload the manifest: ${errorMessage(error)}; clean up with: pdf-validation cleanup --run-id ${runId}`);
      if (manifest.status === 'ok') manifest.status = 'failed';
      manifest.failures.push(`manifest upload: ${errorMessage(error)}`);
      save();
    }
  }

  try {
    // ---------------------------------------------------------- preflight
    if (missing.length) fail(`preflight: unknown fixture(s) ${missing.join(', ')}`);
    const config = loadStorageConfig(opts.envFile);
    manifest.storage = { bucket: config.r2.R2_BUCKET_NAME, prefix, source: config.source };
    log.line(`storage: bucket ${config.r2.R2_BUCKET_NAME} (${config.source}), prefix ${prefix}`);
    storage = new Storage(config.r2);

    for (const mod of ['utils.js', 'committeeMappingHelpers.js', 'committeeRosterConfig.js', 'signInSheetHelpers.js']) {
      if (!fs.existsSync(path.join(opts.deployedDistDir, mod))) fail(`preflight: deployed ${mod} missing from ${opts.deployedDistDir}`);
    }
    if (isUnavailable(build.css)) fail(`preflight: ${build.css.unavailable}`);
    if (build.sourcesNewerThanDist.length) log.line(`warning: ${build.sourcesNewerThanDist.length} source file(s) newer than dist; dist may not match the checkout`);

    const pptr = deployedPuppeteer(opts.deployedDistDir);
    manifest.versions = {
      node: process.version,
      puppeteer: pptr.puppeteerVersion,
      puppeteerCore: pptr.puppeteerCoreVersion,
      puppeteerBrowsers: pptr.browsersVersion,
      pinnedBuilds: { chrome: pptr.revisions.chrome ?? '', 'chrome-headless-shell': pptr.revisions['chrome-headless-shell'] ?? '' },
    };
    const harnessCacheDir = path.join(opts.runsDir, 'browsers');
    for (const b of manifest.browsers) {
      try {
        const resolved = resolveBrowser(b, { deployedDistDir: opts.deployedDistDir, harnessCacheDir, allowInstall: opts.allowInstall, log: (l) => log.line(l) });
        browsers.push(resolved);
        log.line(`browser ${b}: ${resolved.product}@${resolved.buildId} at ${resolved.executablePath}${resolved.harnessInstalled ? ' (harness cache)' : ''}`);
      } catch (error) {
        fail(`preflight: browser ${b}: ${errorMessage(error)}`);
      }
    }
    manifest.browsersResolved = browsers;

    await storageProbe(storage, prefix, journal, opts.caseTimeoutMs).catch((error: unknown) => fail(`preflight: storage permissions: ${errorMessage(error)}`));
    save();
    if (manifest.failures.length) throw new PreflightFailed();

    // ---------------------------------------------------------- renders
    const cssBody = fs.readFileSync(path.join(SERVER_DIR, 'public', 'tailwind.css'));
    cssServer = new CssServer(cssBody);
    manifest.css = { port: await cssServer.start(), sha256: sha256(cssBody), unchangedAtEnd: null };
    log.line(`serving deployed tailwind.css (${manifest.css.sha256.slice(0, 12)}) on port ${manifest.css.port}`);

    workerEnv = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TZ: 'UTC',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      NODE_ENV: 'production',
      PORT: String(manifest.css.port),
      PUPPETEER_CACHE_DIR: harnessCacheDir,
      POSTGRES_PRISMA_URL: NO_DATABASE_URL,
      ...config.r2,
    };
    const plan = renderPlan(selected, opts.browser);
    for (const [i, step] of plan.entries()) {
      if (halt.reason) break;
      const resolved = browsers.find((b) => b.browser === step.browser)!;
      log.line(`[${i + 1}/${plan.length}] ${step.fixture.id} with ${step.browser}`);
      const record = await renderOne(step, resolved);
      manifest.renders.push(record);
      if (record.status === 'failed') fail(`render ${step.fixture.id}/${step.browser}: ${record.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`).join('; ')}`);
      save();
    }
  } catch (error) {
    if (!(error instanceof PreflightFailed)) fail(`harness error: ${errorMessage(error)}`);
  } finally {
    clearTimeout(invocationTimer);
    if (halt.reason) fail(`stopped: ${halt.reason}`);
    await cssServer?.stop();
    if (manifest.css.sha256) {
      const now = sha256(fs.readFileSync(path.join(SERVER_DIR, 'public', 'tailwind.css')));
      manifest.css.unchangedAtEnd = now === manifest.css.sha256;
      if (!manifest.css.unchangedAtEnd) fail('deployed tailwind.css changed during the run');
    }
    await finishDiagnostics();
    manifest.status = halt.reason && halt.reason.startsWith('SIG') ? 'interrupted' : manifest.failures.length ? 'failed' : 'ok';
    manifest.finishedAt = new Date().toISOString();
    save();
    if (storage) await uploadEvidence(storage);
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  }

  log.line(`render ${manifest.status}: ${manifest.renders.filter((r) => r.status === 'ok').length}/${manifest.renders.length} renders ok${manifest.failures.length ? `; ${manifest.failures.length} failure(s)` : ''}`);
  log.line(manifest.status === 'ok' ? `next, on the operator machine: pdf-validation verify --run-id ${runId}` : `evidence kept in ${runDir}; remote objects: pdf-validation cleanup --run-id ${runId}`);
  return manifest.status === 'ok' ? 0 : 1;
}

class PreflightFailed extends Error {}

function killGroup(pgid: number) {
  try {
    process.kill(-pgid, 'SIGKILL');
  } catch {
    // already gone
  }
}

function readServicePort(): number {
  const envFile = path.join(SERVER_DIR, '.env');
  const port = fs.existsSync(envFile) ? parse(fs.readFileSync(envFile)).PORT : undefined;
  return Number.parseInt(port ?? '8080', 10);
}

/** Put, get, list and delete one probe object: the permissions verify and cleanup need. */
async function storageProbe(store: Storage, prefix: string, journal: (key: string) => void, timeoutMs: number) {
  const key = `${prefix}preflight-probe.txt`;
  journal(key);
  const body = `pdf-validation probe ${new Date().toISOString()}`;
  await store.put(key, body, 'text/plain');
  if ((await store.get(key, timeoutMs)).toString('utf8') !== body) throw new Error('read back a different probe body');
  if (!(await store.exists(key))) throw new Error('ListObjectsV2 does not show the probe');
  await store.delete(key);
  if (await store.exists(key)) throw new Error('DeleteObject did not remove the probe');
}

export const DEFAULT_RENDER_TIMEOUTS = DEFAULT_TIMEOUTS;
