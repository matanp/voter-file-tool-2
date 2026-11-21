import fs from 'fs';
import path from 'path';
import { CHECKLIST_FILE, sha256File, type Status } from './common';
import { isUnavailable } from './diagnostics';
import type { ItemResult } from './evaluate';
import { fixtureById } from './fixtures';
import type { Inspection } from './inspect';
import type { RunManifest } from './manifest';
import type { MemoryGroup } from './measurementChecks';
import type { VerifyResults } from './verify';

const ICON: Record<Status, string> = { pass: 'PASS', fail: 'FAIL', 'needs-review': 'REVIEW' };
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** summary.md: the human-readable twin of results.json, generated from the same object. */
export function writeSummary(runDir: string, manifest: RunManifest, results: VerifyResults, inspections: Map<string, Inspection>): void {
  const rev = manifest.deployed.revision;
  const lines: string[] = [];
  lines.push(`# PDF validation ${results.runId}: ${ICON[results.status]}`);
  lines.push('');
  lines.push(`${results.counts.pass} pass, ${results.counts['needs-review']} needs-review, ${results.counts.fail} fail across ${results.items.length} render(s). Exit code ${results.status === 'pass' ? 0 : results.status === 'fail' ? 1 : 2}.`);
  lines.push('');
  lines.push('| | |');
  lines.push('| --- | --- |');
  const row = (k: string, v: string) => lines.push(`| ${k} | ${cell(v)} |`);
  row('Mode / browsers', `${manifest.mode} / ${manifest.browsers.join(', ')}${manifest.fixtureFilter ? ` (fixtures: ${manifest.fixtureFilter.join(', ')})` : ''}`);
  row('Rendered', `${manifest.startedAt} → ${manifest.finishedAt ?? '?'}`);
  row('Deployed commit', isUnavailable(rev) ? rev.unavailable : `${rev.commit} (${rev.branch})${rev.dirty.length ? `, ${rev.dirty.length} local change(s)` : ''}`);
  row('Deployed dist / CSS', `${isUnavailable(manifest.deployed.build.distTree) ? 'unavailable' : manifest.deployed.build.distTree.sha256.slice(0, 12)} / ${manifest.css.sha256.slice(0, 12)}`);
  row('Harness (box)', isUnavailable(manifest.harness.revision) ? manifest.harness.revision.unavailable : `${manifest.harness.revision.commit.slice(0, 12)}, src ${isUnavailable(manifest.harness.srcTree) ? '?' : manifest.harness.srcTree.sha256.slice(0, 12)}, fixtures v${manifest.harness.fixtureManifestVersion}`);
  row('Harness (verify)', isUnavailable(results.verifier.revision) ? results.verifier.revision.unavailable : results.verifier.revision.commit.slice(0, 12));
  row('Node / Puppeteer', `${manifest.versions.node} / ${manifest.versions.puppeteer}`);
  row(
    'Browsers',
    manifest.browsersResolved
      .map((b) => `${b.browser}: ${b.product}@${b.buildId}${b.harnessInstalled ? ' (harness-installed)' : ''}, reports ${manifest.renders.find((r) => r.browser === b.browser)?.browserVersion ?? '?'}`)
      .join('; '),
  );
  row('Instance', `${String(manifest.instance.platform)}, ${String(manifest.instance.cpus)} CPU, ${String(manifest.instance.totalMemMb)} MB`);
  row('Storage', `${manifest.storage.bucket} (${manifest.storage.source}), ${manifest.storage.prefix}`);
  row('Comparison', results.image ? `${results.image.tag} ${results.image.imageId.slice(0, 19)} ${results.image.platform}; Poppler ${results.tools?.poppler ?? '?'} (${results.tools?.popplerPackage ?? '?'}); 144 DPI` : 'not run');
  row('Approvals file', results.approvalsSha256 ? results.approvalsSha256.slice(0, 12) : 'none');
  row('LLM review', results.llmReview);
  lines.push('');
  lines.push('**Not validated by this harness:** the per-job-type call wiring in `pdf-validation/src/callShapes.ts` mirrors `processJob` in `src/index.ts` and can drift from it. The frontend, job queue, database queries and completion callbacks are out of scope.');
  lines.push('');

  lines.push('## Run checks');
  lines.push('');
  for (const c of results.runChecks) lines.push(`- **${ICON[c.status]}** \`${c.id}\`: ${c.detail}`);
  const interference = manifest.renders.filter((r) => r.interference.foreignChrome.length || (!isUnavailable(r.interference.serviceActivity) && Object.values(r.interference.serviceActivity).some((n) => n > 0)));
  lines.push(
    `- Overlapping production work: ${interference.length ? `${interference.length} render(s) overlapped other Chrome processes or service job logs (${interference.map((r) => `${r.fixtureId}.${r.browser}`).slice(0, 6).join(', ')}). Recorded for context; it doesn't affect PDF checks.` : 'none observed'}`,
  );
  lines.push('');

  lines.push('## Renders');
  lines.push('');
  lines.push('| Status | Fixture | Browser | Pages | Reference | Open checks |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const item of results.items) {
    const open = item.checks.filter((c) => c.status !== 'pass').map((c) => `${c.id}: ${c.detail}`);
    const ref = item.reference.kind === 'approved' ? `approved${item.reference.crossBrowser ? ' (chrome)' : ''}` : item.reference.kind;
    lines.push(`| ${ICON[item.status]} | ${item.fixtureId} | ${item.browser} | ${item.pages} | ${ref} | ${cell(open.join('; ').slice(0, 400)) || '—'} |`);
  }
  lines.push('');
  const notes = results.items.filter((i) => i.reviewNotes.length);
  if (notes.length) {
    lines.push('## Review notes');
    lines.push('');
    for (const id of [...new Set(notes.map((n) => n.fixtureId))]) lines.push(`- \`${id}\`: ${notes.find((n) => n.fixtureId === id)!.reviewNotes.join(' ')}`);
    lines.push('');
  }
  if (results.memory?.length) writeMemorySection(lines, results.memory);
  if (results.failureScenarios !== undefined && manifest.failureScenarios) {
    lines.push('## Failure scenarios');
    lines.push('');
    if (!results.failureScenarios) lines.push('failure-scenarios.json is missing or failed its hash check.');
    else {
      lines.push(`Bound for the failing call: ${manifest.failureScenarios.timeoutMs} ms. After it, the same worker renders \`${manifest.failureScenarios.fixture}\` again.`);
      lines.push('');
      lines.push('| Status | Scenario | Browser | Settled | Error | Next report | Leftover |');
      lines.push('| --- | --- | --- | --- | --- | --- | --- |');
      for (const r of results.failureScenarios) {
        lines.push(`| ${r.status === 'ok' ? 'PASS' : 'FAIL'} | ${r.scenario} | ${r.browser} | ${r.scenarioMs === null ? 'no' : `${r.scenarioMs} ms`} | ${cell((r.error ?? '—').split('\n')[0]!.slice(0, 120))} | ${r.nextReport.ok ? 'ok' : cell(r.nextReport.detail.slice(0, 120))} | ${r.leftoverProcesses.length} |`);
      }
    }
    lines.push('');
  }
  lines.push('## Evidence');
  lines.push('');
  lines.push('- `results.json`: machine-readable checks (same content as this file)');
  lines.push('- `downloaded/`: manifest, PDFs and render.log from the box, plus `measurements.json`, `measurement-samples.jsonl.gz` and `failure-scenarios.json` for measured / failure-scenario runs');
  lines.push('- `inspect/<fixture>.<browser>/`: `pages/` (144 DPI PNGs), `diff/` (changed pixels in red), `text/` (raw pdftotext), `inspection.json`');
  lines.push('- `llm-review-request.md` → `llm-review.json`');
  lines.push(`- ${inspections.size} PDF(s) inspected`);
  fs.writeFileSync(path.join(runDir, 'summary.md'), `${lines.join('\n')}\n`);
}

