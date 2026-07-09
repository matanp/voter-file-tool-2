---
name: whole-app-contracts-review
description: Run a findings-only whole-app cross-boundary contract review in voter-file-tool (API envelopes, shared Zod, client hooks, report-server payloads). Use for silent integration mismatch review or WHOLE_APP_CONTRACTS_REVIEW deliverable.
---

# Whole-App Contracts Review (draft)

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology (axis, severity rubric, lane emphasis, evidence standard, scan triage, final checklist):** [WHOLE_APP_CONTRACTS_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_CONTRACTS_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze contracts
pnpm review:scans
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Lane C (UI form → `generateReport` → report-server `jobData.type` chain) → [adding-reports](../adding-reports/SKILL.md). Use `pnpm review:report-matrix` for report contract triage.
