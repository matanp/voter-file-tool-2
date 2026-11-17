/**
 * One render in an isolated process. The parent (render.ts) forks this with a prepared
 * environment: TZ=UTC, PORT pointing at the harness's CSS endpoint, the storage R2_* variables
 * and a database URL that can't connect. It runs the deployed code from apps/report-server/dist:
 * the HTML generators, their pure helpers and generatePDFAndUpload. It never loads the service
 * entry point, enqueues jobs, queries the database or sends callbacks.
 *
 * Browser selection is the only patch: `puppeteer.launch` (the same module instance dist/utils
 * uses) is wrapped to set `headless` and `executablePath`; the production `args` pass through.
 */
import { createRequire } from 'module';
import path from 'path';
import { buildPdfCall, type DeployedModules } from './callShapes';
import { errorMessage } from './common';
import { fixtureById, RENDER_CONTEXT } from './fixtures';

export type WorkerJob = {
  fixtureId: string;
  deployedDistDir: string;
  key: string;
  headless: true | 'shell';
  executablePath: string;
};

export type WorkerMessage =
  | { type: 'launch'; requested: Record<string, unknown>; effective: Record<string, unknown> }
  | { type: 'launched'; pid: number | null; browserVersion: string }
  | { type: 'html'; bytes: number; buildMs: number }
  | { type: 'done'; ok: true; renderMs: number }
  | { type: 'done'; ok: false; error: string };

const send = (message: WorkerMessage) =>
  new Promise<void>((resolve) => {
    if (process.send) process.send(message, () => resolve());
    else resolve();
  });

/** Freezes `Date` (constructor without arguments and Date.now) while `fn` runs synchronously. */
export function withFrozenClock<T>(iso: string, fn: () => T): T {
  const RealDate = Date;
  const fixed = RealDate.parse(iso);
  class FrozenDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(fixed);
      else super(...(args as [string | number | Date]));
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FrozenDate as DateConstructor;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

type PuppeteerLike = { launch: (options?: Record<string, unknown>) => Promise<BrowserLike> };
type BrowserLike = { process(): { pid?: number } | null; version(): Promise<string> };

async function run(job: WorkerJob): Promise<void> {
  const requireDeployed = createRequire(path.join(job.deployedDistDir, 'utils.js'));

  const puppeteerModule = requireDeployed('puppeteer') as { default?: PuppeteerLike } & PuppeteerLike;
  const puppeteer = puppeteerModule.default ?? puppeteerModule;
  const originalLaunch = puppeteer.launch.bind(puppeteer);
  puppeteer.launch = async (requested: Record<string, unknown> = {}) => {
    const effective = { ...requested, headless: job.headless, executablePath: job.executablePath };
    await send({ type: 'launch', requested, effective });
    const browser = await originalLaunch(effective);
    await send({ type: 'launched', pid: browser.process()?.pid ?? null, browserVersion: await browser.version() });
    return browser;
  };

  const d: DeployedModules = {
    utils: requireDeployed('./utils.js'),
    committeeMappingHelpers: requireDeployed('./committeeMappingHelpers.js'),
    committeeRosterConfig: requireDeployed('./committeeRosterConfig.js'),
    signInSheetHelpers: requireDeployed('./signInSheetHelpers.js'),
  };

  const fixture = fixtureById(job.fixtureId);
  const buildStart = performance.now();
  const call = withFrozenClock(RENDER_CONTEXT.now, () => buildPdfCall(fixture.input, d));
  await send({ type: 'html', bytes: Buffer.byteLength(call.html), buildMs: Math.round(performance.now() - buildStart) });

  const renderStart = performance.now();
  await d.utils.generatePDFAndUpload(call.html, call.useLandscape, job.key, call.overrides);
  await send({ type: 'done', ok: true, renderMs: Math.round(performance.now() - renderStart) });
}

if (require.main === module) {
  process.once('message', (job: WorkerJob) => {
    run(job)
      .then(() => process.exit(0))
      .catch(async (error: unknown) => {
        await send({ type: 'done', ok: false, error: errorMessage(error) });
        process.exit(1);
      });
  });
}