const mib = (kb: number | null | undefined) => (kb === null || kb === undefined ? '?' : String(Math.round(kb / 1024)));

/** Memory: per fixture and browser, then full Chrome vs headless-shell where both were measured. */
function writeMemorySection(lines: string[], groups: MemoryGroup[]): void {
  lines.push('## Memory (MiB, sampled RSS)');
  lines.push('');
  lines.push('Chrome = the Chrome tree the render launched; harness = that plus the worker Node process. The live service is sampled separately and never added in. Sums are approximate (shared pages count once per process).');
  lines.push('');
  lines.push('| Status | Fixture | Browser | Reps ok | Chrome peak median / max | Harness max | Threshold (chrome / harness) | Min available | Notes |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const g of groups) {
    const t = (m: string) => mib(g.thresholds.find((x) => x.metric === m)?.maxKb ?? null);
    lines.push(
      `| ${ICON[g.status]} | ${g.fixtureId} | ${g.browser} | ${g.ok}/${g.repetitions} | ${mib(g.peaks.chromePeakKb.medianKb)} / ${mib(g.peaks.chromePeakKb.maxKb)} | ${mib(g.peaks.harnessPeakKb.maxKb)} | ${t('chromePeakKb')} / ${t('harnessPeakKb')} | ${mib(g.minAvailKb)} | ${cell(g.notes.join('; ')) || '—'} |`,
    );
  }
  lines.push('');
  const pairs = [...new Set(groups.map((g) => g.fixtureId))]
    .map((id) => ({ id, chrome: groups.find((g) => g.fixtureId === id && g.browser === 'chrome'), shell: groups.find((g) => g.fixtureId === id && g.browser === 'shell') }))
    .filter((p) => p.chrome?.peaks.chromePeakKb.medianKb && p.shell?.peaks.chromePeakKb.medianKb);
  if (pairs.length) {
    lines.push('**Full Chrome vs headless-shell** (median Chrome peak):');
    lines.push('');
    lines.push('| Fixture | Chrome | Shell | Change |');
    lines.push('| --- | --- | --- | --- |');
    for (const p of pairs) {
      const c = p.chrome!.peaks.chromePeakKb.medianKb!;
      const sh = p.shell!.peaks.chromePeakKb.medianKb!;
      lines.push(`| ${p.id} | ${mib(c)} | ${mib(sh)} | ${sh >= c ? '+' : ''}${(((sh - c) / c) * 100).toFixed(0)}% |`);
    }
    lines.push('');
  }
}

