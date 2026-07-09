# Whole-App Migration & Data Evolution Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-migration-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for schema/data evolution, enum rollout, backfill
assumptions, compatibility with existing records, and deploy ordering. Product citations should use
`schema.prisma` and product code; migration SQL remains out of manifest unless mentioned as boundary
context.

---

## Delta from base

| Topic | Migration & data evolution vector |
| --- | --- |
| **Axis** | Existing-data breakage likelihood × rollback/backfill cost |
| **Scan profile** | `migration-data-evolution` |
| **Deliverable** | `docs/WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_<model-slug>_YYYY-MM-DD.md` |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze migration
pnpm review:scans
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | New required field, enum transition, or uniqueness change can break existing production data or deploy order. |
| **Medium** | Backfill/default assumption is implicit and could fail for realistic historical rows. |
| **Low** | Cleanup/deprecation path is unclear but current data remains compatible. |

## Lane emphasis

- **F (high):** `schema.prisma`, enum/default/unique/index changes, shared Prisma helpers.
- **B (high):** Membership/status data shape evolution and repair paths.
- **C (medium):** Report type additions across Prisma enum, shared schemas, and worker payloads.
- **A (medium):** Route assumptions about nullable vs required fields.

## Mechanical scans

`scan-migration-data.txt`, `scan-domain-enums.txt`, `scan-prisma-writes.txt`,
`scan-validation.txt`, `scan-shared-helpers.txt`. For reports, also run `pnpm review:report-matrix`.

## Not a finding examples

- A new optional field with a server-side fallback and no required migration behavior.
- Historical cleanup that is documented as a one-off operator task and not needed for current branch behavior.

## Final checklist

- [ ] Existing null/legacy/enum values checked before scoring a finding High.
- [ ] Report type changes checked with the report contract matrix when relevant.
