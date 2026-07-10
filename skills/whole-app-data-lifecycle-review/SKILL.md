---
name: whole-app-data-lifecycle-review
description: Run a findings-only whole-app data lifecycle and retention review in voter-file-tool (report files, uploads, presigned URLs, invite/token expiry, S3 cleanup, audit retention, archive/delete behavior). Use for WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW deliverables.
---

# Whole-App Data Lifecycle & Retention Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology:** [WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=<your-model-slug> pnpm review:freeze data-lifecycle
pnpm review:scans data-lifecycle
```

Run both commands back-to-back in the same session. Triage only `scan-*.txt` inside the run
directory printed by freeze (`.review/current` points at it). Do not read stale scan files from a
prior run or from the flat `.review/` root.

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Use [auth-check-patterns](../auth-check-patterns/SKILL.md) when lifecycle enforcement depends on
privileged delete or re-issue routes. Use [adding-reports](../adding-reports/SKILL.md) when report
artifact retention spans UI, API, and report-server processors.

## Vector-specific triage

1. Group `scan-data-lifecycle.txt` hits by artifact family (report file, upload, invite/token, audit).
2. If `deleteObject` / `DeleteObject` have zero product hits, read both `s3Utils` helpers and trace
   delete paths for each family.
3. Use `scan-async-jobs.txt` for upload-to-callback coupling (orphan R2 when DB `fileKey` never set).
4. Defer PII exposure and callback-retry items per the cross-vector table in the methodology doc.