/** What the LLM pass should look at, with the checklist and the output schema. */
export function writeLlmRequest(runDir: string, manifest: RunManifest, items: ItemResult[], inspections: Map<string, Inspection>): void {
  const lines: string[] = [];
  lines.push(`# LLM review request: run ${manifest.runId}`);
  lines.push('');
  lines.push(`Follow the checklist at \`${CHECKLIST_FILE}\` (sha256 \`${sha256File(CHECKLIST_FILE)}\`).`);
  lines.push(`Write \`${path.join(runDir, 'llm-review.json')}\` and re-run \`pdf-validation verify --run-id ${manifest.runId}\`.`);
  lines.push('');
  lines.push('Every page listed below needs at least one entry (`severity: "none"` for a clean page).');
  lines.push('');
  for (const item of items) {
    const insp = inspections.get(item.id);
    if (!insp?.candidate.readable) continue;
    const fixture = (() => {
      try {
        return fixtureById(item.fixtureId);
      } catch {
        return null;
      }
    })();
    lines.push(`## ${item.fixtureId} (${item.browser})`);
    lines.push('');
    if (fixture) lines.push(`${fixture.purpose}. Paper: ${fixture.expect.paper.name}.`);
    for (const note of item.reviewNotes) lines.push(`- Note: ${note}`);
    const truncation = fixture?.expect.allowedTruncation;
    if (fixture && (fixture.input.jobType === 'committeeRoster')) {
      lines.push(`- Allowed truncation: ${truncation?.length ? truncation.join(', ') : 'none: any ellipsis or clipped cell is a defect'}`);
    }
    lines.push('');
    for (const p of insp.pages) {
      const diff = p.diff?.png ? `; diff \`${path.join(runDir, 'inspect', item.id, p.diff.png)}\` (${(p.diff.changedRatio * 100).toFixed(2)}% changed)` : '';
      lines.push(`- page ${p.page}: \`${path.join(runDir, 'inspect', item.id, p.png)}\`${diff}`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(runDir, 'llm-review-request.md'), `${lines.join('\n')}\n`);
}
