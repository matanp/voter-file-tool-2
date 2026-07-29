# Whole-App Async Reliability Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-async-reliability-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for background jobs, report completion webhooks,
realtime status, imports, retries, idempotency, and partial-failure recovery. Not a performance
review unless latency causes incorrect lifecycle state.

---

## Delta from base

| Topic | Async reliability vector |
| --- | --- |
| **Axis** | Stuck/duplicate/partial async state likelihood × operator recovery cost |
| **Scan profile** | `async-reliability` |
| **Deliverable** | `docs/WHOLE_APP_ASYNC_RELIABILITY_REVIEW_<model-slug>_YYYY-MM-DD.md` |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze async-reliability
pnpm review:scans async-reliability
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Duplicate webhook/import can corrupt state, or a common failure leaves jobs permanently wrong with no repair path. |
| **Medium** | Missing retry/idempotency around external calls, or inconsistent terminal status handling. |
| **Low** | Weak operator visibility or recoverability for narrow async edge cases. |

## Lane emphasis

- **C (high):** Report job create/process/complete lifecycle; report-server webhook behavior.
- **D (high):** Upload/import processing, repeated submissions, discrepancy undo after partial work.
- **A (medium):** Idempotent completion routes, status response contracts, backend auth for callbacks.
- **E (medium):** Realtime status UI and user-visible recovery options.
- **F (medium):** Shared job payload types and durable status enums.

## Mechanical scans

`scan-async-jobs.txt`, `scan-prisma-writes.txt`, `scan-messages-envelopes.txt`,
`scan-shared-helpers.txt`, `scan-api-routes.txt`.

## High-signal questions

- Can duplicate delivery of the same callback change state twice?
- Are terminal job states mutually exclusive and durable?
- Can an import/report fail after DB write but before user-visible completion?

## Final checklist

- [ ] At least one pass traces async state from creation through terminal state.
- [ ] Findings distinguish user retry behavior from backend idempotency.
