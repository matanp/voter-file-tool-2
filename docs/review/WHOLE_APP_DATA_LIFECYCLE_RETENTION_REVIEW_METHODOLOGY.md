# Whole-App Data Lifecycle & Retention Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-data-lifecycle-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for how product code creates, retains, expires, and
cleans up durable artifacts and time-bound credentials: generated report files, uploads, presigned
URLs, invite/token expiry, stale S3 objects, audit retention, archive/delete behavior, and
privacy-preserving cleanup. Not a general PII exposure review — use the PII vector for what data can
leave; use this vector for how long it persists and whether cleanup/expiry is enforced.

---

## Delta from base

| Topic | Data lifecycle & retention vector |
| --- | --- |
| **Axis** | Durable artifact and credential lifetime × orphaned-data / compliance risk |
| **Scan profile** | `data-lifecycle-retention` |
| **Deliverable** | `docs/WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_<model-slug>_YYYY-MM-DD.md` |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze data-lifecycle
pnpm review:scans data-lifecycle
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Sensitive artifacts or credentials persist without expiry, ownership, or cleanup; orphaned S3/report rows after delete; invite/token usable past intended lifetime. |
| **Medium** | Weak or inconsistent TTL defaults, missing delete-after-use for uploads/reports, or audit/archive rows with no bounded retention story. |
| **Low** | Local cleanup gap with narrow blast radius and no external persistence beyond intended workflow. |

## Lane emphasis

- **A (high):** Presigned URL routes, report/download URL issuance, invite/token APIs, delete/archive
  endpoints, expiry validation on read.
- **B (medium):** Invite consumption, bulk-load archive cleanup, domain services that create durable
  side effects without compensating delete.
- **C (high):** Report job completion, report-server upload to object storage, generated file keys,
  webhook handoff URLs.
- **D (high):** Upload presign, import file lifecycle, discrepancy undo vs object cleanup.
- **E (medium):** Client-held report/upload URLs, cached download links, admin views of expired
  invites.
- **F (high):** `schema.prisma` models for reports, uploads, invites, audit; shared S3 helpers and
  `expiresIn` defaults.

Apply `skills/auth-check-patterns/SKILL.md` when retention gaps also depend on who can trigger
delete or re-issue URLs.

## Mechanical scans

`scan-data-lifecycle.txt`, `scan-upload.txt`, `scan-async-jobs.txt`, `scan-pii-data.txt`,
`scan-prisma-writes.txt`, `scan-api-routes.txt`.

Triage order: data-lifecycle hits grouped by artifact family (report file, upload, invite/token,
audit/archive), then upload and async-jobs for job-to-object coupling, then prisma-writes for
delete/cleanup paths.

## Not a finding examples

- Intentional long-lived audit rows required for compliance when no product policy claims shorter
  retention.
- Presigned URL default TTL that matches documented operator workflow and is re-issued on demand.
- Invite `expiresAt` enforced consistently on load and consume without a separate display-only field.

## Final checklist

- [ ] Each durable artifact family has a traced create → use → expire/delete path (or explicit backlog note why not).
- [ ] Findings name the storage surface (DB row, S3 key, client cache, token) and the missing lifecycle step.
- [ ] No finding relies only on "data exists" without a retention or orphan risk on this vector's axis.
