# Whole-App PII & Data Exposure Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-pii-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for voter/contact data exposure, export/download
scope, presigned URL handling, audit/log leakage, and data minimization. Not a general auth review;
use the trust vector for who may invoke a route, and this vector for what sensitive data can leave.

---

## Delta from base

| Topic | PII & data exposure vector |
| --- | --- |
| **Axis** | Sensitive data exposure likelihood × recipient/blast radius |
| **Scan profile** | `pii-data` |
| **Deliverable** | `docs/WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_<model-slug>_YYYY-MM-DD.md` |
| **Escalations** | Use Findings; concrete PII leak = High |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze pii
pnpm review:scans
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Cross-scope voter/contact/export data exposure, durable public file access, or sensitive values logged to an external surface. |
| **Medium** | Over-broad list/export fields, weak presigned URL lifetime/ownership, or unnecessary PII copied into audit/report metadata. |
| **Low** | Local minimization gap with narrow audience and no external persistence. |

## Lane emphasis

- **A (high):** API list/export response fields, report/download ownership, public/backend route output.
- **C (high):** Generated reports, report-server payloads, filenames, webhook completion URLs.
- **D (high):** Presigned uploads/downloads, import previews, discrepancy payloads.
- **E (medium):** Admin tables and client caches that render or retain sensitive fields unnecessarily.
- **F (medium):** Shared types that make PII broad by default.

Apply `skills/auth-check-patterns/SKILL.md` when exposure also depends on privilege or scope.

## Mechanical scans

`scan-pii-data.txt`, `scan-upload.txt`, `scan-api-routes.txt`, `scan-validation.txt`,
`scan-client-api-ui.txt`, `scan-messages-envelopes.txt`.

## Not a finding examples

- Full voter row passed within a server-only helper when no response, log, file, or client boundary is crossed.
- Admin-only PII display that is required for the workflow and already route-scoped.

## Final checklist

- [ ] Export/report/download paths checked for owner or jurisdiction proof.
- [ ] No finding relies only on field sensitivity without an exposure path.
