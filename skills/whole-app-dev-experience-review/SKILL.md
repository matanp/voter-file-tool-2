---
name: whole-app-dev-experience-review
description: Run a findings-only whole-app dev experience and local reproducibility review in voter-file-tool (setup drift, seed data, test database ergonomics, scripts requiring external state, env var parity). Use for WHOLE_APP_DEV_EXPERIENCE_REPRODUCIBILITY_REVIEW deliverables.
---

# Whole-App Dev Experience & Local Reproducibility Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology:** [WHOLE_APP_DEV_EXPERIENCE_REPRODUCIBILITY_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_DEV_EXPERIENCE_REPRODUCIBILITY_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=<your-model-slug> pnpm review:freeze dev-experience
pnpm review:scans dev-experience
```

Run both commands back-to-back in the same session. Triage only `scan-*.txt` inside the run
directory printed by freeze (`.review/current` points at it). Do not read stale scan files from a
prior run or from the flat `.review/` root.

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Use [adding-reports](../adding-reports/SKILL.md) when reproducibility gaps involve report-server
seed or fixture data specifically.

## Vector-specific triage

1. Group `scan-dev-experience.txt` hits by concern: env var, setup script, seed/test-db, container.
2. For each workspace with an `.env.example` (`apps/frontend`, `apps/report-server`), diff its
   variable names against every `process.env.<VAR>` reference in that workspace — both directions
   (undocumented var read, and stale unused example entry).
3. Trace `db:setup`, `sync-prisma`, and `db:seed-*` scripts against current `schema.prisma` for
   drifted preconditions.
4. Use `scan-operations.txt` for `process.env` reads not covered by an `.env.example` entry, and
   `scan-migration-data.txt` for backfill/seed scripts whose assumptions may have drifted.
5. Defer production-facing env var risk to the operations vector and seed/backfill correctness for
   a real rollout to the migration vector, per the cross-vector table in the methodology doc.
