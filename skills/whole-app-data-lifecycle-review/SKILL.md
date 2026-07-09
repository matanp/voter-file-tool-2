---
name: whole-app-data-lifecycle-review
description: Run a findings-only whole-app data lifecycle and retention review in voter-file-tool (report files, uploads, presigned URLs, invite/token expiry, S3 cleanup, audit retention, archive/delete behavior). Use for WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW deliverables.
---

# Whole-App Data Lifecycle & Retention Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology:** [WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze data-lifecycle
pnpm review:scans data-lifecycle
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Use [auth-check-patterns](../auth-check-patterns/SKILL.md) when lifecycle enforcement depends on
privileged delete or re-issue routes. Use [adding-reports](../adding-reports/SKILL.md) when report
artifact retention spans UI, API, and report-server processors.
