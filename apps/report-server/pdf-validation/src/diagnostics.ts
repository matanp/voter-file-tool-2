import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { REPO_DIR, SERVER_DIR, sha256, sha256File } from './common';

/** A diagnostic that could not be collected says so, with the reason, instead of disappearing. */
export type Unavailable = { unavailable: string };
export type Maybe<T> = T | Unavailable;
export const isUnavailable = (v: unknown): v is Unavailable =>
  typeof v === 'object' && v !== null && 'unavailable' in v && Object.keys(v).length === 1;

function run(cmd: string, args: string[], cwd = REPO_DIR): { ok: boolean; out: string; err: string } {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 30_000 });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? r.error?.message ?? '').trim() };
}

// ------------------------------------------------------------------ revisions

export type GitRevision = {
  commit: string;
  commitTime: string;
  branch: string;
  /** `git status --porcelain` lines, minus the harness's own ignored output. */
  dirty: string[];
};

export function gitRevision(dir = REPO_DIR): Maybe<GitRevision> {
  const commit = run('git', ['rev-parse', 'HEAD'], dir);
  if (!commit.ok) return { unavailable: `git rev-parse failed: ${commit.err}` };
  return {
    commit: commit.out,
    commitTime: run('git', ['log', '-1', '--format=%cI'], dir).out,
    branch: run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], dir).out,
    dirty: run('git', ['status', '--porcelain'], dir).out.split('\n').filter(Boolean),
  };
}

/** sha256 over sorted relative paths and file hashes. */
export function treeHash(dir: string, filter: (rel: string) => boolean = () => true): Maybe<{ sha256: string; files: number }> {
  if (!fs.existsSync(dir)) return { unavailable: `${dir} does not exist` };
  const entries: string[] = [];
  const walk = (d: string) => {
    for (const name of fs.readdirSync(d).sort()) {
      const full = path.join(d, name);
      const rel = path.relative(dir, full);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (filter(rel)) entries.push(`${rel}\0${sha256File(full)}`);
    }
  };
  walk(dir);
  return { sha256: sha256(entries.join('\n')), files: entries.length };
}

function newestMtime(dirs: string[], test: (file: string) => boolean): { file: string; mtimeMs: number }[] {
  const out: { file: string; mtimeMs: number }[] = [];
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const name of fs.readdirSync(d)) {
      if (name === 'node_modules' || name === 'dist' || name === '__tests__') continue;
      const full = path.join(d, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (test(full)) out.push({ file: path.relative(REPO_DIR, full), mtimeMs: st.mtimeMs });
    }
  };
  dirs.forEach(walk);
  return out;
}

export type DeployedBuild = {
  distDir: string;
  distTree: Maybe<{ sha256: string; files: number }>;
  distBuiltAt: string | null;
  /**
   * Sources the deployed build is compiled from that are newer than dist/index.js: the
   * deploy pulls, then builds, so any entry means dist may not match the checked-out commit.
   */
  sourcesNewerThanDist: string[];
  css: { path: string; sha256: string; bytes: number; builtAt: string } | Unavailable;
  cssSourceSha256: Maybe<string>;
};

export function deployedBuild(distDir: string): DeployedBuild {
  const index = path.join(distDir, 'index.js');
  const builtAt = fs.existsSync(index) ? fs.statSync(index).mtimeMs : null;
  const sourceDirs = [path.join(SERVER_DIR, 'src'), ...['shared-validators', 'shared-prisma', 'voter-import-processor'].map((p) => path.join(REPO_DIR, 'packages', p, 'src'))];
  const newer =
    builtAt === null ? [] : newestMtime(sourceDirs, (f) => /\.(ts|tsx|css)$/.test(f)).filter((e) => e.mtimeMs > builtAt).map((e) => e.file);
  const cssPath = path.join(SERVER_DIR, 'public', 'tailwind.css');
  const cssSource = path.join(SERVER_DIR, 'src', 'styles', 'tailwind.css');
  return {
    distDir,
    distTree: treeHash(distDir, (rel) => rel.endsWith('.js')),
    distBuiltAt: builtAt === null ? null : new Date(builtAt).toISOString(),
    sourcesNewerThanDist: newer.sort(),
    css: fs.existsSync(cssPath)
      ? { path: cssPath, sha256: sha256File(cssPath), bytes: fs.statSync(cssPath).size, builtAt: fs.statSync(cssPath).mtime.toISOString() }
      : { unavailable: `${cssPath} is missing: the deployed build has no CSS` },
    cssSourceSha256: fs.existsSync(cssSource) ? sha256File(cssSource) : { unavailable: `${cssSource} is missing` },
  };
}

// ------------------------------------------------------------------ instance

function meminfo(): Maybe<Record<string, number>> {
  if (!fs.existsSync('/proc/meminfo')) return { unavailable: '/proc/meminfo not present (not Linux)' };
  const out: Record<string, number> = {};
  for (const line of fs.readFileSync('/proc/meminfo', 'utf8').split('\n')) {
    const m = /^(MemTotal|MemAvailable|SwapTotal|SwapFree):\s+(\d+) kB/.exec(line);
    if (m) out[`${m[1]}Kb`] = Number(m[2]);
  }
  return out;
}

