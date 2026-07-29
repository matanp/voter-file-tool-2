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
MODEL_SLUG=<your-model-slug> pnpm review:freeze data-lifecycle
pnpm review:scans data-lifecycle
```

Run freeze and scans back-to-back in the same session; triage only the `scan-*.txt` files inside the
run directory printed by freeze (see `.review/current`).

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

### Negative-scan triage

The `data-lifecycle` scan includes `deleteObject` and `DeleteObject`. **Zero product hits** on
those patterns is a primary signal: trace every artifact family (report output, upload source, invite
row) for a compensating delete, bucket lifecycle rule, or documented operator purge. Absence in scan
*plus* absence in `s3Utils` helpers is strong evidence for a retention finding on this axis.

## Cross-vector routing

Route borderline observations to the matching vector rather than reporting them here:

| Observation | Route to |
| --- | --- |
| Who can subscribe to a job channel / presigned URL exposure to wrong user | PII & data exposure |
| Callback retry, webhook idempotency, PROCESSING stuck after worker crash | Async reliability |
| Missing `withPrivilege` on delete or re-issue routes | Trust boundary |
| Audit immutability with no stated shorter retention policy | Not a finding here (see checklist) |

## Artifact-family trace (pre-finalize)

Confirm each row has create → use → expire/delete (or a backlog note):

| Family | Create | Use | Expire / delete |
| --- | --- | --- | --- |
| Generated report file | report-server upload + `Report.fileKey` | presigned read / list APIs | soft-delete? R2 delete? row purge? |
| Upload source (CSV / voter file) | presign + PUT | report-server import / absentee load | post-job delete? |
| Invite token | admin create + `expiresAt` | load / apply consume | expired purge? soft-delete? |
| Audit row | `auditLog.create` | export / admin read | archival policy (if any) |

## Not a finding examples

- Intentional long-lived audit rows required for compliance when no product policy claims shorter
  retention.
- Presigned URL default TTL that matches documented operator workflow and is re-issued on demand.
- Invite `expiresAt` enforced consistently on load and consume without a separate display-only field.

## Final checklist

- [ ] Freeze and scans completed in the same session; only run-local `scan-*.txt` triaged.
- [ ] Each durable artifact family has a traced create → use → expire/delete path (or explicit backlog note why not).
- [ ] `deleteObject` / `DeleteObject` scan hits reviewed; zero hits traced to missing cleanup helpers.
- [ ] Findings name the storage surface (DB row, S3 key, client cache, token) and the missing lifecycle step.
- [ ] No finding relies only on "data exists" without a retention or orphan risk on this vector's axis.
- [ ] Cross-vector items deferred per table above.
