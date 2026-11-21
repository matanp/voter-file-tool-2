/**
 * `render` (on the box): renders fixtures through the deployed code in isolated workers, uploads
 * each PDF to R2 under pdf-validation/<run-id>/, checks what needs no extra tooling, and uploads
 * a run manifest for `verify`. Exit 0 means "ready to verify", not validated; 1 is a failure.
 *
 * `--measured` (ticket 20) renders the measured fixtures several times per browser with RSS
 * sampling and writes measurements.json; `--failure-scenarios` runs scenarios.ts and writes
 * failure-scenarios.json. Both upload with the PDFs. Memory is judged in `verify`, never here.
 */
import { fork, type ChildProcess } from 'child_process';
import { parse } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';
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
  brief,
  processesInGroup,
  processesMentioning,
  serviceState,
  treeHash,
} from './diagnostics';
import { ALL_FIXTURES, FIXTURE_MANIFEST_VERSION, fixturesFor, type ManifestFixture } from './fixtures';
import { MANIFEST_VERSION, type RemoteObject, type RenderRecord, type RunManifest } from './manifest';
import {
  APPROXIMATE_NOTE,
  FAILURE_SCENARIOS_NAME,
  MEASUREMENTS_NAME,
  MEASURED_FIXTURES,
  SAMPLES_NAME,
  interferenceReasons,
  type MeasuredRender,
  type MeasurementsFile,
} from './measurements';
import { MemorySampler } from './memory';
import { SCENARIOS, SCENARIO_FIXTURE, SCENARIO_NAMES, type FailureScenariosFile, type ScenarioName, type ScenarioResult } from './scenarios';
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
  /** `--measured`: repeated renders with RSS sampling. */
  measured?: { repetitions: number; intervalMs: number; idleMs: number } | null;
  /** `--failure-scenarios`. */
  failureScenarios?: { timeoutMs: number } | null;
  runId?: string;
};

type Step = { fixture: ManifestFixture; browser: BrowserName; orderInPair: number };
type MeasuredStep = Step & { repetition: number };

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

/**
 * `--measured`: every fixture once per browser per repetition. Within a repetition a fixture's
 * browsers run back to back, and which browser goes first alternates between repetitions.
 */
