import { approveThresholds } from '../approve';
import type { Approvals, ThresholdEntry } from '../approvals';
import { ALL_FIXTURES, fixtureById, jobTypesCovered } from '../fixtures';
import { PDF_JOB_TYPES } from '../fixtures/types';
import type { RunManifest } from '../manifest';
import { memoryChecks, scenarioChecks, type MemoryGroup } from '../measurementChecks';
import { MEASURED_FIXTURES, interferenceReasons, type MeasuredRender, type MeasurementsFile } from '../measurements';
import { MemorySampler, summarizePhase, type PhaseSummary, type ProcEntry } from '../memory';
import { measuredPlan } from '../render';
import { SCENARIO_NAMES, type FailureScenariosFile, type ScenarioResult } from '../scenarios';
import type { VerifyResults } from '../verify';
import { injectIntoBrowser, injectIntoUpload } from '../worker';

const RUN = '20261116T153000Z-ab12cd';
const MARKER = '/tmp/vft-pdf-shell-abc123';

describe('measured plan', () => {
  it('repeats every fixture per browser and alternates which browser goes first between repetitions', () => {
    const fixtures = [fixtureById('roster-quick'), fixtureById('legacy-quick')];
    expect(measuredPlan(fixtures, 'both', 3).map((s) => `${s.repetition}:${s.fixture.id}.${s.browser}`)).toEqual([
      '1:roster-quick.chrome', '1:roster-quick.shell', '1:legacy-quick.chrome', '1:legacy-quick.shell',
      '2:roster-quick.shell', '2:roster-quick.chrome', '2:legacy-quick.shell', '2:legacy-quick.chrome',
      '3:roster-quick.chrome', '3:roster-quick.shell', '3:legacy-quick.chrome', '3:legacy-quick.shell',
    ]);
    expect(measuredPlan(fixtures, 'shell', 2)).toHaveLength(4);
  });

  it('measures existing fixtures that cover every PDF job type', () => {
    const fixtures = MEASURED_FIXTURES.map((id) => fixtureById(id));
    expect(fixtures.every((f) => ALL_FIXTURES.includes(f))).toBe(true);
    expect([...jobTypesCovered(fixtures)].sort()).toEqual([...PDF_JOB_TYPES].sort());
  });
});

