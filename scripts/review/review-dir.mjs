#!/usr/bin/env node
/**
 * Resolve the active whole-app review run directory.
 * Precedence: REVIEW_RUN_DIR env → .review/current pointer → legacy flat .review/
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** @param {string} repoRoot */
export function resolveReviewDir(repoRoot) {
  const envDir = process.env.REVIEW_RUN_DIR?.trim();
  if (envDir) {
    return join(repoRoot, envDir);
  }

  const currentFile = join(repoRoot, ".review", "current");
  if (existsSync(currentFile)) {
    const rel = readFileSync(currentFile, "utf8").trim();
    if (rel) {
      return join(repoRoot, rel);
    }
  }

  return join(repoRoot, ".review");
}

/** @param {string} repoRoot */
export function resolveManifestPath(repoRoot) {
  return join(resolveReviewDir(repoRoot), "product-files.txt");
}
