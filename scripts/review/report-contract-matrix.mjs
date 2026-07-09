#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");
const REVIEW_DIR = join(REPO_ROOT, ".review");

function readRel(path) {
  const full = join(REPO_ROOT, path);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

function sortedSet(values) {
  return [...new Set(values)].sort();
}

function yes(value) {
  return value ? "yes" : "";
}

function parsePrismaEnum(source, enumName) {
  const match = source.match(new RegExp(`enum\\s+${enumName}\\s*{([\\s\\S]*?)}`));
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter((value) => value && !value.startsWith("//"));
}

function parseObjectKeys(source, exportName) {
  const start = source.indexOf(exportName);
  if (start === -1) return [];
  const bodyStart = source.indexOf("{", start);
  const bodyEnd = source.indexOf("} as const", bodyStart);
  const slice = bodyEnd === -1 ? source.slice(bodyStart) : source.slice(bodyStart, bodyEnd);
  return sortedSet(
    [...slice.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9_]*)\s*:/gm)].map(
      (match) => match[1],
    ),
  );
}

function parseScopeRegistry(source) {
  const rows = new Map();
  for (const match of source.matchAll(
    /^\s{2}([A-Za-z][A-Za-z0-9_]*)\s*:\s*{([\s\S]*?)(?=^\s{2}[A-Za-z][A-Za-z0-9_]*\s*:|\n} as const|\n};)/gm,
  )) {
    const [, key, body] = match;
    const prismaReportType =
      body.match(/prismaReportType:\s*["']([^"']+)["']/)?.[1] ?? "";
    rows.set(key, prismaReportType);
  }
  return rows;
}

function parseTypeLiterals(source) {
  return sortedSet(
    [...source.matchAll(/type:\s*z\.literal\(["']([^"']+)["']\)/g)].map(
      (match) => match[1],
    ),
  );
}

function parseWorkerBranches(source) {
  return sortedSet(
    [...source.matchAll(/jobData\.type\s*={2,3}\s*["']([^"']+)["']/g)].map(
      (match) => match[1],
    ),
  );
}

const prisma = readRel("apps/frontend/prisma/schema.prisma");
const reportSchema = readRel("packages/shared-validators/src/schemas/report.ts");
const reportMapping = readRel("packages/shared-validators/src/reportTypeMapping.ts");
const scopeRegistrySource = readRel("packages/shared-validators/src/scopeReportRegistry.ts");
const scopeUiSource = readRel("apps/frontend/src/components/reports/scopeReportUiRegistry.ts");
const workerSource = readRel("apps/report-server/src/index.ts");

const prismaReportTypes = new Set(parsePrismaEnum(prisma, "ReportType"));
const schemaTypes = new Set(parseTypeLiterals(reportSchema));
const scopeRegistry = parseScopeRegistry(scopeRegistrySource);
const mappingTypes = new Set(parseObjectKeys(reportMapping, "REPORT_TYPE_MAPPINGS"));
if (/getScopeReportTypeMappings\(\)/.test(reportMapping)) {
  for (const type of scopeRegistry.keys()) mappingTypes.add(type);
}
const scopeUiTypes = new Set(parseObjectKeys(scopeUiSource, "SCOPE_REPORT_UI"));
const workerTypes = new Set(parseWorkerBranches(workerSource));

const allTypes = sortedSet([
  ...schemaTypes,
  ...mappingTypes,
  ...scopeRegistry.keys(),
  ...scopeUiTypes,
  ...workerTypes,
]);

mkdirSync(REVIEW_DIR, { recursive: true });
const outputPath = join(REVIEW_DIR, "report-contract-matrix.tsv");
const rows = [
  [
    "report_type",
    "prisma_report_type",
    "prisma_enum",
    "generate_schema",
    "type_mapping",
    "scope_registry",
    "scope_ui",
    "worker_branch",
    "notes",
  ],
];

for (const type of allTypes) {
  const prismaType = scopeRegistry.get(type) ?? "";
  const inPrisma = prismaType ? prismaReportTypes.has(prismaType) : "";
  const notes = [];
  const workerOnly = workerTypes.has(type) && !mappingTypes.has(type) && !scopeRegistry.has(type);
  if (scopeRegistry.has(type) && !scopeUiTypes.has(type)) notes.push("scope UI missing");
  if (scopeUiTypes.has(type) && !scopeRegistry.has(type)) notes.push("scope registry missing");
  if (workerOnly) notes.push("worker-only or internal job");
  if (schemaTypes.has(type) && !mappingTypes.has(type) && !workerOnly) notes.push("mapping missing");
  if (mappingTypes.has(type) && !schemaTypes.has(type)) notes.push("schema literal missing");
  if (scopeRegistry.has(type) && prismaType && !inPrisma) notes.push("Prisma enum missing");
  if (workerTypes.has(type) && !schemaTypes.has(type)) notes.push("worker-only or schema gap");

  rows.push([
    type,
    prismaType,
    yes(inPrisma),
    yes(schemaTypes.has(type)),
    yes(mappingTypes.has(type)),
    yes(scopeRegistry.has(type)),
    yes(scopeUiTypes.has(type)),
    yes(workerTypes.has(type)),
    notes.join("; "),
  ]);
}

writeFileSync(outputPath, `${rows.map((row) => row.join("\t")).join("\n")}\n`);

const notesCount = rows.slice(1).filter((row) => row[8]).length;
console.log(`Report contract matrix written: ${relative(REPO_ROOT, outputPath)}`);
console.log(`  report types: ${allTypes.length}`);
console.log(`  rows with notes: ${notesCount}`);