describe('memory sampler', () => {
  const proc = (pid: number, ppid: number, pgid: number, rssKb: number, command: string): ProcEntry => ({ pid, ppid, pgid, start: `s${pid}`, rssKb, command });

  it('keeps harness, service and unrelated Chrome apart, and follows reparented harness Chrome', () => {
    let procs: ProcEntry[] = [
      proc(process.pid, 1, process.pid, 50_000, 'node cli.js render'),
      proc(100, process.pid, process.pid, 80_000, 'node worker.js'),
      proc(200, 100, 200, 300_000, `chrome-headless-shell --user-data-dir=${MARKER}/puppeteer_dev_profile`),
      proc(201, 200, 200, 20_000, 'chrome-headless-shell --type=zygote'),
      proc(300, 1, 300, 120_000, 'node dist/index.js'),
      proc(301, 300, 301, 400_000, 'chrome --user-data-dir=/tmp/puppeteer_dev_profile-x'),
      proc(400, 1, 400, 90_000, 'chrome --some-other-user'),
    ];
    let t = 0;
    const sampler = new MemorySampler({ intervalMs: 100, servicePid: 300, marker: MARKER, source: () => procs, system: () => ({ availKb: 500_000, swapUsedKb: 0 }), now: () => t });
    sampler.start('render', { timer: false });
    sampler.setWorker(100);
    sampler.setChromePgid(200);
    t = 100;
    sampler.tick();
    // Chrome reparented to init and moved out of its group: still the harness's, by pid and start time.
    procs = [...procs.filter((p) => p.pid !== 201 && p.pid !== 100), proc(201, 1, 1, 25_000, 'chrome-headless-shell --type=zygote'), proc(202, 1, 1, 5_000, `crash ${MARKER}`)];
    t = 200;
    sampler.tick();
    const s = sampler.stop()!;
    expect(s.worker.peakKb).toBe(80_000);
    expect(s.chrome.peakKb).toBe(330_000); // 300 + 25 + 5 after reparenting
    expect(s.harness.peakKb).toBe(400_000);
    expect(s.service.peakKb).toBe(520_000); // the service and its own Chrome, never the harness's
    expect(s.serviceChromeSeen).toBe(true);
    expect(s.foreignChrome.map((p) => p.pid)).toEqual([400]);
    const peaks = sampler.processPeaks();
    expect(peaks.map((p) => p.pid).sort()).toEqual([100, 200, 201, 202]);
    expect(peaks.find((p) => p.pid === 201)!.peakKb).toBe(25_000);
  });

  it('records the idle phase without harness numbers, and counts samples without the service', () => {
    let present = true;
    const sampler = new MemorySampler({
      intervalMs: 100,
      servicePid: 300,
      marker: MARKER,
      source: () => (present ? [proc(300, 1, 300, 100_000, 'node dist/index.js')] : []),
      system: () => null,
      now: () => 0,
    });
    sampler.start('idle', { timer: false });
    present = false;
    sampler.tick();
    const s = sampler.stop()!;
    expect(s.harness.peakKb).toBeNull();
    expect(s.service.peakKb).toBe(100_000);
    expect(s.serviceMissingSamples).toBe(2);
    expect(s.minAvailKb).toBeNull();
  });

  it('reports sampling gaps and medians', () => {
    const s = summarizePhase('render', 'x', [[0, 1, 10, null, 5, 0], [100, 1, 30, null, 4, 0], [450, 1, 20, null, 6, 1]], 100, new Map(), false);
    expect(s.gaps).toEqual({ maxMs: 350, overTwiceInterval: 1 });
    expect(s.chrome).toEqual({ peakKb: 30, medianKb: 20 });
    expect(s.minAvailKb).toBe(4);
    expect(s.maxSwapUsedKb).toBe(1);
  });
});

// ------------------------------------------------------------------ verify-side judgement

const phase = (chromeKb: number, extra: Partial<PhaseSummary> = {}): PhaseSummary => ({
  phase: 'render', startedAt: 'x', durationMs: 1000, samples: 10, intervalMs: 100, gaps: { maxMs: 110, overTwiceInterval: 0 },
  worker: { peakKb: 80_000, medianKb: 80_000 }, chrome: { peakKb: chromeKb, medianKb: chromeKb }, harness: { peakKb: chromeKb + 80_000, medianKb: chromeKb + 80_000 },
  service: { peakKb: 100_000, medianKb: 100_000 }, minAvailKb: 300_000, maxSwapUsedKb: 0, foreignChrome: [], serviceChromeSeen: false, serviceMissingSamples: 0, ...extra,
});

function measuredRender(browser: 'chrome' | 'shell', repetition: number, chromeKb: number, extra: Partial<MeasuredRender> = {}): MeasuredRender {
  const f = fixtureById('roster-ed45-split');
  return {
    fixtureId: f.id, fixtureHash: f.hash, browser, browserBuildId: browser === 'shell' ? '131.0.6778.204' : '131.0.6778.204', browserVersion: 'HeadlessChrome/131', repetition,
    key: `pdf-validation/${RUN}/pdf/${browser}/${f.id}.pdf`, status: 'ok', durationMs: 1000, idle: phase(0, { phase: 'idle' }), render: phase(chromeKb), processes: [], leftoverProcesses: [],
    serviceActivity: { receivedRequest: 0 }, interference: [], ...extra,
  };
}

const manifestWith = (extra: Partial<RunManifest>): RunManifest =>
  ({ runId: RUN, browsers: ['chrome', 'shell'], measured: { fixtures: ['roster-ed45-split'], repetitions: 3, intervalMs: 100, idleMs: 10_000 }, failureScenarios: null, ...extra }) as RunManifest;

