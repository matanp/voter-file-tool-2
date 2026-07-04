#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = join(SCRIPT_DIR, "..");
const API_ROOT = join(
  WORKSPACE_ROOT,
  "apps",
  "frontend",
  "src",
  "app",
  "api",
);

const HTTP_METHODS = [
  "GET",
  "POST",
  "PATCH",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
];
const WRAPPERS = ["withPrivilege", "withBackendCheck", "withPublic"];

const methodAlternation = HTTP_METHODS.join("|");
const exportConstPattern = new RegExp(
  `export\\s+const\\s+(${methodAlternation})\\s*(?::[^=]+)?=\\s*([\\s\\S]*?);`,
  "g",
);
const exportFunctionPattern = new RegExp(
  `export\\s+(?:async\\s+)?function\\s+(${methodAlternation})\\s*\\(`,
  "g",
);
const wrapperPattern = new RegExp(
  `\\b(${WRAPPERS.join("|")})\\s*(?:<[\\s\\S]*?>)?\\s*\\(`,
  "g",
);

async function listRouteFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRouteFiles(fullPath)));
    } else if (entry.isFile() && entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

function routePathFor(filePath) {
  const relativePath = relative(API_ROOT, filePath)
    .split(sep)
    .slice(0, -1)
    .join("/");
  return `/api/${relativePath}`;
}

function lineFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

function findWrappers(initializer) {
  return [...initializer.matchAll(wrapperPattern)].map((match) => match[1]);
}

function checkSource(filePath, source) {
  const findings = [];
  const exportedMethods = new Set();

  for (const match of source.matchAll(exportConstPattern)) {
    const [, method, initializer] = match;
    exportedMethods.add(method);
    const wrappers = findWrappers(initializer);

    if (wrappers.length === 0) {
      findings.push({
        filePath,
        method,
        line: lineFor(source, match.index ?? 0),
        message: "missing withPrivilege, withBackendCheck, or withPublic wrapper",
      });
      continue;
    }

    if (wrappers.length > 1) {
      findings.push({
        filePath,
        method,
        line: lineFor(source, match.index ?? 0),
        message: `has ambiguous wrappers: ${wrappers.join(", ")}`,
      });
    }
  }

  for (const match of source.matchAll(exportFunctionPattern)) {
    const [, method] = match;
    exportedMethods.add(method);
    findings.push({
      filePath,
      method,
      line: lineFor(source, match.index ?? 0),
      message:
        "exports a direct handler function; wrap it with withPrivilege, withBackendCheck, or withPublic",
    });
  }

  return { exportedMethods, findings };
}

async function main() {
  const routeFiles = (await listRouteFiles(API_ROOT)).sort();
  const allFindings = [];
  let checkedMethods = 0;

  for (const filePath of routeFiles) {
    const source = await readFile(filePath, "utf8");
    const { exportedMethods, findings } = checkSource(filePath, source);
    checkedMethods += exportedMethods.size;
    allFindings.push(...findings);
  }

  if (allFindings.length > 0) {
    console.error("API route trust-boundary check failed.\n");
    for (const finding of allFindings) {
      const path = relative(WORKSPACE_ROOT, finding.filePath);
      console.error(
        `- ${finding.method} ${routePathFor(finding.filePath)} (${path}:${finding.line}) ${finding.message}`,
      );
    }
    console.error(
      "\nEvery exported API method must make its trust boundary explicit with exactly one wrapper.",
    );
    process.exit(1);
  }

  console.log(
    `API route trust-boundary check passed: ${checkedMethods} methods across ${routeFiles.length} route files.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
