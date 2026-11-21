/**
 * RSS sampling for `render --measured` (ticket 20). Measuring happens on the box; judging against
 * approved thresholds happens in `verify` (see measurementChecks.ts).
 *
 * Three groups are kept apart and never mixed:
 * - harness: the render's worker Node process and the Chrome tree it launched (and anything
 *   reparented from it), attributed by parent pid, Chrome's process group and the render's TMPDIR;
 * - service: the live report-server process (PM2's pid) and its descendants;
 * - system: MemAvailable and swap in use, context only.
 * RSS sums are approximate: shared pages are counted once per process.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { isChromeCommand, processTable } from './diagnostics';

export type ProcEntry = { pid: number; ppid: number; pgid: number; start: string; rssKb: number; command: string };
export type ProcSource = () => ProcEntry[];
export type SystemMemory = { availKb: number; swapUsedKb: number | null } | null;

// ------------------------------------------------------------------ sources

let pageKb: number | null = null;
function linuxPageKb(): number {
  if (pageKb === null) {
    const r = spawnSync('getconf', ['PAGESIZE'], { encoding: 'utf8' });
    const bytes = Number.parseInt(r.stdout ?? '', 10);
    pageKb = Number.isFinite(bytes) && bytes > 0 ? bytes / 1024 : 4;
  }
  return pageKb;
}

const cmdlineCache = new Map<string, string>();

function readCmdline(pid: string, fallback: string): string {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').join(' ').trim() || fallback;
  } catch {
    return fallback;
  }
}

/** /proc on Linux: one read of /proc/<pid>/stat per process, cmdline only the first time a process is seen. */
function linuxProcs(): ProcEntry[] {
  const out: ProcEntry[] = [];
  const kb = linuxPageKb();
  for (const name of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const stat = fs.readFileSync(`/proc/${name}/stat`, 'utf8');
      const close = stat.lastIndexOf(')');
      const comm = stat.slice(stat.indexOf('(') + 1, close);
      // Fields after "(comm) ": state ppid pgrp ... starttime is field 22, rss field 24 (1-based).
      const f = stat.slice(close + 2).split(' ');
      const start = f[19] ?? '';
      const key = `${name}:${start}`;
      const command = cmdlineCache.get(key) ?? readCmdline(name, comm);
      cmdlineCache.set(key, command);
      out.push({ pid: Number(name), ppid: Number(f[1]), pgid: Number(f[2]), start, rssKb: Number(f[21]) * kb, command });
    } catch {
      // exited between readdir and read
    }
  }
  return out;
}

/** macOS (local runs): ps. Slower, so expect larger sampling gaps; they are recorded. */
const psProcs: ProcSource = () => processTable().map((p) => ({ pid: p.pid, ppid: p.ppid, pgid: p.pgid, start: '', rssKb: p.rssKb, command: p.command }));

export const defaultProcSource = (): ProcSource => (fs.existsSync('/proc/self/stat') ? linuxProcs : psProcs);

export function systemMemory(): SystemMemory {
  if (fs.existsSync('/proc/meminfo')) {
    const values: Record<string, number> = {};
    for (const line of fs.readFileSync('/proc/meminfo', 'utf8').split('\n')) {
      const m = /^(MemAvailable|SwapTotal|SwapFree):\s+(\d+) kB/.exec(line);
      if (m) values[m[1]!] = Number(m[2]);
    }
    if (values.MemAvailable === undefined) return null;
    return { availKb: values.MemAvailable, swapUsedKb: values.SwapTotal === undefined || values.SwapFree === undefined ? null : values.SwapTotal - values.SwapFree };
  }
  return { availKb: Math.round(os.freemem() / 1024), swapUsedKb: null };
}

// ------------------------------------------------------------------ sampler

export type Phase = 'idle' | 'render';
/** One sample: ms since the phase started, then KB; null when not measurable. */
export type SampleRow = [t: number, workerKb: number | null, chromeKb: number | null, serviceKb: number | null, availKb: number | null, swapUsedKb: number | null];

export type Stats = { peakKb: number | null; medianKb: number | null };

