#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");
const REVIEW_DIR = join(REPO_ROOT, ".review");
const MANIFEST = join(REVIEW_DIR, "product-files.txt");

function usage() {
  console.error("Usage: pnpm review:gate -- <deliverable.md>");
  console.error("   or: REVIEW_DOC=docs/WHOLE_APP_....md pnpm review:gate");
}

function rel(path) {
  return relative(REPO_ROOT, path);
}

function uniqueSorted(items) {
  return [...new Set(items)].sort();
}

function writeLines(file, lines) {
  writeFileSync(file, `${lines.join("\n")}${lines.length ? "\n" : ""}`);
}

function isReviewPath(value) {
  return /^(apps|packages|scripts)\//.test(value);
}

function isCleanPath(value) {
  return /^(apps|packages|scripts)\/[A-Za-z0-9._@/[\]-]+\.[A-Za-z0-9]+$/.test(
    value,
  );
}

function invalidReason(value) {
  if (/[{}*?]/.test(value)) return "glob, brace expansion, or wildcard";
  if (/,/.test(value)) return "multiple paths in one code span";
  if (/\s/.test(value)) return "whitespace in path code span";
  if (/:\d+(?::\d+)?$/.test(value)) return "line number suffix";
  if (!isCleanPath(value)) return "not a single repo-relative file path";
  return "";
}

function shouldValidateCodeSpan(value) {
  if (!isReviewPath(value)) return false;
  if (isCleanPath(value)) return true;
  return /[{}*?,]|\s|:\d+(?::\d+)?$/.test(value);
}

function stripTrailingPunctuation(value) {
  return value.replace(/[),.;]+$/g, "");
}

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const reviewDoc = args[0] || process.env.REVIEW_DOC;

if (!reviewDoc) {
  usage();
  process.exit(1);
}

if (!existsSync(MANIFEST)) {
  console.error(`Missing ${rel(MANIFEST)} - run: pnpm review:freeze <vector>`);
  process.exit(1);
}

const reviewDocPath = join(REPO_ROOT, reviewDoc);
if (!existsSync(reviewDocPath)) {
  console.error(`Review deliverable not found: ${reviewDoc}`);
  process.exit(1);
}

mkdirSync(REVIEW_DIR, { recursive: true });

const manifest = new Set(
  readFileSync(MANIFEST, "utf8")
    .split(/\r?\n/)
    .filter(Boolean),
);
const source = readFileSync(reviewDocPath, "utf8");

const codeSpans = [];
const codeRanges = [];
for (const match of source.matchAll(/`([^`\n]+)`/g)) {
  codeSpans.push(match[1]);
  codeRanges.push([match.index, match.index + match[0].length]);
}

// Test/mock artifacts are out of manifest scope: deliverables must name them in
// prose (uncited), never as a backticked path. Catch both the repo-root form
// (apps/.../__tests__/...) and the short forms reviewers tend to write
// (__tests__/api/..., foo.test.ts) that would otherwise dodge the manifest check.
// Only whitespace-free spans count: an Evidence grep command that *mentions* the
// __tests__ dir (e.g. `grep -rl foo apps/.../__tests__`) is allowed — the rule is
// about citing a test file as a path token, not referencing the directory.
const TEST_PATH_RE = /__tests__|__mocks__|\.test\.[cm]?[jt]sx?|\.spec\.[cm]?[jt]sx?/;
const isTestPathSpan = (span) => !/\s/.test(span) && TEST_PATH_RE.test(span);

const cited = [];
const malformed = [];
const testPaths = [];
for (const span of codeSpans) {
  if (isTestPathSpan(span)) {
    testPaths.push(span);
    continue;
  }
  if (!shouldValidateCodeSpan(span)) continue;
  const reason = invalidReason(span);
  if (reason) {
    malformed.push(`${span} (${reason})`);
  } else {
    cited.push(span);
  }
}

const inCodeSpan = (index) =>
  codeRanges.some(([start, end]) => index >= start && index < end);

const barePaths = [];
for (const match of source.matchAll(
  /\b(apps|packages|scripts)\/[A-Za-z0-9._@/[\]-]+\.[A-Za-z0-9]+(?::\d+(?::\d+)?)?/g,
)) {
  if (!inCodeSpan(match.index)) {
    barePaths.push(stripTrailingPunctuation(match[0]));
  }
}

const citedUnique = uniqueSorted(cited);
const violations = citedUnique.filter((path) => !manifest.has(path));
const scriptViolations = violations.filter((path) => path.startsWith("scripts/"));
const nonScriptViolations = violations.filter(
  (path) => !path.startsWith("scripts/"),
);

writeLines(join(REVIEW_DIR, "cited-files.txt"), citedUnique);
writeLines(join(REVIEW_DIR, "scope-violations.txt"), violations);
writeLines(join(REVIEW_DIR, "scope-boundary-scripts.txt"), scriptViolations);
writeLines(
  join(REVIEW_DIR, "scope-violations-non-scripts.txt"),
  nonScriptViolations,
);
writeLines(join(REVIEW_DIR, "scope-malformed-citations.txt"), uniqueSorted(malformed));
writeLines(join(REVIEW_DIR, "scope-bare-paths.txt"), uniqueSorted(barePaths));
writeLines(join(REVIEW_DIR, "scope-test-paths.txt"), uniqueSorted(testPaths));

let failed = false;

if (testPaths.length > 0) {
  failed = true;
  console.error(
    "Scope gate FAILED: test/mock paths must not appear inside backticks (name them uncited in prose):",
  );
  for (const item of uniqueSorted(testPaths)) {
    console.error(`  ${item}`);
  }
  console.error();
}

if (malformed.length > 0) {
  failed = true;
  console.error("Scope gate FAILED: malformed path code spans:");
  for (const item of uniqueSorted(malformed)) {
    console.error(`  ${item}`);
  }
  console.error();
}

if (barePaths.length > 0) {
  failed = true;
  console.error("Scope gate FAILED: repo paths must be inside backticks:");
  for (const item of uniqueSorted(barePaths)) {
    console.error(`  ${item}`);
  }
  console.error();
}

if (scriptViolations.length > 0) {
  console.log("Boundary context (scripts/ - tag in finding, not a hard failure):");
  for (const path of scriptViolations) {
    console.log(`  ${path}`);
  }
  console.log();
}

if (nonScriptViolations.length > 0) {
  failed = true;
  console.error("Scope gate FAILED: cited paths outside product manifest:");
  for (const path of nonScriptViolations) {
    console.error(`  ${path}`);
  }
  console.error();
}

if (failed) {
  console.error(
    "Fix citations: one repo-relative product path per backtick pair, no line numbers, globs, or bare paths.",
  );
  process.exit(1);
}

if (scriptViolations.length > 0) {
  console.log("Scope gate PASSED with scripts/ boundary citations only.");
} else {
  console.log("Scope gate PASSED: all cited paths are in the product manifest.");
}
console.log(`  deliverable: ${reviewDoc}`);
console.log(`  cited:       ${citedUnique.length} unique paths`);
