/**
 * The harness side of one failure scenario (ticket 20): the worker's messages and the timers that
 * bound each stage. It is kept apart from render.ts so the timing rules can be tested with a
 * fake worker.
 *
 * Stages and their bounds:
 * 1. starting: loading modules, building HTML. Bounded by the normal case timeout.
 * 2. failing: from `scenario-start` until `scenario-done`. Bounded by the failure timeout. A
 *    missing close timeout must fail here, not pass after the harness kills Chrome.
 * 3. checking: the worker waits while the harness looks for Chrome the failing call left behind.
 *    This has to happen before the worker exits, because Puppeteer kills an unclosed browser when
 *    its Node process exits, and the long-lived service never exits.
 * 4. next: the same worker renders the next report. Bounded by the normal case timeout.
 */
import type { WorkerJob, WorkerMessage } from './worker';

/** Sent to the worker once the after-failure check is done; the worker then renders the next report. */
export const CONTINUE_MESSAGE = { type: 'continue' } as const;

export type ScenarioChild = {
  on(event: 'message', listener: (m: WorkerMessage) => void): unknown;
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  /** False once the IPC channel is closed, which can be before the 'exit' event fires. */
  readonly connected: boolean;
  send(message: unknown, callback?: (error: Error | null) => void): unknown;
};

export type LeftoverProcess = { pid: number; command: string };

export type SuperviseOptions = {
  /** Bounds the starting and next stages. */
  caseTimeoutMs: number;
  /** Bounds the failing call. */
  failureTimeoutMs: number;
  /** Kills the worker and every Chrome group it launched. */
  killAll: (chromePids: number[]) => void;
  /** Finds, kills and returns Chrome left behind by the failing call. */
  afterFailure: (chromePids: number[]) => Promise<LeftoverProcess[]>;
  /** Called for every Chrome the worker launches, so a halt can kill its group. */
  onLaunched?: (pid: number) => void;
  /** Why the run is stopping, if it is. */
  haltReason?: () => string | null;
};

export type SupervisedScenario = {
  /** The worker started the failing call. */
  started: boolean;
  /** Which stage's bound ran out, if one did: the harness then killed the worker and Chrome. */
  timedOut: 'start' | 'failure' | 'next' | null;
  /** The failing call settled, with the worker's own timing. Null if it never did. */
  settled: { error: string | null; ms: number } | null;
  chromePids: number[];
  /** Chrome left by the failing call, checked before the worker went on. Null if not checked. */
  leftoversAfterFailure: LeftoverProcess[] | null;
  /** The next report, or why the scenario never got that far. */
  next: { ok: boolean; detail: string };
};

/**
 * Polls `find` until it returns nothing or `graceMs` runs out, and returns what is still running.
 * A close that kills Chrome can return a moment before the process is gone.
 */
export async function stillRunningAfter<T>(find: () => T[], graceMs: number, pollMs = 100): Promise<T[]> {
  const deadline = Date.now() + graceMs;
  let left = find();
  while (left.length && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    left = find();
  }
  return left;
}

export function superviseScenario(child: ScenarioChild, job: WorkerJob, opts: SuperviseOptions): Promise<SupervisedScenario> {
  return new Promise((resolve) => {
    const result: SupervisedScenario = { started: false, timedOut: null, settled: null, chromePids: [], leftoversAfterFailure: null, next: { ok: false, detail: 'not run' } };
    let next: { ok: boolean; detail: string } | null = null;
    let checking: Promise<void> | null = null;
    let timer: NodeJS.Timeout | null = null;
    let exited = false;
    const arm = (stage: NonNullable<SupervisedScenario['timedOut']>, ms: number, detail: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        result.timedOut = stage;
        next ??= { ok: false, detail };
        opts.killAll(result.chromePids);
      }, ms);
    };
    const disarm = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    arm('start', opts.caseTimeoutMs, `not run: the worker did not start the failing call within ${opts.caseTimeoutMs} ms`);
    child.on('message', (m: WorkerMessage) => {
      if (m.type === 'scenario-start') {
        result.started = true;
        arm('failure', opts.failureTimeoutMs, 'not run: the failing call did not settle in time');
      }
      if (m.type === 'launched' && m.pid) {
        result.chromePids.push(m.pid);
        opts.onLaunched?.(m.pid);
      }
      if (m.type === 'scenario-done') {
        result.settled = { error: m.error, ms: m.ms };
        disarm();
        const pids = [...result.chromePids];
        checking = opts
          .afterFailure(pids)
          .catch((error: unknown) => [{ pid: 0, command: `after-failure check failed: ${error instanceof Error ? error.message : String(error)}` }])
          .then((leftovers) => {
            result.leftoversAfterFailure = leftovers;
            // A halt kills the worker, and its channel can close before 'exit' fires. Sending on a
            // closed channel raises 'error' on the child, so check first and route errors to the callback.
            if (exited || opts.haltReason?.()) return; // a halt kills the worker itself
            if (!child.connected) {
              // The worker is alive but can't be told to go on: don't wait forever for it.
              next ??= { ok: false, detail: 'not run: the worker disconnected during the after-failure check' };
              opts.killAll(result.chromePids);
              return;
            }
            arm('next', opts.caseTimeoutMs, `timeout after ${opts.caseTimeoutMs} ms`);
            child.send(CONTINUE_MESSAGE, () => undefined); // a failed send shows up as the worker's exit
          });
      }
      if (m.type === 'done') next ??= m.ok ? { ok: true, detail: `rendered and uploaded in ${m.renderMs} ms` } : { ok: false, detail: m.error };
    });
    child.on('exit', (code, signal) => {
      exited = true;
      disarm();
      const finish = () => {
        const halt = opts.haltReason?.() ?? null;
        if (halt && !next) next = { ok: false, detail: `stopped: ${halt}` };
        result.next = next ?? { ok: false, detail: `worker exited (${signal ?? code}) without a result` };
        resolve(result);
      };
      if (checking) void checking.then(finish);
      else finish();
    });
    child.send(job);
  });
}
