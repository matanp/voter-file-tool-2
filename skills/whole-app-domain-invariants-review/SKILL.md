---
name: whole-app-domain-invariants-review
description: Run a findings-only whole-app domain invariant review in voter-file-tool (state machines, persisted validity, audit completeness). Use for membership/seat/report state integrity review or WHOLE_APP_DOMAIN_INVARIANTS_REVIEW deliverable.
---

# Whole-App Domain Invariants Review (draft)

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology (axis, severity rubric, lane emphasis, high-signal questions, scan triage, final checklist):** [WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze domain-invariants
pnpm review:scans
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Lane B/F carry the weight; deep-read `apps/frontend/prisma/schema.prisma`. When scope affects who can trigger a transition → [auth-check-patterns](../auth-check-patterns/SKILL.md). Schema-shape gaps: [SCHEMA_IMPROVEMENTS.md](../../docs/SCHEMA_IMPROVEMENTS.md).
