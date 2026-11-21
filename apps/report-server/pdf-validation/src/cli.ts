/**
 * pdf-validation: post-deploy PDF validation for the report server. See ../README.md.
 *
 *   render  (box)       render fixtures through the deployed code and upload them to R2
 *   verify  (operator)  download, inspect in the pinned image, compare, write the status
 *   cleanup (either)    delete a run's listed R2 objects (interrupted or abandoned runs)
 *   approve / accept    record human approvals in baselines/approvals.json
 */
import path from 'path';
import { parseArgs } from 'util';
import { accept, approve } from './approve';
import { cleanup } from './cleanup';
import { BROWSERS, DEFAULT_ENV_FILE, DEFAULT_RUNS_DIR, DEFAULT_TIMEOUTS, EXIT_CODE, SERVER_DIR, assertRunId, errorMessage, type BrowserName } from './common';
import { DEFAULT_HEADROOM_PCT, type Acceptance } from './approvals';
import { DEFAULT_MEASURE } from './measurements';
import { render } from './render';
import { DEFAULT_FAILURE_TIMEOUT_MS } from './scenarios';
import { verify } from './verify';

const USAGE = `usage:
  pdf-validation render  --mode quick|full --browser chrome|shell|both [--fixtures a,b] [--case-timeout-ms N] [--timeout-ms N] [--no-install]
                         [--measured [--repetitions N] [--sample-interval-ms N] [--idle-ms N]]   (needs --mode full)
                         [--failure-scenarios [--failure-timeout-ms N]]
  pdf-validation verify  --run-id <id> [--keep-remote] [--platform linux/amd64] [--reinspect] [--download-timeout-ms N]
  pdf-validation cleanup --run-id <id>
  pdf-validation approve --run-id <id> --reviewer <name> [--baselines] [--page-counts] [--thresholds [--headroom-pct N]] [--fixtures a,b] [--browser chrome|shell]
  pdf-validation accept  --run-id <id> --reviewer <name> --kind visual-change|layout-finding --item <fixture>.<browser> --page <n> --reason <text> [--finding <text>]
common: [--runs-dir DIR] [--env-file FILE] [--deployed-dist DIR]`;

const options = {
  mode: { type: 'string' },
  browser: { type: 'string' },
  fixtures: { type: 'string' },
  'case-timeout-ms': { type: 'string' },
  'timeout-ms': { type: 'string' },
  'download-timeout-ms': { type: 'string' },
  'no-install': { type: 'boolean' },
  measured: { type: 'boolean' },
  repetitions: { type: 'string' },
  'sample-interval-ms': { type: 'string' },
  'idle-ms': { type: 'string' },
  'failure-scenarios': { type: 'boolean' },
  'failure-timeout-ms': { type: 'string' },
  thresholds: { type: 'boolean' },
  'headroom-pct': { type: 'string' },
  'run-id': { type: 'string' },
  'keep-remote': { type: 'boolean' },
  platform: { type: 'string' },
  reinspect: { type: 'boolean' },
  reviewer: { type: 'string' },
  baselines: { type: 'boolean' },
  'page-counts': { type: 'boolean' },
  kind: { type: 'string' },
  item: { type: 'string' },
  page: { type: 'string' },
  reason: { type: 'string' },
  finding: { type: 'string' },
  'runs-dir': { type: 'string' },
  'env-file': { type: 'string' },
  'deployed-dist': { type: 'string' },
  help: { type: 'boolean' },
} as const;

