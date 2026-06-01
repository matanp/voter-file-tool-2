#!/usr/bin/env node
/**
 * Runs tests across all workspace packages with tests and prints an aggregated summary.
 * Uses Jest's JSON reporter for structured output; on failure, prints full Jest output.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Listr } from "listr2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = join(__dirname, "..");
const RESULTS_DIR = join(WORKSPACE_ROOT, ".test-results");

const PACKAGES = [
  { dir: "packages/shared-validators", label: "shared-validators" },
  { dir: "packages/voter-import-processor", label: "voter-import-processor" },
  { dir: "apps/frontend", label: "frontend" },
  { dir: "apps/report-server", label: "report-server" },
] as const;

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

interface JestTestResult {
  startTime: number;
  endTime: number;
}

interface JestJsonResult {
  numPassedTests: number;
  numFailedTests: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numTotalTestSuites: number;
  success: boolean;
  testResults?: JestTestResult[];
}

interface PackageResult {
  label: string;
  success: boolean;
  suites: number;
  tests: number;
  durationMs: number;
  output?: string;
  error?: string;
}

/** Run tests for one package with Jest JSON output. */
async function runPackageTests(
  pkg: (typeof PACKAGES)[number]
): Promise<PackageResult> {
  const outputPath = join(RESULTS_DIR, `${pkg.label}.json`);
  const packageCwd = join(WORKSPACE_ROOT, pkg.dir);
  return new Promise((resolve) => {
    const proc = spawn(
      "pnpm",
      ["exec", "jest", "--json", `--outputFile=${outputPath}`],
      {
        cwd: packageCwd,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));

    proc.on("close", async (code) => {
      const output = stdout + stderr;
      if (code !== 0) {
        resolve({
          label: pkg.label,
          success: false,
          suites: 0,
          tests: 0,
          durationMs: 0,
          output,
        });
        return;
      }
      try {
        const raw = await readFile(outputPath, "utf-8");
        const data = JSON.parse(raw) as JestJsonResult;
        const results = data.testResults ?? [];
        const durationMs =
          results.length > 0
            ? Math.max(...results.map((r) => r.endTime)) -
              Math.min(...results.map((r) => r.startTime))
            : 0;
        resolve({
          label: pkg.label,
          success: data.success,
          suites: data.numTotalTestSuites ?? 0,
          tests: data.numTotalTests ?? 0,
          durationMs,
        });
      } catch {
        resolve({
          label: pkg.label,
          success: false,
          suites: 0,
          tests: 0,
          durationMs: 0,
          error: "Failed to parse Jest JSON output",
        });
      }
    });
  });
}

/** Format duration for display. */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Print the summary table. */
function printSummary(results: PackageResult[], totalDurationMs: number): void {
  const col1 = 28;
  const col2 = 8;
  const col3 = 8;
  const col4 = 8;
  const col5 = 8;

  const sep = "─".repeat(col1 + col2 + col3 + col4 + col5 + 4 * 3);

  console.log(`\n  ${DIM}Package${" ".repeat(col1 - 8)}Status   Suites   Tests    Time${RESET}`);
  console.log(`  ${sep}`);

  let totalSuites = 0;
  let totalTests = 0;

  for (const r of results) {
    const status = r.success ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    totalSuites += r.suites;
    totalTests += r.tests;
    const label = r.label.padEnd(col1);
    const suites = String(r.suites).padStart(col3);
    const tests = String(r.tests).padStart(col4);
    const time = formatDuration(r.durationMs).padStart(col5);
    console.log(`  ${label} ${status}     ${suites}   ${tests}   ${time}`);
  }

  console.log(`  ${sep}`);
  console.log(
    `  ${"Total".padEnd(col1)}         ${String(totalSuites).padStart(col3)}   ${String(totalTests).padStart(col4)}   ${formatDuration(totalDurationMs).padStart(col5)}`
  );
  console.log();
}

async function main(): Promise<void> {
  await mkdir(RESULTS_DIR, { recursive: true });

  const results: PackageResult[] = [];
  const startTime = Date.now();

  const tasks = new Listr(
    PACKAGES.map((pkg) => ({
      title: pkg.label,
      task: async () => {
        const result = await runPackageTests(pkg);
        results.push(result);
        if (!result.success) {
          throw new Error(result.error ?? "Tests failed");
        }
        return result;
      },
    })),
    { concurrent: true }
  );

  try {
    await tasks.run();
  } catch {
    // Results are already collected; continue to print summary and failure output
  }

  const totalDurationMs = Date.now() - startTime;
  const ordered = PACKAGES.map(
    (p) => results.find((r) => r.label === p.label)!
  ).filter(Boolean);
  printSummary(ordered, totalDurationMs);

  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    for (const f of failures) {
      if (f.output) {
        console.log(`\n${DIM}─── ${f.label} (output) ───${RESET}\n`);
        console.log(f.output);
      }
      if (f.error) {
        console.error(`${RED}${f.error}${RESET}`);
      }
    }
    process.exit(1);
  }

  try {
    await rm(RESULTS_DIR, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