const measurementsOf = (renders: MeasuredRender[]): MeasurementsFile => ({ version: 1, runId: RUN, repetitions: 3, intervalMs: 100, idleMs: 10_000, approximate: '', samplesFile: '', harnessParentRssKb: 0, renders });

const threeEach = (shellKb: number[], chromeKb = [500_000, 520_000, 510_000]) => [
  ...chromeKb.map((kb, i) => measuredRender('chrome', i + 1, kb)),
  ...shellKb.map((kb, i) => measuredRender('shell', i + 1, kb)),
];

const threshold = (browser: 'chrome' | 'shell', metric: ThresholdEntry['metric'], maxKb: number): ThresholdEntry => {
  const f = fixtureById('roster-ed45-split');
  return { fixtureId: f.id, fixtureHash: f.hash, browser, browserBuildId: '131.0.6778.204', metric, maxKb, measured: { medianKb: 0, maxKb: 0, repetitions: 3 }, headroomPct: 10, sourceRunId: RUN, reviewer: 'r', approvedAt: 'x', versions: { browserVersion: '', puppeteer: '', deployedCommit: '', instance: '' } };
};
const approvalsWith = (thresholds: ThresholdEntry[]): Approvals => ({ version: 1, baselines: [], pageCounts: [], acceptances: [], thresholds });

describe('memory checks', () => {
  it('needs review without approved thresholds and without a measurements file', () => {
    const { checks, groups } = memoryChecks(manifestWith({}), measurementsOf(threeEach([300_000, 320_000, 310_000])), approvalsWith([]));
    expect(groups.map((g) => [g.browser, g.status])).toEqual([['chrome', 'needs-review'], ['shell', 'needs-review']]);
    expect(groups[1]!.peaks.chromePeakKb).toMatchObject({ medianKb: 310_000, maxKb: 320_000 });
    expect(checks.find((c) => c.id === 'memory-complete')!.status).toBe('pass');
    expect(memoryChecks(manifestWith({}), null, approvalsWith([])).checks).toEqual([expect.objectContaining({ id: 'memory-measurements', status: 'needs-review' })]);
    expect(memoryChecks(manifestWith({ measured: null }), null, approvalsWith([])).checks).toEqual([]);
  });

  it('fails a peak over its approved threshold and passes one under it', () => {
    const all = ['chrome', 'shell'].flatMap((b) => [threshold(b as 'chrome', 'chromePeakKb', 400_000), threshold(b as 'chrome', 'harnessPeakKb', 1_000_000)]);
    const { groups } = memoryChecks(manifestWith({}), measurementsOf(threeEach([300_000, 320_000, 310_000])), approvalsWith(all));
    expect(groups.find((g) => g.browser === 'shell')!.status).toBe('pass');
    const chrome = groups.find((g) => g.browser === 'chrome')!;
    expect(chrome.status).toBe('fail');
    expect(chrome.notes.join()).toMatch(/chromePeakKb 508 MiB is over the approved 391 MiB/);
  });

  it('flags interference for review, fails failed or missing repetitions', () => {
    const renders = threeEach([300_000, 320_000]);
    renders[0] = { ...renders[0]!, interference: ['service Chrome running during render'] };
    renders[1] = { ...renders[1]!, status: 'failed' };
    const { checks, groups } = memoryChecks(manifestWith({}), measurementsOf(renders), approvalsWith([]));
    const chrome = groups.find((g) => g.browser === 'chrome')!;
    expect(chrome.status).toBe('fail');
    expect(chrome.notes.join()).toMatch(/1 of 3 repetition\(s\) failed.*overlapped production work/);
    expect(chrome.peaks.chromePeakKb.perRepetition).toEqual([500_000, null, 510_000]);
    expect(checks.find((c) => c.id === 'memory-complete')).toMatchObject({ status: 'fail', detail: expect.stringContaining('roster-ed45-split.shell') });
  });

  it('needs review when a sampling gap could hide a peak', () => {
    const renders = threeEach([300_000, 300_000, 300_000]).map((r) => ({ ...r, render: phase(300_000, { gaps: { maxMs: 2_500, overTwiceInterval: 1 } }) }));
    const { groups } = memoryChecks(manifestWith({}), measurementsOf(renders), approvalsWith(['chrome', 'shell'].flatMap((b) => [threshold(b as 'chrome', 'chromePeakKb', 900_000), threshold(b as 'chrome', 'harnessPeakKb', 900_000)])));
    expect(groups.every((g) => g.status === 'needs-review')).toBe(true);
  });

  it('names production overlap as interference', () => {
    expect(interferenceReasons({ idle: phase(0, { serviceChromeSeen: true }), render: phase(1), serviceActivity: { receivedRequest: 1, uploads: 0 } }, true)).toEqual([
      'service job log lines: receivedRequest 1',
      'service Chrome running during render',
      'report-server restarted or changed pid',
    ]);
    expect(interferenceReasons({ idle: phase(0), render: phase(1), serviceActivity: { unavailable: 'no log' } }, false)).toEqual([]);
  });
});

