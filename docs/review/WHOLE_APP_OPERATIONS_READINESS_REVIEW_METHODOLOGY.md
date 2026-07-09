# Whole-App Operations Readiness Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-operations-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for deploy/runtime assumptions, environment
validation, observability, operational recovery, and failure clarity. Not a UX polish review; only
flag user messages when they block operators from diagnosing or recovering production issues.

---

## Delta from base

| Topic | Operations readiness vector |
| --- | --- |
| **Axis** | Production incident likelihood × diagnosis/recovery cost |
| **Scan profile** | `operations-readiness` |
| **Deliverable** | `docs/WHOLE_APP_OPERATIONS_READINESS_REVIEW_<model-slug>_YYYY-MM-DD.md` |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze operations
pnpm review:scans
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Missing runtime config validation, silent production failure, or no recovery path for critical workflow. |
| **Medium** | Weak logging/observability around important async or privileged operations. |
| **Low** | Local fallback/message ambiguity with small operational blast radius. |

## Lane emphasis

- **A (medium):** API failure envelopes, backend-only route diagnostics, env-dependent behavior.
- **C/D (high):** Report generation and import failure surfaces, retry/recovery handoffs.
- **E (medium):** Admin/operator visibility into failed jobs, uploads, and audits.
- **F (high):** `env.js`, package scripts, shared helpers around external systems.

## Mechanical scans

`scan-operations.txt`, `scan-upload.txt`, `scan-async-jobs.txt`, `scan-messages-envelopes.txt`,
`scan-api-routes.txt`.

## Not a finding examples

- Developer-only console output in local scripts outside product runtime.
- Missing metrics for a low-frequency admin action that has clear UI recovery.

## Final checklist

- [ ] Findings identify the operator-facing symptom and the missing diagnostic or recovery evidence.
- [ ] Env/config issues are tied to product runtime, not generic deployment preference.
