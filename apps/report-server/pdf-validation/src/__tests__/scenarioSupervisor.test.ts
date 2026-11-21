import { EventEmitter } from 'events';
import { leftoversIn, type ProcessInfo } from '../diagnostics';
import { CONTINUE_MESSAGE, stillRunningAfter, superviseScenario, type LeftoverProcess, type ScenarioChild, type SuperviseOptions } from '../scenarioSupervisor';
import type { WorkerJob, WorkerMessage } from '../worker';

const CASE_MS = 180_000;
const FAILURE_MS = 30_000;
const JOB: WorkerJob = {
  fixtureId: 'roster-quick',
  deployedDistDir: '/opt/vft/apps/report-server/dist',
  key: 'pdf-validation/run/failures/shell/close-no-page.pdf',
  headless: 'shell',
  executablePath: '/opt/chrome-headless-shell',
  scenario: { name: 'close-no-page', nextKey: 'pdf-validation/run/failures/shell/close-no-page-next.pdf' },
};

/** A worker double: records what the harness sends, and lets the test send messages and exit. */
class FakeWorker implements ScenarioChild {
  private readonly events = new EventEmitter();
  readonly sent: unknown[] = [];
  connected = true;
  on(event: 'message', listener: (m: WorkerMessage) => void): this;
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
  on(event: 'message' | 'exit', listener: ((m: WorkerMessage) => void) | ((code: number | null, signal: NodeJS.Signals | null) => void)): this {
    this.events.on(event, listener);
    return this;
  }
  send(message: unknown) {
    this.sent.push(message);
    return true;
  }
  message(m: WorkerMessage) {
    this.events.emit('message', m);
  }
  exit(code: number | null, signal: NodeJS.Signals | null = null) {
    this.connected = false;
    this.events.emit('exit', code, signal);
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function setup(afterFailure: SuperviseOptions['afterFailure'] = () => Promise.resolve([]), haltReason: () => string | null = () => null) {
  const worker = new FakeWorker();
  const killAll = jest.fn<void, [number[]]>();
  const checked = jest.fn<void, [number[]]>();
  const launched = jest.fn<void, [number]>();
  const result = superviseScenario(worker, JOB, {
    caseTimeoutMs: CASE_MS,
    failureTimeoutMs: FAILURE_MS,
    killAll,
    afterFailure: (pids) => {
      checked(pids);
      return afterFailure(pids);
    },
    onLaunched: launched,
    haltReason,
  });
  return { worker, killAll, checked, launched, result };
}

const flush = () => jest.advanceTimersByTimeAsync(0);

describe('superviseScenario', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('bounds the failing call from scenario-start, not from fork, and checks for Chrome before letting the worker go on', async () => {
    const { worker, killAll, checked, launched, result } = setup();
    expect(worker.sent).toEqual([JOB]);

    await jest.advanceTimersByTimeAsync(CASE_MS - 1); // a slow module load is not the failing call
    worker.message({ type: 'scenario-start' });
    worker.message({ type: 'launched', pid: 11, browserVersion: 'v' });
    await jest.advanceTimersByTimeAsync(FAILURE_MS - 1);
    expect(killAll).not.toHaveBeenCalled();

    worker.message({ type: 'scenario-done', error: 'injected: newPage', ms: 29_000 });
    expect(checked).toHaveBeenCalledWith([11]);
    await flush();
    expect(worker.sent).toEqual([JOB, CONTINUE_MESSAGE]);

    worker.message({ type: 'launched', pid: 12, browserVersion: 'v' });
    worker.message({ type: 'done', ok: true, renderMs: 900 });
    worker.exit(0);
    await expect(result).resolves.toEqual({
      started: true,
      timedOut: null,
      settled: { error: 'injected: newPage', ms: 29_000 },
      chromePids: [11, 12],
      leftoversAfterFailure: [],
      next: { ok: true, detail: 'rendered and uploaded in 900 ms' },
    });
    expect(launched.mock.calls).toEqual([[11], [12]]);
    expect(killAll).not.toHaveBeenCalled();
  });

  it('kills the worker and Chrome when the failing call does not settle, and never checks or continues', async () => {
    const { worker, killAll, checked, result } = setup();
    worker.message({ type: 'scenario-start' });
    worker.message({ type: 'launched', pid: 11, browserVersion: 'v' });
    await jest.advanceTimersByTimeAsync(FAILURE_MS);
    expect(killAll).toHaveBeenCalledWith([11]);
    worker.exit(null, 'SIGKILL');
    const r = await result;
    expect(r).toMatchObject({ started: true, timedOut: 'failure', settled: null, leftoversAfterFailure: null, next: { ok: false, detail: 'not run: the failing call did not settle in time' } });
    expect(checked).not.toHaveBeenCalled();
    expect(worker.sent).toEqual([JOB]);
  });

  it('kills a worker that never starts the failing call, and reports a worker that fails before it', async () => {
    const stuck = setup();
    await jest.advanceTimersByTimeAsync(CASE_MS);
    expect(stuck.killAll).toHaveBeenCalledWith([]);
    stuck.worker.exit(null, 'SIGKILL');
    expect(await stuck.result).toMatchObject({ started: false, timedOut: 'start', next: { ok: false, detail: `not run: the worker did not start the failing call within ${CASE_MS} ms` } });

    const broken = setup();
    broken.worker.message({ type: 'done', ok: false, error: 'Cannot find module ./utils.js' });
    broken.worker.exit(1);
    expect(await broken.result).toMatchObject({ started: false, timedOut: null, settled: null, next: { ok: false, detail: 'Cannot find module ./utils.js' } });
    expect(broken.killAll).not.toHaveBeenCalled();
  });

  it('holds the worker while the check runs, records leaked Chrome, then bounds the next report', async () => {
    const check = deferred<LeftoverProcess[]>();
    const { worker, killAll, result } = setup(() => check.promise);
    worker.message({ type: 'scenario-start' });
    worker.message({ type: 'launched', pid: 11, browserVersion: 'v' });
    worker.message({ type: 'scenario-done', error: 'injected: uploadFileToR2', ms: 4_000 });

    await jest.advanceTimersByTimeAsync(CASE_MS * 2); // no timer runs while the harness checks
    expect(killAll).not.toHaveBeenCalled();
    expect(worker.sent).toEqual([JOB]);

    check.resolve([{ pid: 11, command: '/opt/chrome/chrome --type=browser' }]);
    await flush();
    expect(worker.sent).toEqual([JOB, CONTINUE_MESSAGE]);

    await jest.advanceTimersByTimeAsync(CASE_MS); // the next report hangs
    expect(killAll).toHaveBeenCalledWith([11]);
    worker.exit(null, 'SIGKILL');
    expect(await result).toMatchObject({
      leftoversAfterFailure: [{ pid: 11, command: '/opt/chrome/chrome --type=browser' }],
      timedOut: 'next',
      next: { ok: false, detail: `timeout after ${CASE_MS} ms` },
    });
  });

  it('waits for an unfinished check when the worker exits, and sends nothing to the dead worker', async () => {
    const check = deferred<LeftoverProcess[]>();
    const { worker, result } = setup(() => check.promise);
    worker.message({ type: 'scenario-start' });
    worker.message({ type: 'scenario-done', error: null, ms: 10 });
    worker.exit(1);
    check.resolve([]);
    expect(await result).toMatchObject({ settled: { error: null, ms: 10 }, leftoversAfterFailure: [], next: { ok: false, detail: 'worker exited (1) without a result' } });
    expect(worker.sent).toEqual([JOB]);
  });

  it('records a check that throws as a leftover, so it fails rather than passes', async () => {
    const { worker, result } = setup(() => Promise.reject(new Error('ps failed')));
    worker.message({ type: 'scenario-start' });
    worker.message({ type: 'scenario-done', error: 'injected: setContent', ms: 50 });
    await flush();
    worker.message({ type: 'done', ok: true, renderMs: 1 });
    worker.exit(0);
    expect((await result).leftoversAfterFailure).toEqual([{ pid: 0, command: 'after-failure check failed: ps failed' }]);
  });

  it('sends nothing when a halt killed the worker during the check, even before its exit event', async () => {
    let halted: string | null = null;
    const check = deferred<LeftoverProcess[]>();
    const { worker, killAll, result } = setup(() => check.promise, () => halted);
    worker.message({ type: 'scenario-start' });
    worker.message({ type: 'scenario-done', error: 'injected: newPage', ms: 10 });
    halted = 'SIGINT';
    worker.connected = false; // the channel closes before 'exit' is processed
    check.resolve([]);
    await flush();
    expect(worker.sent).toEqual([JOB]);
    await jest.advanceTimersByTimeAsync(CASE_MS); // and no next-stage timer was armed
    expect(killAll).not.toHaveBeenCalled();
    worker.exit(null, 'SIGKILL');
    expect(await result).toMatchObject({ timedOut: null, next: { ok: false, detail: 'stopped: SIGINT' } });
  });

  it('kills a worker whose channel closed during the check instead of waiting for it forever', async () => {
    const check = deferred<LeftoverProcess[]>();
    const { worker, killAll, result } = setup(() => check.promise);
    worker.message({ type: 'scenario-start' });
    worker.message({ type: 'launched', pid: 11, browserVersion: 'v' });
    worker.message({ type: 'scenario-done', error: 'injected: setContent', ms: 10 });
    worker.connected = false;
    check.resolve([]);
    await flush();
    expect(killAll).toHaveBeenCalledWith([11]);
    expect(worker.sent).toEqual([JOB]);
    await jest.advanceTimersByTimeAsync(CASE_MS); // and no next-stage timer was armed
    expect(killAll).toHaveBeenCalledTimes(1);
    worker.exit(null, 'SIGKILL');
    expect(await result).toMatchObject({ timedOut: null, next: { ok: false, detail: 'not run: the worker disconnected during the after-failure check' } });
  });
});

describe('finding Chrome a scenario left behind', () => {
  const MARKER = '/tmp/vft-pdf-shell-Ab12Cd';
  const proc = (pid: number, pgid: number, command: string): ProcessInfo => ({ pid, ppid: 1, pgid, rssKb: 1000, command });
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("finds the render's Chrome by group or TMPDIR, once each, and nothing else", () => {
    const table = [
      proc(11, 11, '/opt/chrome-headless-shell --single-process'), // the failing call's Chrome, group leader
      proc(12, 11, `/opt/chrome-headless-shell --type=renderer --user-data-dir=${MARKER}/profile`), // in the group and marked
      proc(13, 40, `/opt/chrome-headless-shell --user-data-dir=${MARKER}/profile`), // left the group, still marked
      proc(20, 20, '/opt/chrome-headless-shell --user-data-dir=/tmp/puppeteer_dev_profile-x'), // the service's Chrome
      proc(30, 30, `node pdf-validation/dist/cli.js render ${MARKER}`), // the harness itself
    ];
    expect(leftoversIn(table, [11], MARKER, 30).map((p) => p.pid)).toEqual([11, 12, 13]);
    expect(leftoversIn(table, [], MARKER, 30).map((p) => p.pid)).toEqual([12, 13]);
    expect(leftoversIn(table.slice(3), [11], MARKER, 30)).toEqual([]);
  });

  it('gives a killed Chrome a grace period to disappear, then reports what is still running', async () => {
    const tables = [[1], [1], []];
    const vanishing = stillRunningAfter(() => tables.shift() ?? [], 2_000);
    await jest.advanceTimersByTimeAsync(200);
    await expect(vanishing).resolves.toEqual([]);

    const find = jest.fn(() => [1]);
    const stuck = stillRunningAfter(find, 2_000);
    await jest.advanceTimersByTimeAsync(2_100);
    await expect(stuck).resolves.toEqual([1]);
    expect(find.mock.calls.length).toBeGreaterThan(10);
  });
});
