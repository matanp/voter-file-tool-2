#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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
const REVIEW_DIR = join(WORKSPACE_ROOT, ".review");

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

function requiredPrivilegeFor(initializer, wrapper) {
  if (wrapper !== "withPrivilege") return "";
  const match = initializer.match(
    /\bwithPrivilege\s*(?:<[\s\S]*?>)?\s*\(\s*([^,\n)]+)/,
  );
  return match?.[1]?.trim() ?? "UNKNOWN";
}

function inventoryRow(filePath, method, line, initializer, wrappers) {
  const wrapper = wrappers.length === 1 ? wrappers[0] : wrappers.length > 1 ? "AMBIGUOUS" : "MISSING";
  return {
    method,
    route: routePathFor(filePath),
    wrapper,
    requiredPrivilege: requiredPrivilegeFor(initializer, wrapper),
    path: relative(WORKSPACE_ROOT, filePath),
    line,
  };
}

function checkSource(filePath, source) {
  const findings = [];
  const inventory = [];
  const exportedMethods = new Set();

  for (const match of source.matchAll(exportConstPattern)) {
    const [, method, initializer] = match;
    exportedMethods.add(method);
    const wrappers = findWrappers(initializer);
    const line = lineFor(source, match.index ?? 0);
    inventory.push(inventoryRow(filePath, method, line, initializer, wrappers));

    if (wrappers.length === 0) {
      findings.push({
        filePath,
        method,
        line,
        message: "missing withPrivilege, withBackendCheck, or withPublic wrapper",
      });
      continue;
    }

    if (wrappers.length > 1) {
      findings.push({
        filePath,
        method,
        line,
        message: `has ambiguous wrappers: ${wrappers.join(", ")}`,
      });
    }
  }

  for (const match of source.matchAll(exportFunctionPattern)) {
    const [, method] = match;
    exportedMethods.add(method);
    const line = lineFor(source, match.index ?? 0);
    inventory.push(inventoryRow(filePath, method, line, "", []));
    findings.push({
      filePath,
      method,
      line,
      message:
        "exports a direct handler function; wrap it with withPrivilege, withBackendCheck, or withPublic",
    });
  }

  return { exportedMethods, findings, inventory };
}

async function writeInventory(rows) {
  await mkdir(REVIEW_DIR, { recursive: true });
  const header = "method\troute\twrapper\trequired_privilege\tpath\tline";
  const body = rows.map((row) =>
    [
      row.method,
      row.route,
      row.wrapper,
      row.requiredPrivilege,
      row.path,
      String(row.line),
    ].join("\t"),
  );
  const outputPath = join(REVIEW_DIR, "api-route-inventory.tsv");
  await writeFile(outputPath, `${[header, ...body].join("\n")}\n`);
  return outputPath;
}

async function main() {
  const writeInventoryFlag = process.argv.includes("--inventory");
  const inventoryOnly = process.argv.includes("--inventory-only");
  const routeFiles = (await listRouteFiles(API_ROOT)).sort();
  const allFindings = [];
  const inventoryRows = [];
  let checkedMethods = 0;

  for (const filePath of routeFiles) {
    const source = await readFile(filePath, "utf8");
    const { exportedMethods, findings, inventory } = checkSource(filePath, source);
    checkedMethods += exportedMethods.size;
    allFindings.push(...findings);
    inventoryRows.push(...inventory);
  }

  if (writeInventoryFlag || inventoryOnly) {
    const outputPath = await writeInventory(inventoryRows);
    console.log(`API route inventory written: ${relative(WORKSPACE_ROOT, outputPath)}`);
    console.log(
      `  methods: ${checkedMethods} across ${routeFiles.length} route files`,
    );
    if (inventoryOnly) return;
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