export function measuredPlan(fixtures: ManifestFixture[], browser: BrowserName | 'both', repetitions: number): MeasuredStep[] {
  const steps: MeasuredStep[] = [];
  for (let r = 1; r <= repetitions; r++) {
    const order: BrowserName[] = browser === 'both' ? (r % 2 === 1 ? [...BROWSERS] : [...BROWSERS].reverse()) : [browser];
    for (const fixture of fixtures) order.forEach((b, orderInPair) => steps.push({ fixture, browser: b, orderInPair, repetition: r }));
  }
  return steps;
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
    manifest.attemptedKeys.push(key);
    fs.appendFileSync(journalFile, `${JSON.stringify({ key, at: new Date().toISOString() })}\n`);
  };
  log.line(`run ${runId}: render ${opts.mode}, browser ${opts.browser}; evidence in ${runDir}`);

  const measuredIds: readonly string[] | null = opts.measured ? (opts.fixtures ?? MEASURED_FIXTURES) : null;
  const selected = measuredIds
    ? ALL_FIXTURES.filter((f) => measuredIds.includes(f.id))
    : opts.fixtures
      ? ALL_FIXTURES.filter((f) => opts.fixtures!.includes(f.id))
      : fixturesFor(opts.mode);
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
    measured: opts.measured && measuredIds ? { fixtures: [...measuredIds], ...opts.measured } : null,
    failureScenarios: opts.failureScenarios ? { scenarios: [...SCENARIO_NAMES], timeoutMs: opts.failureScenarios.timeoutMs, fixture: SCENARIO_FIXTURE } : null,
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
    attemptedKeys: [],
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

  const measuredRenders: MeasuredRender[] = [];
  const sampleLines: string[] = [];
  const scenarioResults: ScenarioResult[] = [];
  const servicePid = isUnavailable(serviceBefore) ? null : serviceBefore.pid;

  async function renderOne(
    step: Step,
    resolved: ResolvedBrowser,
    opt: { key?: string; kind?: RemoteObject['kind']; measure?: { intervalMs: number; idleMs: number } } = {},
  ): Promise<{ record: RenderRecord; sampler: MemorySampler | null }> {
    const key = opt.key ?? `${prefix}pdf/${step.browser}/${step.fixture.id}.pdf`;
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
    // Keep TMPDIR short, under /tmp rather than the run directory. Chrome puts its singleton socket
    // under TMPDIR, and a Unix socket path over ~108 bytes makes Chrome exit at launch (code 133,
    // seen on the Lightsail box with the /opt/.../runs/<run-id>/tmp/<case> path).
    const caseTmp = fs.mkdtempSync(path.join('/tmp', `vft-pdf-${step.browser}-`));
    // Measured: an idle baseline with no worker, then sampling from fork to worker exit. The PDF
    // download and hashing below happen after the window closes.
    const sampler = opt.measure ? new MemorySampler({ intervalMs: opt.measure.intervalMs, servicePid, marker: caseTmp }) : null;
    if (sampler && opt.measure) {
      sampler.start('idle');
      await new Promise((r) => setTimeout(r, opt.measure!.idleMs));
      sampler.stop();
      sampler.start('render');
    }
    const workerStart = Date.now();
    const outcome = await runWorker(job, record, caseTmp, (child, pgid) => {
      current = { child, chromePgid: pgid };
      sampler?.setWorker(child.pid);
      sampler?.setChromePgid(pgid);
    });
    sampler?.stop();
    current = null;
    record.durationMs = Date.now() - (sampler ? workerStart : t0);
    record.checks.push({ id: 'completed', ok: outcome.ok, detail: outcome.detail });
    if (!outcome.ok) record.error = outcome.detail;

    record.cssRequests = cssServer!.between(t0, Date.now());
    const cssOk = record.cssRequests.some((r) => r.path === '/tailwind.css' && r.status === 200);
    record.checks.push({ id: 'stylesheet-loaded', ok: cssOk, detail: `${record.cssRequests.length} request(s) to the harness CSS endpoint` });

    // Ours after the worker exits: anything still in Chrome's process group, and anything whose
    // command line mentions this render's TMPDIR (where Puppeteer put Chrome's profile).
    await new Promise((r) => setTimeout(r, 300));
    const leftovers = [...(record.chromePid ? processesInGroup(record.chromePid) : []), ...processesMentioning(caseTmp)].filter(
      (p, i, all) => all.findIndex((q) => q.pid === p.pid) === i,
    );
    for (const p of leftovers) killPid(p.pid);
    record.leftoverProcesses = leftovers.map(brief);
    fs.rmSync(caseTmp, { recursive: true, force: true });
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
        manifest.objects.push({ key, kind: opt.kind ?? 'pdf', bytes: pdf.length, sha256: record.sha256 });
      } catch (error) {
        record.checks.push({ id: 'downloaded', ok: false, detail: errorMessage(error) });
      }
    }
    record.status = record.checks.every((c) => c.ok) ? 'ok' : 'failed';
    log.line(`  ${record.status} in ${record.durationMs} ms${record.bytes ? `, ${record.bytes} bytes` : ''}${record.error ? `: ${record.error.split('\n')[0]}` : ''}`);
    return { record, sampler };
  }

  function forkWorker(caseTmp: string): ChildProcess {
    const child = fork(path.join(__dirname, 'worker.js'), [], {
      cwd: runDir, // dotenv in dist/s3Utils finds no .env here; the worker's env is all it gets
      env: { ...workerEnv, TMPDIR: caseTmp },
      execArgv: [],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const prefixLines = (chunk: Buffer) =>
      chunk
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .forEach((l) => log.line(`  worker: ${l}`));
    child.stdout?.on('data', prefixLines);
    child.stderr?.on('data', prefixLines);
    return child;
  }

  function runWorker(job: WorkerJob, record: RenderRecord, caseTmp: string, track: (child: ChildProcess, chromePgid: number | null) => void): Promise<{ ok: boolean; detail: string }> {
    return new Promise((resolve) => {
      const child = forkWorker(caseTmp);
      track(child, null);
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

  /** One failure scenario in its own worker, then the next report in the same worker. */
  async function runScenario(name: ScenarioName, resolved: ResolvedBrowser, timeoutMs: number): Promise<ScenarioResult> {
    const key = `${prefix}failures/${resolved.browser}/${name}.pdf`;
    const nextKey = `${prefix}failures/${resolved.browser}/${name}-next.pdf`;
    journal(key); // nothing should upload here; journaled in case the injection didn't take
    journal(nextKey);
    const result: ScenarioResult = {
      scenario: name,
      browser: resolved.browser,
      browserBuildId: resolved.buildId,
      timeoutMs,
      status: 'ok',
      checks: [],
      scenarioMs: null,
      error: null,
      chromePids: [],
      nextReport: { key: nextKey, ok: false, detail: 'not run' },
      leftoverProcesses: [],
    };
    const caseTmp = fs.mkdtempSync(path.join('/tmp', `vft-pdf-${resolved.browser}-`));
    const job: WorkerJob = {
      fixtureId: SCENARIO_FIXTURE,
      deployedDistDir: opts.deployedDistDir,
      key,
      headless: resolved.headless,
      executablePath: resolved.executablePath,
      scenario: { name, nextKey },
    };
    const killAll = (child: ChildProcess) => {
      for (const pid of result.chromePids) killGroup(pid);
      child.kill('SIGKILL');
    };
    const outcome = await new Promise<{ scenarioDone: boolean; next: { ok: boolean; detail: string } | null }>((resolve) => {
      const child = forkWorker(caseTmp);
      current = { child, chromePgid: null };
      let scenarioDone = false;
      let next: { ok: boolean; detail: string } | null = null;
      // The bound covers only the failing call. A missing close timeout must fail here, not pass
      // after the harness kills Chrome, so a scenario that runs out of time is never retried.
      let timer = setTimeout(() => {
        next = { ok: false, detail: 'not run: the failing call did not settle in time' };
        killAll(child);
      }, timeoutMs);
      child.on('message', (m: WorkerMessage) => {
        if (m.type === 'launched' && m.pid) {
          result.chromePids.push(m.pid);
          current = { child, chromePgid: m.pid };
        }
        if (m.type === 'scenario-done') {
          scenarioDone = true;
          result.scenarioMs = m.ms;
          result.error = m.error;
          clearTimeout(timer);
          timer = setTimeout(() => {
            next = { ok: false, detail: `timeout after ${opts.caseTimeoutMs} ms` };
            killAll(child);
          }, opts.caseTimeoutMs);
        }
        if (m.type === 'done') next = m.ok ? { ok: true, detail: `rendered and uploaded in ${m.renderMs} ms` } : { ok: false, detail: m.error };
      });
      child.on('exit', (code, signal) => {
        clearTimeout(timer);
        if (halt.reason && !next) next = { ok: false, detail: `stopped: ${halt.reason}` };
        resolve({ scenarioDone, next: next ?? { ok: false, detail: `worker exited (${signal ?? code}) without a result` } });
      });
      child.send(job);
    });
    current = null;

    await new Promise((r) => setTimeout(r, 300));
    const leftovers = [...result.chromePids.flatMap((pid) => processesInGroup(pid)), ...processesMentioning(caseTmp)].filter(
      (p, i, all) => all.findIndex((q) => q.pid === p.pid) === i,
    );
    for (const p of leftovers) killPid(p.pid);
    result.leftoverProcesses = leftovers.map((p) => ({ pid: p.pid, command: brief(p).command }));
    fs.rmSync(caseTmp, { recursive: true, force: true });

    const expected = SCENARIOS[name].expectError;
    const bounded = outcome.scenarioDone && result.scenarioMs !== null && result.scenarioMs <= timeoutMs;
    result.checks.push({
      id: 'bounded',
      ok: bounded,
      detail: outcome.scenarioDone ? `failing call settled in ${result.scenarioMs} ms (bound ${timeoutMs} ms)` : `failing call did not settle within ${timeoutMs} ms; the harness killed the worker and Chrome`,
    });
    result.checks.push({
      id: 'original-error',
      ok: result.error !== null && result.error.includes(expected),
      detail: result.error === null ? (outcome.scenarioDone ? 'the call succeeded despite the injected failure' : 'no error reported') : `${result.error.split('\n')[0]}${result.error.includes(expected) ? '' : ` (expected it to include ${JSON.stringify(expected)})`}`,
    });
    result.nextReport = { key: nextKey, ...(outcome.next ?? { ok: false, detail: 'not run' }) };
    if (result.nextReport.ok && storage) {
      try {
        const pdf = await storage.get(nextKey, opts.caseTimeoutMs);
        const bad = boxChecks(pdf).filter((c) => !c.ok);
        result.nextReport.bytes = pdf.length;
        result.nextReport.sha256 = sha256(pdf);
        manifest.objects.push({ key: nextKey, kind: 'scenario-pdf', bytes: pdf.length, sha256: result.nextReport.sha256 });
        if (bad.length) result.nextReport = { ...result.nextReport, ok: false, detail: bad.map((c) => `${c.id}: ${c.detail}`).join('; ') };
      } catch (error) {
        result.nextReport = { ...result.nextReport, ok: false, detail: `download failed: ${errorMessage(error)}` };
      }
    }
    result.checks.push({ id: 'next-report', ok: result.nextReport.ok, detail: result.nextReport.detail });
    result.checks.push({ id: 'no-leftover-chrome', ok: leftovers.length === 0, detail: `${leftovers.length} process(es) left` });
    result.status = result.checks.every((c) => c.ok) ? 'ok' : 'failed';
    log.line(`  ${result.status}: ${result.checks.map((c) => `${c.id} ${c.ok ? 'ok' : 'FAILED'}`).join(', ')}`);
    return result;
  }

  /** measurements.json, the compressed samples and failure-scenarios.json, in the run directory. */
  function writeEvidenceFiles(): string[] {
    const files: string[] = [];
    if (manifest.measured) {
      const m: MeasurementsFile = {
        version: 1,
        runId,
        repetitions: manifest.measured.repetitions,
        intervalMs: manifest.measured.intervalMs,
        idleMs: manifest.measured.idleMs,
        approximate: APPROXIMATE_NOTE,
        samplesFile: SAMPLES_NAME,
        harnessParentRssKb: Math.round(process.memoryUsage().rss / 1024),
        renders: measuredRenders,
      };
      writeJson(path.join(runDir, MEASUREMENTS_NAME), m);
      fs.writeFileSync(path.join(runDir, SAMPLES_NAME), gzipSync(`${sampleLines.join('\n')}\n`));
      files.push(MEASUREMENTS_NAME, SAMPLES_NAME);
    }
    if (manifest.failureScenarios) {
      const f: FailureScenariosFile = { version: 1, runId, timeoutMs: manifest.failureScenarios.timeoutMs, fixture: SCENARIO_FIXTURE, results: scenarioResults };
      writeJson(path.join(runDir, FAILURE_SCENARIOS_NAME), f);
      files.push(FAILURE_SCENARIOS_NAME);
    }
    return files;
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

  async function uploadEvidence(store: Storage, evidenceFiles: string[]) {
    try {
      const kinds: Record<string, RemoteObject['kind']> = { [MEASUREMENTS_NAME]: 'measurements', [SAMPLES_NAME]: 'samples', [FAILURE_SCENARIOS_NAME]: 'failure-scenarios' };
      for (const name of evidenceFiles) {
        const key = `${prefix}${name}`;
        journal(key);
        const body = fs.readFileSync(path.join(runDir, name));
        await store.put(key, body, name.endsWith('.gz') ? 'application/gzip' : 'application/json');
        manifest.objects.push({ key, kind: kinds[name]!, bytes: body.length, sha256: sha256(body) });
      }
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
    storage = new Storage(config.r2, opts.caseTimeoutMs);

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
    const failedChecks = (r: RenderRecord) => r.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`).join('; ');
    if (manifest.measured) {
      const measure = { intervalMs: manifest.measured.intervalMs, idleMs: manifest.measured.idleMs };
      const plan = measuredPlan(selected, opts.browser, manifest.measured.repetitions);
      for (const [i, step] of plan.entries()) {
        if (halt.reason) break;
        const resolved = browsers.find((b) => b.browser === step.browser)!;
        const first = step.repetition === 1;
        log.line(`[${i + 1}/${plan.length}] measured ${step.fixture.id} with ${step.browser}, repetition ${step.repetition}`);
        const { record, sampler } = await renderOne(step, resolved, {
          key: first ? undefined : `${prefix}pdf/${step.browser}/${step.fixture.id}.r${step.repetition}.pdf`,
          kind: first ? 'pdf' : 'measured-pdf',
          measure,
        });
        // Repetition 1's PDF is the run's render record, checked by verify like any other.
        if (first) manifest.renders.push(record);
        const idle = sampler?.phases.find((p) => p.summary.phase === 'idle') ?? null;
        const window = sampler?.phases.find((p) => p.summary.phase === 'render') ?? null;
        const caseId = `${step.fixture.id}.${step.browser}.r${step.repetition}`;
        for (const p of sampler?.phases ?? []) sampleLines.push(JSON.stringify({ case: caseId, phase: p.summary.phase, startedAt: p.summary.startedAt, columns: ['t', 'workerKb', 'chromeKb', 'serviceKb', 'availKb', 'swapUsedKb'], rows: p.rows }));
        const measured: MeasuredRender = {
          fixtureId: step.fixture.id,
          fixtureHash: step.fixture.hash,
          browser: step.browser,
          browserBuildId: resolved.buildId,
          browserVersion: record.browserVersion ?? null,
          repetition: step.repetition,
          key: record.key,
          status: record.status,
          ...(record.error ? { error: record.error } : {}),
          durationMs: record.durationMs,
          idle: idle?.summary ?? null,
          render: window?.summary ?? null,
          processes: sampler?.processPeaks() ?? [],
          leftoverProcesses: record.leftoverProcesses.map((p) => ({ pid: p.pid, command: p.command })),
          serviceActivity: record.interference.serviceActivity,
          interference: [],
        };
        // The sampler's own attribution, sample by sample, not the coarser before/after process check.
        measured.interference = interferenceReasons(measured, servicePid !== null && [idle, window].some((p) => p && p.summary.serviceMissingSamples > 0));
        measuredRenders.push(measured);
        const peak = window?.summary.chrome.peakKb;
        log.line(`  chrome peak ${peak === null || peak === undefined ? '?' : `${Math.round(peak / 1024)} MiB`}${measured.interference.length ? `; interference: ${measured.interference.join('; ')}` : ''}`);
        if (record.status === 'failed') fail(`measured render ${caseId}: ${failedChecks(record)}`);
        save();
      }
    } else {
      const plan = renderPlan(selected, opts.browser);
      for (const [i, step] of plan.entries()) {
        if (halt.reason) break;
        const resolved = browsers.find((b) => b.browser === step.browser)!;
        log.line(`[${i + 1}/${plan.length}] ${step.fixture.id} with ${step.browser}`);
        const { record } = await renderOne(step, resolved);
        manifest.renders.push(record);
        if (record.status === 'failed') fail(`render ${step.fixture.id}/${step.browser}: ${failedChecks(record)}`);
        save();
      }
    }

    if (manifest.failureScenarios) {
      for (const resolved of browsers) {
        for (const name of SCENARIO_NAMES) {
          if (halt.reason) break;
          log.line(`failure scenario ${name} with ${resolved.browser}`);
          const result = await runScenario(name, resolved, manifest.failureScenarios.timeoutMs);
          scenarioResults.push(result);
          if (result.status === 'failed') fail(`failure scenario ${name}/${resolved.browser}: ${result.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`).join('; ')}`);
          save();
        }
      }
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
    // The invocation timer is cleared by now; bound the remaining work on its own.
    if ((await withDeadline(finishDiagnostics(), opts.caseTimeoutMs)) === 'timeout') fail('end-of-run diagnostics timed out');
    manifest.status = halt.reason && halt.reason.startsWith('SIG') ? 'interrupted' : manifest.failures.length ? 'failed' : 'ok';
    manifest.finishedAt = new Date().toISOString();
    save();
    let evidenceFiles: string[] = [];
    try {
      evidenceFiles = writeEvidenceFiles();
    } catch (error) {
      fail(`writing measurement evidence: ${errorMessage(error)}`);
      if (manifest.status === 'ok') manifest.status = 'failed';
      save();
    }
    if (storage && (await withDeadline(uploadEvidence(storage, evidenceFiles), opts.caseTimeoutMs * 2)) === 'timeout') {
      manifest.status = 'failed';
      manifest.failures.push('uploading the log and manifest timed out');
      save();
    }
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

function killPid(pid: number) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // already gone
  }
}

/** Resolves 'timeout' if `work` hasn't settled in time; the work itself is left to finish or fail. */
async function withDeadline(work: Promise<unknown>, ms: number): Promise<'done' | 'timeout'> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  try {
    return await Promise.race([work.then(() => 'done' as const), deadline]);
  } finally {
    clearTimeout(timer);
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