export function instanceResources() {
  return {
    platform: `${os.platform()} ${os.arch()}`,
    kernel: os.release(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    totalMemMb: Math.round(os.totalmem() / 2 ** 20),
    freeMemMb: Math.round(os.freemem() / 2 ** 20),
    meminfo: meminfo(),
    uptimeSeconds: Math.round(os.uptime()),
    node: process.version,
  };
}

// ------------------------------------------------------------------ service (PM2) state

export type ServiceState = {
  pid: number | null;
  status: string;
  restarts: number;
  unstableRestarts: number;
  uptimeSince: string | null;
  memoryBytes: number | null;
  outLogPath: string | null;
};

type Pm2Entry = {
  name: string;
  pid?: number;
  monit?: { memory?: number };
  pm2_env?: { status?: string; restart_time?: number; unstable_restarts?: number; pm_uptime?: number; pm_out_log_path?: string };
};

export function serviceState(name = 'report-server'): Maybe<ServiceState> {
  const r = run('pm2', ['jlist']);
  if (!r.ok) return { unavailable: `pm2 jlist failed: ${r.err || 'pm2 not on PATH'}` };
  let list: Pm2Entry[];
  try {
    list = JSON.parse(r.out.slice(r.out.indexOf('['))) as Pm2Entry[];
  } catch {
    return { unavailable: 'pm2 jlist output was not JSON' };
  }
  const app = list.find((p) => p.name === name);
  if (!app) return { unavailable: `PM2 has no process named ${name}` };
  const env = app.pm2_env ?? {};
  return {
    pid: app.pid || null,
    status: env.status ?? 'unknown',
    restarts: env.restart_time ?? 0,
    unstableRestarts: env.unstable_restarts ?? 0,
    uptimeSince: env.pm_uptime ? new Date(env.pm_uptime).toISOString() : null,
    memoryBytes: app.monit?.memory ?? null,
    outLogPath: env.pm_out_log_path ?? null,
  };
}

/** Kernel OOM-killer lines since `since`: journalctl first, then dmesg. */
export function oomEvents(since: Date): Maybe<{ source: string; lines: string[] }> {
  const pattern = /out of memory|oom-kill|oom_reaper|killed process/i;
  const j = run('journalctl', ['-k', '--no-pager', '-q', '-o', 'short-iso', `--since=@${Math.floor(since.getTime() / 1000)}`]);
  if (j.ok) return { source: 'journalctl -k', lines: j.out.split('\n').filter((l) => pattern.test(l)) };
  const d = run('dmesg', ['--time-format', 'iso']);
  if (d.ok) {
    const lines = d.out.split('\n').filter((l) => pattern.test(l) && new Date(l.slice(0, 25)).getTime() >= since.getTime());
    return { source: 'dmesg', lines };
  }
  return { unavailable: `journalctl: ${j.err || 'failed'}; dmesg: ${d.err || 'failed'}` };
}

/** Reads PM2's out log from a byte offset, so the harness can see jobs the live service ran meanwhile. */
export class ServiceLog {
  private offset = 0;
  constructor(readonly file: string | null) {
    if (file && fs.existsSync(file)) this.offset = fs.statSync(file).size;
  }

  /** Counts of the service's job log lines written since the last call. */
  activitySince(): Maybe<Record<string, number>> {
    if (!this.file) return { unavailable: 'no PM2 out log path' };
    if (!fs.existsSync(this.file)) return { unavailable: `${this.file} does not exist` };
    const size = fs.statSync(this.file).size;
    if (size < this.offset) this.offset = 0; // rotated
    const fd = fs.openSync(this.file, 'r');
    const buf = Buffer.alloc(size - this.offset);
    fs.readSync(fd, buf, 0, buf.length, this.offset);
    fs.closeSync(fd);
    this.offset = size;
    const text = buf.toString('utf8');
    const count = (re: RegExp) => (text.match(re) ?? []).length;
    return {
      receivedRequest: count(/received request/g),
      generatingPdf: count(/generating pdf/g),
      uploads: count(/Upload successful/g),
      queueErrors: count(/Queue worker error/g),
    };
  }
}

// ------------------------------------------------------------------ processes

export type ProcessInfo = { pid: number; ppid: number; pgid: number; rssKb: number; command: string };

export function processTable(): ProcessInfo[] {
  const r = run('ps', ['-axo', 'pid=,ppid=,pgid=,rss=,command=']);
  if (!r.ok) return [];
  return r.out
    .split('\n')
    .map((line) => /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), pgid: Number(m[3]), rssKb: Number(m[4]), command: m[5]!.slice(0, 160) }));
}

const isChrome = (p: ProcessInfo) => /chrome|headless_shell|Chromium/i.test(p.command) && !/crashpad/i.test(p.command);

/** Chrome processes that the harness did not start: the live service's, or anything else's. */
export function foreignChrome(ownedPgids: Set<number>): ProcessInfo[] {
  return processTable().filter((p) => isChrome(p) && !ownedPgids.has(p.pgid) && p.pid !== process.pid);
}

/** Processes still alive in a process group the harness owns (Puppeteer starts Chrome as a group leader). */
export const processesInGroup = (pgid: number): ProcessInfo[] => processTable().filter((p) => p.pgid === pgid);

export async function httpOk(url: string, timeoutMs = 5_000): Promise<Maybe<{ status: number }>> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    await res.arrayBuffer();
    return { status: res.status };
  } catch (error) {
    return { unavailable: `GET ${url} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}
