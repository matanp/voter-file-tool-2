/**
 * verify's judgement of `--measured` and `--failure-scenarios` evidence (ticket 20). render only
 * records; this compares measured peaks with approved thresholds and turns scenario results into
 * checks, under the same pass / needs-review / fail precedence as everything else.
 */
import { MEMORY_METRICS, findThreshold, type Approvals, type MemoryMetric } from './approvals';
import { worstStatus, type BrowserName, type Check, type Status } from './common';
import type { RunManifest } from './manifest';
import { MEASUREMENTS_NAME, type MeasuredRender, type MeasurementsFile } from './measurements';
import { stats } from './memory';
import type { FailureScenariosFile, ScenarioResult } from './scenarios';

/** A sampling gap this long could hide a peak, so the comparison needs a look. */
export const MAX_TRUSTED_GAP_MS = 1_000;

export type MemoryGroup = {
  fixtureId: string;
  fixtureHash: string;
  browser: BrowserName;
  browserBuildId: string;
  browserVersion: string | null;
  repetitions: number;
  ok: number;
  interfered: number;
  /** Per-repetition sampled peaks, then their median and max. */
  peaks: Record<MemoryMetric, { perRepetition: (number | null)[]; medianKb: number | null; maxKb: number | null }>;
  idleServiceMedianKb: number | null;
  minAvailKb: number | null;
  maxSwapUsedKb: number | null;
  maxGapMs: number;
  thresholds: { metric: MemoryMetric; maxKb: number | null }[];
  status: Status;
  notes: string[];
};

const peakOf = (r: MeasuredRender, metric: MemoryMetric): number | null => (metric === 'chromePeakKb' ? r.render?.chrome.peakKb : r.render?.harness.peakKb) ?? null;
const mib = (kb: number | null) => (kb === null ? '?' : `${Math.round(kb / 1024)} MiB`);

export function groupMeasurements(m: MeasurementsFile): Omit<MemoryGroup, 'thresholds' | 'status' | 'notes'>[] {
  const keys = [...new Set(m.renders.map((r) => `${r.fixtureId}\0${r.browser}`))];
  return keys.map((k) => {
    const reps = m.renders.filter((r) => `${r.fixtureId}\0${r.browser}` === k).sort((a, b) => a.repetition - b.repetition);
    const first = reps[0]!;
    const peaks = Object.fromEntries(
      MEMORY_METRICS.map((metric) => {
        const perRepetition = reps.map((r) => (r.status === 'ok' ? peakOf(r, metric) : null));
        const s = stats(perRepetition);
        return [metric, { perRepetition, medianKb: s.medianKb, maxKb: s.peakKb }];
      }),
    ) as MemoryGroup['peaks'];
    const avail = reps.flatMap((r) => [r.idle?.minAvailKb, r.render?.minAvailKb]).filter((x): x is number => typeof x === 'number');
    const swap = reps.map((r) => r.render?.maxSwapUsedKb).filter((x): x is number => typeof x === 'number');
    return {
      fixtureId: first.fixtureId,
      fixtureHash: first.fixtureHash,
      browser: first.browser,
      browserBuildId: first.browserBuildId,
      browserVersion: first.browserVersion,
      repetitions: reps.length,
      ok: reps.filter((r) => r.status === 'ok').length,
      interfered: reps.filter((r) => r.interference.length).length,
      peaks,
      idleServiceMedianKb: stats(reps.map((r) => r.idle?.service.medianKb ?? null)).medianKb,
      minAvailKb: avail.length ? Math.min(...avail) : null,
      maxSwapUsedKb: swap.length ? Math.max(...swap) : null,
      maxGapMs: Math.max(0, ...reps.map((r) => r.render?.gaps.maxMs ?? 0)),
    };
  });
}

