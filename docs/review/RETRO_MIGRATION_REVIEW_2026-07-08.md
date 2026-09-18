# Retro: Migration & Data Evolution Review (2026-07-08)

Notes from running `pnpm review:freeze migration` / `pnpm review:scans migration` end to end
(`docs/WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_claude-sonnet-5_2026-07-08.md`). Filing here so the
next reviewer doesn't rediscover the same friction.

## Issues found

1. **Docs describe a `.review/runs/<run-id>/` scheme that didn't exist.** *(Resolved 2026-07-08:
   `scripts/review/lib.sh` now creates run directories and writes `.review/current`.)* Previously,
   `docs/review/WHOLE_APP_REVIEW_METHODOLOGY.md` referenced per-run directories while
   `scripts/review/lib.sh` wrote to flat `.review/`.

2. **Skill examples hardcode a stale `MODEL_SLUG`.** *(Partially resolved 2026-07-08: base and
   data-lifecycle skills genericized to `MODEL_SLUG=<your-model-slug>`.)* Remaining vector skills
   may still show `composer-2.5-fast` — genericize when touched.

3. **`scripts/review/report-contract-matrix.mjs` under-reports mappings via spread objects.** It only
   scans keys declared directly inside the `REPORT_TYPE_MAPPINGS` object literal in
   `packages/shared-validators/src/reportTypeMapping.ts` and misses keys that arrive via
   `...NON_SCOPE_REPORT_TYPE_MAPPINGS`. This produced 5 false-looking blank `type_mapping` cells that
   had to be manually chased down and disproven by reading the source directly — will recur on every
   future migration/contracts review until fixed.
   **Action:** update the matrix script to resolve spread sources, not just directly-declared keys.

## What worked well

- Splitting lanes (F: schema.prisma, B: domain services/status, C+A: reports & route contracts) across
  three parallel subagents kept each agent's context focused and let deep reading happen concurrently
  on a large, long-running feature branch (356 product files, ~20 schema-touching commits).
- The severity rubric (existing-data breakage × rollback/backfill cost) was easy to apply consistently
  once agents cross-checked a suspect migration's SQL against a same-branch "already good" precedent
  (e.g. spotting that the one-active-membership-per-term index skipped the dedup step that the
  governance-config singleton and ineligibility-reasons migrations both included).
- The scope gate (`pnpm review:gate`) caught nothing wrong on the first pass here, but the "one path
  per backtick pair" discipline was cheap to follow when writing findings directly from lane-agent
  output.

## Not worth changing

- Large unfiltered `scan-*.txt` output (900+ lines for `scan-domain-enums.txt`) was fine because lane
  agents did their own triage; only a problem if a single reviewer tries to read scan files directly
  instead of delegating.
- Skipping persisted `lane-<A-F>_<model-slug>.md` draft files (synthesizing directly from subagent
  responses instead) was fine for this single-session run. This only matters for the doc's
  "parallel runs, multiple reviewers share a run directory" mode, which wasn't exercised here.
