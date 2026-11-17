import { spawnSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import { BROWSER_HEADLESS, BROWSER_PRODUCT, type BrowserName } from './common';

export type ResolvedBrowser = {
  browser: BrowserName;
  product: 'chrome' | 'chrome-headless-shell';
  headless: true | 'shell';
  /** The build the deployed Puppeteer pins. */
  buildId: string;
  executablePath: string;
  cacheDir: string;
  harnessInstalled: boolean;
};

type BrowsersApi = {
  computeExecutablePath(options: { browser: string; buildId: string; cacheDir: string }): string;
};

/** @puppeteer/browsers doesn't export its package.json, so walk up from its entry point. */
function packageJsonOf(entry: string, name: string): string {
  for (let dir = path.dirname(entry); dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg) && (JSON.parse(fs.readFileSync(pkg, 'utf8')) as { name?: string }).name === name) return pkg;
  }
  throw new Error(`Could not find ${name}'s package.json above ${entry}`);
}

/** The deployed Puppeteer's pinned browser builds, and @puppeteer/browsers from beside it. */
export function deployedPuppeteer(deployedDistDir: string) {
  const fromDist = createRequire(path.join(deployedDistDir, 'utils.js'));
  const puppeteerPkg = fromDist.resolve('puppeteer/package.json');
  const fromPuppeteer = createRequire(puppeteerPkg);
  const corePkg = fromPuppeteer.resolve('puppeteer-core/package.json');
  const fromCore = createRequire(corePkg);
  const revisions = fromCore('puppeteer-core/lib/cjs/puppeteer/revisions.js') as { PUPPETEER_REVISIONS: Record<string, string> };
  const browsersPkg = packageJsonOf(fromCore.resolve('@puppeteer/browsers'), '@puppeteer/browsers');
  return {
    puppeteerVersion: (JSON.parse(fs.readFileSync(puppeteerPkg, 'utf8')) as { version: string }).version,
    puppeteerCoreVersion: (JSON.parse(fs.readFileSync(corePkg, 'utf8')) as { version: string }).version,
    browsersVersion: (JSON.parse(fs.readFileSync(browsersPkg, 'utf8')) as { version: string }).version,
    revisions: revisions.PUPPETEER_REVISIONS,
    browsersApi: fromCore('@puppeteer/browsers') as BrowsersApi,
    puppeteerBin: path.join(path.dirname(puppeteerPkg), 'lib/cjs/puppeteer/node/cli.js'),
  };
}

/** The service's browser cache: read from, never installed into. */
export const serviceCacheDir = (): string => process.env.PUPPETEER_CACHE_DIR || path.join(os.homedir(), '.cache', 'puppeteer');

/**
 * Finds the selected browser at the deployed Puppeteer's pinned build: the service's cache
 * first, then the harness cache. If neither has it, installs it into the harness cache with
 * `puppeteer browsers install`, scoped by PUPPETEER_CACHE_DIR to that one command.
 */
export function resolveBrowser(
  browser: BrowserName,
  opts: { deployedDistDir: string; harnessCacheDir: string; allowInstall: boolean; log: (line: string) => void },
): ResolvedBrowser {
  const pptr = deployedPuppeteer(opts.deployedDistDir);
  const product = BROWSER_PRODUCT[browser];
  const buildId = pptr.revisions[product];
  if (!buildId) throw new Error(`Deployed Puppeteer ${pptr.puppeteerVersion} pins no ${product} build`);
  const at = (cacheDir: string) => pptr.browsersApi.computeExecutablePath({ browser: product, buildId, cacheDir });
  const base = { browser, product, headless: BROWSER_HEADLESS[browser], buildId };

  for (const cacheDir of [serviceCacheDir(), opts.harnessCacheDir]) {
    const executablePath = at(cacheDir);
    if (fs.existsSync(executablePath)) return { ...base, executablePath, cacheDir, harnessInstalled: cacheDir === opts.harnessCacheDir };
  }
  if (!opts.allowInstall) throw new Error(`${product}@${buildId} is not installed and --no-install was given`);

  opts.log(`Installing ${product}@${buildId} into the harness cache ${opts.harnessCacheDir}`);
  fs.mkdirSync(opts.harnessCacheDir, { recursive: true });
  const result = spawnSync(process.execPath, [pptr.puppeteerBin, 'browsers', 'install', `${product}@${buildId}`], {
    env: { ...process.env, PUPPETEER_CACHE_DIR: opts.harnessCacheDir },
    encoding: 'utf8',
    timeout: 10 * 60_000,
  });
  opts.log(`${result.stdout ?? ''}${result.stderr ?? ''}`.trim());
  const executablePath = at(opts.harnessCacheDir);
  if (result.status !== 0 || !fs.existsSync(executablePath)) {
    throw new Error(`Installing ${product}@${buildId} failed (exit ${String(result.status)}): ${result.stderr || result.error?.message || ''}`);
  }
  return { ...base, executablePath, cacheDir: opts.harnessCacheDir, harnessInstalled: true };
}