export type PhaseSummary = {
  phase: Phase;
  startedAt: string;
  durationMs: number;
  samples: number;
  intervalMs: number;
  /** Actual time between samples; the event loop or a slow ps can stretch it. */
  gaps: { maxMs: number; overTwiceInterval: number };
  worker: Stats;
  chrome: Stats;
  /** worker + chrome, summed per sample. */
  harness: Stats;
  service: Stats;
  minAvailKb: number | null;
  maxSwapUsedKb: number | null;
  /** Chrome processes seen in this phase that are neither the harness's nor the service tree's. */
  foreignChrome: { pid: number; command: string }[];
  /** Chrome processes seen in the service's tree: production rendering overlapped this phase. */
  serviceChromeSeen: boolean;
  /** Samples in which the service's PM2 pid was gone (restarted or stopped). 0 when no pid was known. */
  serviceMissingSamples: number;
};

export type ProcessPeak = { pid: number; start: string; role: 'worker' | 'chrome'; command: string; peakKb: number; firstMs: number; lastMs: number };

type Tracked = { pid: number; start: string; role: 'worker' | 'chrome'; command: string; peakKb: number; firstMs: number; lastMs: number };

export type SamplerOptions = {
  intervalMs: number;
  source?: ProcSource;
  system?: () => SystemMemory;
  servicePid: number | null;
  /** The render's TMPDIR: Puppeteer puts Chrome's profile there, so it is in Chrome's command line. */
  marker: string;
  now?: () => number;
};

/**
 * Samples one measured case: an idle phase (no worker yet), then the render phase from fork to
 * worker exit. `tick()` is synchronous and public so tests can drive it.
 */
export class MemorySampler {
  private readonly source: ProcSource;
  private readonly system: () => SystemMemory;
  private readonly now: () => number;
  private readonly owned = new Map<string, Tracked>();
  private workerPid: number | null = null;
  private chromePgid: number | null = null;
  private phase: Phase | null = null;
  private phaseStart = 0;
  private phaseStartedAt = '';
  private rows: SampleRow[] = [];
  private foreign = new Map<number, string>();
  private serviceChrome = false;
  private timer: NodeJS.Timeout | null = null;
  readonly phases: { summary: PhaseSummary; rows: SampleRow[] }[] = [];

  constructor(private readonly opts: SamplerOptions) {
    this.source = opts.source ?? defaultProcSource();
    this.system = opts.system ?? systemMemory;
    this.now = opts.now ?? (() => performance.now());
  }

  setWorker(pid: number | undefined) {
    if (pid) this.workerPid = pid;
  }

  setChromePgid(pgid: number | null) {
    if (pgid) this.chromePgid = pgid;
  }

  start(phase: Phase, { timer = true } = {}) {
    this.stop();
    this.phase = phase;
    this.phaseStart = this.now();
    this.phaseStartedAt = new Date().toISOString();
    this.rows = [];
    this.foreign = new Map();
    this.serviceChrome = false;
    this.tick();
    if (timer) this.schedule();
  }

  private schedule() {
    this.timer = setTimeout(() => {
      this.tick();
      this.schedule();
    }, this.opts.intervalMs);
  }