describe('failure scenario checks', () => {
  const result = (scenario: ScenarioResult['scenario'], browser: 'chrome' | 'shell', ok: boolean): ScenarioResult => ({
    scenario, browser, browserBuildId: 'b', timeoutMs: 30_000, status: ok ? 'ok' : 'failed', scenarioMs: ok ? 120 : null, error: ok ? 'x' : null, chromePids: [1],
    checks: ok ? [] : [{ id: 'bounded', ok: false, detail: 'failing call did not settle within 30000 ms' }],
    nextReport: { key: 'k', ok, detail: '' }, leftoverProcesses: [],
  } as ScenarioResult);
  const file = (results: ScenarioResult[]): FailureScenariosFile => ({ version: 1, runId: RUN, timeoutMs: 30_000, fixture: 'roster-quick', results });
  const manifest = manifestWith({ measured: null, failureScenarios: { scenarios: [...SCENARIO_NAMES], timeoutMs: 30_000, fixture: 'roster-quick' } });

  it('passes completed scenarios, fails the close hang with a note, and fails scenarios that never ran', () => {
    const results = ['chrome', 'shell'].flatMap((b) => SCENARIO_NAMES.map((s) => result(s, b as 'chrome', !(s === 'close-no-page' && b === 'shell'))));
    const checks = scenarioChecks(manifest, file(results));
    expect(checks.filter((c) => c.status === 'fail').map((c) => c.id)).toEqual(['scenario:close-no-page.shell']);
    expect(checks.find((c) => c.id === 'scenario:close-no-page.shell')!.detail).toMatch(/PR #148/);
    expect(scenarioChecks(manifest, file(results.slice(1)))[0]).toMatchObject({ id: 'failure-scenarios', status: 'fail' });
    expect(scenarioChecks(manifest, null)).toEqual([expect.objectContaining({ status: 'needs-review' })]);
  });
});

describe('approve --thresholds', () => {
  const group = (extra: Partial<MemoryGroup> = {}): MemoryGroup => {
    const f = fixtureById('roster-ed45-split');
    return {
      fixtureId: f.id, fixtureHash: f.hash, browser: 'shell', browserBuildId: '131.0.6778.204', browserVersion: 'v', repetitions: 3, ok: 3, interfered: 0,
      peaks: { chromePeakKb: { perRepetition: [], medianKb: 300_000, maxKb: 320_000 }, harnessPeakKb: { perRepetition: [], medianKb: 380_000, maxKb: 400_000 } },
      idleServiceMedianKb: null, minAvailKb: null, maxSwapUsedKb: null, maxGapMs: 100, thresholds: [], status: 'needs-review', notes: [], ...extra,
    };
  };
  const manifest = { deployed: { revision: { commit: 'abc', commitTime: '', branch: 'main', dirty: [] } }, versions: { puppeteer: '23.11.1' }, instance: { platform: 'linux x64', cpus: 2, totalMemMb: 945 } } as unknown as RunManifest;

  it('records the measured max plus headroom, and skips interfered groups', () => {
    const approvals = approvalsWith([threshold('shell', 'chromePeakKb', 1)]);
    const results = { memory: [group(), group({ browser: 'chrome', interfered: 1 })] } as VerifyResults;
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(approveThresholds(approvals, results, manifest, { runId: RUN, reviewer: 'Reviewer', headroomPct: 10, fixtures: null, browser: null })).toBe(2);
    spy.mockRestore();
    expect(approvals.thresholds.map((t) => [t.browser, t.metric, t.maxKb])).toEqual([
      ['shell', 'chromePeakKb', 352_000],
      ['shell', 'harnessPeakKb', 440_000],
    ]);
    expect(approvals.thresholds[0]).toMatchObject({ reviewer: 'Reviewer', sourceRunId: RUN, versions: { deployedCommit: 'abc', instance: 'linux x64, 2 CPU, 945 MB' } });
    expect(() => approveThresholds(approvals, { memory: [] } as unknown as VerifyResults, manifest, { runId: RUN, reviewer: 'R', headroomPct: 10, fixtures: null, browser: null })).toThrow(/verify a --measured run/);
  });
});

describe('failure injection', () => {
  it('makes newPage, setContent or createPDFStream reject on the launched browser only', async () => {
    const page = { setContent: jest.fn().mockResolvedValue(undefined), createPDFStream: jest.fn().mockResolvedValue('stream') };
    const browser = () => ({ process: () => null, version: async () => 'v', newPage: jest.fn().mockResolvedValue({ ...page }) });

    const noPage = browser();
    injectIntoBrowser(noPage, 'close-no-page');
    await expect(noPage.newPage()).rejects.toThrow('pdf-validation injected failure: newPage');

    const setContent = browser();
    injectIntoBrowser(setContent, 'setcontent-rejects');
    const p1 = await setContent.newPage();
    await expect(p1.setContent()).rejects.toThrow('injected failure: setContent');
    await expect(p1.createPDFStream()).resolves.toBe('stream');

    const pdf = browser();
    injectIntoBrowser(pdf, 'pdf-stream-rejects');
    await expect((await pdf.newPage()).createPDFStream()).rejects.toThrow('injected failure: createPDFStream');

    const untouched = browser();
    injectIntoBrowser(untouched, 'upload-rejects');
    await expect((await untouched.newPage()).setContent()).resolves.toBeUndefined();
  });

  it('replaces and restores the deployed upload export', async () => {
    const original = jest.fn().mockResolvedValue(true);
    const s3 = { uploadFileToR2: original };
    const restore = injectIntoUpload(s3, 'upload-rejects');
    await expect(s3.uploadFileToR2()).rejects.toThrow('injected failure: uploadFileToR2');
    restore();
    expect(s3.uploadFileToR2).toBe(original);
    injectIntoUpload(s3, 'upload-returns-false');
    await expect(s3.uploadFileToR2()).resolves.toBe(false);
  });
});

describe('Chrome detection', () => {
  it('matches browser executables, not commands that mention chrome in their arguments', async () => {
    const { isChromeCommand } = await import('../diagnostics');
    expect(isChromeCommand('/home/bitnami/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome --allow-pre-commit-input --headless')).toBe(true);
    expect(isChromeCommand('/x/chrome-headless-shell-linux64/chrome-headless-shell --headless --single-process')).toBe(true);
    expect(isChromeCommand('/x/chrome-mac-arm64/Google Chrome --type=renderer')).toBe(true);
    expect(isChromeCommand('node /home/bitnami/.nvm/versions/node/v22.23.4/bin/pnpm -s run pdf-validation render --mode full --browser chrome')).toBe(false);
    expect(isChromeCommand('sh -c tsc -p pdf-validation/tsconfig.json && node pdf-validation/dist/cli.js "render" "--browser" "chrome"')).toBe(false);
    expect(isChromeCommand('/x/chrome-linux64/chrome_crashpad_handler --monitor-self')).toBe(false);
    expect(isChromeCommand('(Google Chrome fo)')).toBe(false);
  });
});
