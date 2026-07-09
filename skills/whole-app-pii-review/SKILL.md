---
name: whole-app-pii-review
description: Run a findings-only whole-app PII and data exposure review in voter-file-tool (voter/contact data, exports, downloads, presigned URLs, logs, report payloads). Use for WHOLE_APP_PII_DATA_EXPOSURE_REVIEW deliverables.
---

# Whole-App PII & Data Exposure Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology:** [WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze pii
pnpm review:scans
pnpm review:route-inventory
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Use [auth-check-patterns](../auth-check-patterns/SKILL.md) whenever exposure depends on privilege, ownership, jurisdiction, or route wrapper behavior. Lane C report exposure should also use [adding-reports](../adding-reports/SKILL.md).