  /** Ends the current phase, if any, and records its summary. */
  stop(): PhaseSummary | null {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.phase) return null;
    this.tick();
    const summary = summarizePhase(this.phase, this.phaseStartedAt, this.rows, this.opts.intervalMs, this.foreign, this.serviceChrome, this.opts.servicePid !== null);
    this.phases.push({ summary, rows: this.rows });
    this.phase = null;
    return summary;
  }

  /** Every process attributed to the harness during this case, with its own peak. */
  processPeaks(): ProcessPeak[] {
    return [...this.owned.values()].map((p) => ({ ...p, command: p.command.slice(0, 160) }));
  }

  tick() {
    if (!this.phase) return;
    const t = Math.round(this.now() - this.phaseStart);
    let procs: ProcEntry[];
    try {
      procs = this.source();
    } catch {
      return; // a missed sample shows up as a gap
    }
    const key = (p: ProcEntry) => `${p.pid}:${p.start}`;
    const byPid = new Map(procs.map((p) => [p.pid, p]));

    // Attribute to the harness: the worker, its descendants, Chrome's group, and the TMPDIR marker.
    // Once attributed, a process stays attributed (by pid and start time) even after reparenting.
    const ownedNow = new Set<number>();
    for (const p of procs) {
      if (p.pid === process.pid) continue;
      const known = this.owned.has(key(p));
      const isWorker = p.pid === this.workerPid;
      const inGroup = this.chromePgid !== null && p.pgid === this.chromePgid;
      const marked = p.command.includes(this.opts.marker);
      if (known || isWorker || inGroup || marked) ownedNow.add(p.pid);
    }
    for (let changed = true; changed; ) {
      changed = false;
      for (const p of procs) {
        if (!ownedNow.has(p.pid) && ownedNow.has(p.ppid) && p.pid !== process.pid) {
          ownedNow.add(p.pid);
          changed = true;
        }
      }
    }

    let workerKb: number | null = null;
    let chromeKb = 0;
    for (const pid of ownedNow) {
      const p = byPid.get(pid)!;
      const role = pid === this.workerPid ? 'worker' : 'chrome';
      const tracked = this.owned.get(key(p)) ?? { pid, start: p.start, role, command: p.command, peakKb: 0, firstMs: t, lastMs: t };
      tracked.peakKb = Math.max(tracked.peakKb, p.rssKb);
      tracked.lastMs = t;
      this.owned.set(key(p), tracked);
      if (role === 'worker') workerKb = p.rssKb;
      else chromeKb += p.rssKb;
    }

    // The service tree, by parent pid from PM2's pid. Never includes harness processes.
    let serviceKb: number | null = null;
    const service = new Set<number>();
    if (this.opts.servicePid !== null && byPid.has(this.opts.servicePid)) {
      service.add(this.opts.servicePid);
      for (let changed = true; changed; ) {
        changed = false;
        for (const p of procs) {
          if (!service.has(p.pid) && service.has(p.ppid) && !ownedNow.has(p.pid)) {
            service.add(p.pid);
            changed = true;
          }
        }
      }
      serviceKb = 0;
      for (const pid of service) {
        const p = byPid.get(pid)!;
        serviceKb += p.rssKb;
        if (pid !== this.opts.servicePid && isChromeCommand(p.command)) this.serviceChrome = true;
      }
    }
    for (const p of procs) {
      if (!ownedNow.has(p.pid) && !service.has(p.pid) && p.pid !== process.pid && isChromeCommand(p.command)) {
        this.foreign.set(p.pid, p.command.slice(0, 160));
      }
    }

    const sys = this.system();
    const harnessSeen = this.phase === 'render';
    this.rows.push([t, harnessSeen ? workerKb : null, harnessSeen ? chromeKb : null, serviceKb, sys?.availKb ?? null, sys?.swapUsedKb ?? null]);
  }
}

// ------------------------------------------------------------------ summaries

export function stats(values: (number | null)[]): Stats {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (!v.length) return { peakKb: null, medianKb: null };
  const mid = Math.floor(v.length / 2);
  return { peakKb: v[v.length - 1]!, medianKb: v.length % 2 ? v[mid]! : Math.round((v[mid - 1]! + v[mid]!) / 2) };
}

export function summarizePhase(
  phase: Phase,
  startedAt: string,
  rows: SampleRow[],
  intervalMs: number,
  foreign: Map<number, string>,
  serviceChromeSeen: boolean,
  servicePidKnown = false,
): PhaseSummary {
  let maxGap = 0;
  let over = 0;
  for (let i = 1; i < rows.length; i++) {
    const gap = rows[i]![0] - rows[i - 1]![0];
    maxGap = Math.max(maxGap, gap);
    if (gap > 2 * intervalMs) over++;
  }
  const col = (i: number) => rows.map((r) => r[i] as number | null);
  const harness = rows.map((r) => (r[1] === null && r[2] === null ? null : (r[1] ?? 0) + (r[2] ?? 0)));
  const avail = col(4).filter((x): x is number => x !== null);
  const swap = col(5).filter((x): x is number => x !== null);
  return {
    phase,
    startedAt,
    durationMs: rows.length ? rows[rows.length - 1]![0] : 0,
    samples: rows.length,
    intervalMs,
    gaps: { maxMs: maxGap, overTwiceInterval: over },
    worker: stats(col(1)),
    chrome: stats(col(2)),
    harness: stats(harness),
    service: stats(col(3)),
    minAvailKb: avail.length ? Math.min(...avail) : null,
    maxSwapUsedKb: swap.length ? Math.max(...swap) : null,
    foreignChrome: [...foreign].map(([pid, command]) => ({ pid, command })),
    serviceChromeSeen,
    serviceMissingSamples: servicePidKnown ? rows.filter((r) => r[3] === null).length : 0,
  };
}