function int(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`--${name} must be a positive integer`);
  return n;
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const { values } = parseArgs({ args: rest, options, strict: true });
  if (!command || values.help) {
    console.log(USAGE);
    return command ? 0 : 1;
  }
  const runsDir = path.resolve(values['runs-dir'] ?? DEFAULT_RUNS_DIR);
  const envFile = path.resolve(values['env-file'] ?? DEFAULT_ENV_FILE);
  const runId = () => {
    if (!values['run-id']) throw new Error('--run-id is required');
    assertRunId(values['run-id']);
    return values['run-id'];
  };
  const fixtures = values.fixtures ? values.fixtures.split(',').map((s) => s.trim()).filter(Boolean) : null;

  switch (command) {
    case 'render': {
      const mode = values.mode;
      if (mode !== 'quick' && mode !== 'full') throw new Error('--mode quick|full is required');
      const browser = values.browser;
      if (browser !== 'both' && !BROWSERS.includes(browser as BrowserName)) throw new Error('--browser chrome|shell|both is required');
      const measuredFlags = ['repetitions', 'sample-interval-ms', 'idle-ms'] as const;
      if (!values.measured && measuredFlags.some((k) => values[k] !== undefined)) throw new Error(`${measuredFlags.map((k) => `--${k}`).join(', ')} need --measured`);
      if (values.measured && mode !== 'full') throw new Error('--measured needs --mode full');
      if (!values['failure-scenarios'] && values['failure-timeout-ms'] !== undefined) throw new Error('--failure-timeout-ms needs --failure-scenarios');
      const overridden = (['case-timeout-ms', 'timeout-ms', ...measuredFlags, 'failure-timeout-ms'] as const).filter((k) => values[k] !== undefined).map((k) => `${k}=${values[k]}`);
      const idleMs = values['idle-ms'] === '0' ? 0 : int(values['idle-ms'], 'idle-ms', DEFAULT_MEASURE.idleMs);
      return render({
        mode,
        browser: browser as BrowserName | 'both',
        runsDir,
        envFile,
        deployedDistDir: path.resolve(values['deployed-dist'] ?? path.join(SERVER_DIR, 'dist')),
        caseTimeoutMs: int(values['case-timeout-ms'], 'case-timeout-ms', DEFAULT_TIMEOUTS.caseMs),
        invocationTimeoutMs: int(values['timeout-ms'], 'timeout-ms', values.measured ? DEFAULT_TIMEOUTS.measuredInvocationMs : DEFAULT_TIMEOUTS.invocationMs),
        overridden,
        fixtures,
        allowInstall: !values['no-install'],
        measured: values.measured
          ? {
              repetitions: int(values.repetitions, 'repetitions', DEFAULT_MEASURE.repetitions),
              intervalMs: int(values['sample-interval-ms'], 'sample-interval-ms', DEFAULT_MEASURE.intervalMs),
              idleMs,
            }
          : null,
        failureScenarios: values['failure-scenarios'] ? { timeoutMs: int(values['failure-timeout-ms'], 'failure-timeout-ms', DEFAULT_FAILURE_TIMEOUT_MS) } : null,
      });
    }
    case 'verify':
      return verify({
        runId: runId(),
        runsDir,
        envFile,
        keepRemote: values['keep-remote'] ?? false,
        platform: values.platform ?? 'linux/amd64',
        reinspect: values.reinspect ?? false,
        downloadTimeoutMs: int(values['download-timeout-ms'], 'download-timeout-ms', DEFAULT_TIMEOUTS.caseMs),
      });
    case 'cleanup':
      return cleanup({ runId: runId(), runsDir, envFile });
    case 'approve':
      if (!values.baselines && !values['page-counts'] && !values.thresholds) throw new Error('approve needs --baselines, --page-counts and/or --thresholds');
      if (!values.thresholds && values['headroom-pct'] !== undefined) throw new Error('--headroom-pct needs --thresholds');
      return approve({
        runId: runId(),
        runsDir,
        envFile,
        reviewer: values.reviewer ?? '',
        baselines: values.baselines ?? false,
        pageCounts: values['page-counts'] ?? false,
        thresholds: values.thresholds ?? false,
        headroomPct: values['headroom-pct'] === undefined ? DEFAULT_HEADROOM_PCT : Number(values['headroom-pct']),
        fixtures,
        browser: values.browser ? (values.browser as BrowserName) : null,
      });
    case 'accept': {
      const kind = values.kind as Acceptance['kind'];
      if (kind !== 'visual-change' && kind !== 'layout-finding') throw new Error('--kind visual-change|layout-finding is required');
      return accept({ runId: runId(), runsDir, reviewer: values.reviewer ?? '', kind, item: values.item ?? '', page: Number(values.page), reason: values.reason ?? '', finding: values.finding ?? null });
    }
    default:
      console.error(USAGE);
      return EXIT_CODE.fail;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exit(EXIT_CODE.fail);
  });
