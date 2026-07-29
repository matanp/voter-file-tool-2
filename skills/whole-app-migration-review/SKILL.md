---
name: whole-app-migration-review
description: Run a findings-only whole-app migration and data evolution review in voter-file-tool (schema compatibility, enum rollout, defaults, backfills, existing data). Use for WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW deliverables.
---

# Whole-App Migration & Data Evolution Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology:** [WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze migration
pnpm review:scans migration
pnpm review:report-matrix
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Deep-read `apps/frontend/prisma/schema.prisma` first. For report enum/schema/worker evolution use [adding-reports](../adding-reports/SKILL.md) and `pnpm review:report-matrix`.
