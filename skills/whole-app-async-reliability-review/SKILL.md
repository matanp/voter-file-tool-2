---
name: whole-app-async-reliability-review
description: Run a findings-only whole-app async reliability review in voter-file-tool (report jobs, webhooks, imports, realtime status, retries, idempotency, partial failures). Use for WHOLE_APP_ASYNC_RELIABILITY_REVIEW deliverables.
---

# Whole-App Async Reliability Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology:** [WHOLE_APP_ASYNC_RELIABILITY_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_ASYNC_RELIABILITY_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze async-reliability
pnpm review:scans async-reliability
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Use [auth-check-patterns](../auth-check-patterns/SKILL.md) for backend callbacks or status routes whose reliability depends on caller identity. Use [adding-reports](../adding-reports/SKILL.md) for report job chains.