export function memoryChecks(manifest: Pick<RunManifest, 'measured' | 'browsers'>, measurements: MeasurementsFile | null, approvals: Approvals): { checks: Check[]; groups: MemoryGroup[] } {
  const plan = manifest.measured;
  if (!plan) return { checks: [], groups: [] };
  if (!measurements) return { checks: [{ id: 'memory-measurements', status: 'needs-review', detail: `--measured run without a verified ${MEASUREMENTS_NAME}` }], groups: [] };

  const checks: Check[] = [];
  const groups: MemoryGroup[] = groupMeasurements(measurements).map((g) => {
    const notes: string[] = [];
    const statuses: Status[] = [];
    if (g.ok < g.repetitions) {
      statuses.push('fail');
      notes.push(`${g.repetitions - g.ok} of ${g.repetitions} repetition(s) failed`);
    }
    if (g.interfered) {
      statuses.push('needs-review');
      notes.push(`${g.interfered} repetition(s) overlapped production work; repeat them if the numbers matter`);
    }
    if (g.maxGapMs > MAX_TRUSTED_GAP_MS) {
      statuses.push('needs-review');
      notes.push(`a ${g.maxGapMs} ms sampling gap could hide a peak`);
    }
    const thresholds = MEMORY_METRICS.map((metric) => {
      const t = findThreshold(approvals, { fixtureId: g.fixtureId, fixtureHash: g.fixtureHash, browser: g.browser, browserBuildId: g.browserBuildId, metric });
      const measured = g.peaks[metric].maxKb;
      if (!t) {
        statuses.push('needs-review');
        notes.push(`no approved ${metric} threshold for ${g.browser}@${g.browserBuildId}`);
      } else if (measured !== null && measured > t.maxKb) {
        statuses.push('fail');
        notes.push(`${metric} ${mib(measured)} is over the approved ${mib(t.maxKb)}`);
      } else if (measured === null) {
        statuses.push('needs-review');
        notes.push(`${metric} was not measured`);
      }
      return { metric, maxKb: t?.maxKb ?? null };
    });
    const status = worstStatus(statuses);
    return { ...g, thresholds, status, notes };
  });

  const expected = plan.fixtures.flatMap((f) => manifest.browsers.map((b) => ({ f, b })));
  const short = expected.filter(({ f, b }) => (groups.find((g) => g.fixtureId === f && g.browser === b)?.repetitions ?? 0) < plan.repetitions).map(({ f, b }) => `${f}.${b}`);
  checks.push(short.length ? { id: 'memory-complete', status: 'fail', detail: `fewer than ${plan.repetitions} repetitions: ${short.join(', ')}` } : { id: 'memory-complete', status: 'pass', detail: `${plan.repetitions} repetition(s) of ${plan.fixtures.length} fixture(s) per browser` });
  for (const g of groups) {
    const c = g.peaks.chromePeakKb;
    const h = g.peaks.harnessPeakKb;
    checks.push({ id: `memory:${g.fixtureId}.${g.browser}`, status: g.status, detail: `chrome peak median ${mib(c.medianKb)}, max ${mib(c.maxKb)}; harness max ${mib(h.maxKb)}${g.notes.length ? `; ${g.notes.join('; ')}` : ''}` });
  }
  return { checks, groups };
}

export function scenarioChecks(manifest: Pick<RunManifest, 'failureScenarios' | 'browsers'>, file: FailureScenariosFile | null): Check[] {
  const plan = manifest.failureScenarios;
  if (!plan) return [];
  if (!file) return [{ id: 'failure-scenarios', status: 'needs-review', detail: '--failure-scenarios run without a verified failure-scenarios.json' }];
  const checks: Check[] = [];
  const missing = manifest.browsers.flatMap((b) => plan.scenarios.filter((s) => !file.results.some((r) => r.browser === b && r.scenario === s)).map((s) => `${s}.${b}`));
  if (missing.length) checks.push({ id: 'failure-scenarios', status: 'fail', detail: `not run: ${missing.join(', ')}` });
  for (const r of file.results) checks.push(scenarioCheck(r));
  return checks;
}

function scenarioCheck(r: ScenarioResult): Check {
  const id = `scenario:${r.scenario}.${r.browser}`;
  if (r.status === 'ok') return { id, status: 'pass', detail: `settled in ${r.scenarioMs} ms with the original error; next report ok; no leftover Chrome` };
  const failed = r.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`);
  const note =
    r.scenario === 'close-no-page' && r.browser === 'shell' && r.checks.some((c) => c.id === 'bounded' && !c.ok)
      ? ' (expected on a build without the bounded browser.close() from PR #148: this is the hang it fixes)'
      : '';
  return { id, status: 'fail', detail: `${failed.join('; ')}${note}` };
}
