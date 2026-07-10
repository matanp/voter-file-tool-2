#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");

function rel(path) {
  return relative(REPO_ROOT, path);
}

function readRel(path) {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

function fileExists(path) {
  return existsSync(join(REPO_ROOT, path));
}

function parseVectors() {
  return readRel("scripts/review/vectors.conf")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [name, prefix, scanProfile, axis] = line
        .split("|")
        .map((part) => part.trim());
      return { name, prefix, scanProfile, axis };
    });
}

function parseProfiles() {
  const source = readRel("scripts/review/run-scans.sh");
  const profileBlock =
    source.match(/profile_scans\(\) \{([\s\S]*?)^\}/m)?.[1] ?? "";
  const profiles = new Map();
  for (const match of profileBlock.matchAll(/^\s{4}([a-z0-9-]+)\)\s+echo "([^"]*)"/gm)) {
    profiles.set(match[1], match[2].split(/\s+/).filter(Boolean));
  }
  return profiles;
}

function parseScanDefs() {
  const source = readRel("scripts/review/run-scans.sh");
  const scanBlock = source.match(/scan_def\(\) \{([\s\S]*?)^\}/m)?.[1] ?? "";
  return new Set(
    [...scanBlock.matchAll(/^\s{4}([a-z0-9-]+)\)\s+printf/gm)].map(
      (match) => match[1],
    ),
  );
}

function inferredSkillPath(name) {
  const skillByVector = {
    trust: "whole-app-trust-boundary-review",
    validation: "whole-app-validation-testability-review",
    pii: "whole-app-pii-review",
  };
  const skillName = skillByVector[name] ?? `whole-app-${name}-review`;
  return `skills/${skillName}/SKILL.md`;
}

function check(condition, message, errors) {
  if (!condition) errors.push(message);
}

const errors = [];
const warnings = [];
const vectors = parseVectors();
const profiles = parseProfiles();
const scanDefs = parseScanDefs();
scanDefs.add("api-route-wrappers");

for (const vector of vectors) {
  check(Boolean(vector.name && vector.prefix && vector.scanProfile && vector.axis), `Malformed vector row: ${JSON.stringify(vector)}`, errors);
  check(
    fileExists(`docs/review/${vector.prefix}_METHODOLOGY.md`),
    `Missing methodology for vector '${vector.name}': docs/review/${vector.prefix}_METHODOLOGY.md`,
    errors,
  );
  check(
    fileExists(inferredSkillPath(vector.name)),
    `Missing skill for vector '${vector.name}': ${inferredSkillPath(vector.name)}`,
    errors,
  );
  check(
    profiles.has(vector.scanProfile),
    `Unknown scan profile '${vector.scanProfile}' used by vector '${vector.name}'`,
    errors,
  );
}

for (const [profile, scans] of profiles) {
  for (const scan of scans) {
    check(
      scanDefs.has(scan),
      `Scan profile '${profile}' references unknown scan '${scan}'`,
      errors,
    );
  }
}

const docPaths = [
  "scripts/README.md",
  "docs/review/README.md",
  "docs/review/WHOLE_APP_REVIEW_METHODOLOGY.md",
  ...vectors.map((vector) => `docs/review/${vector.prefix}_METHODOLOGY.md`),
  "skills/whole-app-review/SKILL.md",
  "skills/whole-app-review/reference.md",
  ...vectors.map((vector) => inferredSkillPath(vector.name)),
].filter((path, index, array) => array.indexOf(path) === index && fileExists(path));

for (const path of docPaths) {
  const source = readRel(path);
  if (/<\/(content|invoke)>/.test(source)) {
    errors.push(`Leaked tool/XML closing tag in ${path}`);
  }
  if (/SCAN_PROFILE=/.test(source)) {
    warnings.push(`Stale env-var workflow mention in ${path}`);
  }
}

for (const script of [
  "scripts/review/freeze-basis.sh",
  "scripts/review/lib.sh",
  "scripts/review/run-scans.sh",
  "scripts/review/scope-gate.sh",
  "scripts/review/test-coverage-map.sh",
]) {
  const result = spawnSync("bash", ["-n", script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    errors.push(`bash -n failed for ${script}: ${result.stderr.trim()}`);
  }
}

const libSh = readRel("scripts/review/lib.sh");
check(
  libSh.includes("review_init_run_dir") && libSh.includes("REVIEW_CURRENT_POINTER"),
  "lib.sh must implement review_init_run_dir and .review/current pointer",
  errors,
);
check(
  readRel("scripts/review/freeze-basis.sh").includes("review_init_run_dir"),
  "freeze-basis.sh must call review_init_run_dir",
  errors,
);
check(
  fileExists("scripts/review/review-dir.mjs"),
  "Missing scripts/review/review-dir.mjs",
  errors,
);

if (warnings.length > 0) {
  console.log("Review doctor warnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
  console.log();
}

if (errors.length > 0) {
  console.error("Review doctor FAILED:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("Review doctor PASSED.");
console.log(`  vectors: ${vectors.length}`);
console.log(`  scan profiles: ${profiles.size}`);
console.log(`  scan definitions: ${scanDefs.size}`);
console.log(`  checked docs/skills: ${docPaths.length}`);
