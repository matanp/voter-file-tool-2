---
name: whole-app-review
description: Shared workflow for findings-only whole-app reviews in voter-file-tool (manifest, scans, lanes, scope gate). Use as the base when running any WHOLE_APP_*_REVIEW vector; pair with a vector-specific skill overlay.
---

# Whole-App Review (base)

All vectors share this workflow. Pick an **axis overlay** skill for rubric, lane emphasis, and deliverable name.

| Vector | Overlay skill | Methodology |
| --- | --- | --- |
| Architecture & maintainability | [whole-app-architecture-review](../whole-app-architecture-review/SKILL.md) | [ARCHITECTURE](../../docs/review/WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md) |
| Trust boundary | [whole-app-trust-boundary-review](../whole-app-trust-boundary-review/SKILL.md) | [TRUST_BOUNDARY](../../docs/review/WHOLE_APP_TRUST_BOUNDARY_REVIEW_METHODOLOGY.md) |
| Domain invariants | [whole-app-domain-invariants-review](../whole-app-domain-invariants-review/SKILL.md) | [DOMAIN_INVARIANTS](../../docs/review/WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_METHODOLOGY.md) |
| Cross-boundary contracts | [whole-app-contracts-review](../whole-app-contracts-review/SKILL.md) | [CONTRACTS](../../docs/review/WHOLE_APP_CONTRACTS_REVIEW_METHODOLOGY.md) |
| Validation & testability | [whole-app-validation-testability-review](../whole-app-validation-testability-review/SKILL.md) | [VALIDATION_TESTABILITY](../../docs/review/WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_METHODOLOGY.md) |
| PII & data exposure | [whole-app-pii-review](../whole-app-pii-review/SKILL.md) | [PII_DATA_EXPOSURE](../../docs/review/WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_METHODOLOGY.md) |
| Async reliability | [whole-app-async-reliability-review](../whole-app-async-reliability-review/SKILL.md) | [ASYNC_RELIABILITY](../../docs/review/WHOLE_APP_ASYNC_RELIABILITY_REVIEW_METHODOLOGY.md) |
| Migration & data evolution | [whole-app-migration-review](../whole-app-migration-review/SKILL.md) | [MIGRATION_DATA_EVOLUTION](../../docs/review/WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_METHODOLOGY.md) |
| Operations readiness | [whole-app-operations-review](../whole-app-operations-review/SKILL.md) | [OPERATIONS_READINESS](../../docs/review/WHOLE_APP_OPERATIONS_READINESS_REVIEW_METHODOLOGY.md) |
| Data lifecycle & retention | [whole-app-data-lifecycle-review](../whole-app-data-lifecycle-review/SKILL.md) | [DATA_LIFECYCLE_RETENTION](../../docs/review/WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md) |

## Quick start

Pass the **vector name** to the tooling — it resolves the prefix, scan profile, axis, and
methodology doc from the registry (`scripts/review/vectors.conf`). No env vars to export.

```bash
# Vector names: architecture · trust · domain-invariants · contracts · validation · pii · async-reliability · migration · operations · data-lifecycle
MODEL_SLUG=<your-model-slug> pnpm review:freeze trust
pnpm review:scans trust      # writes scans into the frozen run directory
# validation vector also: pnpm review:test-map
pnpm review:gate docs/<DELIVERABLE>.md   # freeze prints the deliverable path
```

The deliverable path, Basis block, and review run directory are printed by `pnpm review:freeze`.
Read the vector overlay skill for severity rubric, lane emphasis, and triage rules.

## Shared workflow

1. **Freeze basis** — `pnpm review:freeze <vector>` to completion; do not run freeze and scans in parallel. Use the unique `.review/runs/<run-id>/` scratch directory it creates (`.review/current` points at it).
2. **Subsystem map** — [reference.md](reference.md) boundary files + [Appendix B](../../docs/review/WHOLE_APP_REVIEW_METHODOLOGY.md#appendix-b-boundary-files--subsystem-buckets) in the base methodology.
3. **Mechanical scans** — `pnpm review:scans <vector>` immediately after freeze in the same session; outputs stay in the run directory. Do not triage scan files until both commands finish.
4. **Lane deep-dives** — Lanes A–F per overlay emphasis. For parallel lane splits, draft `.review/runs/<run-id>/lane-<A-F>_<model-slug>.md`; single-reviewer runs may synthesize directly into the deliverable.
5. **Draft & dedupe** — Target **8–20** combined Findings + Backlog-only notes.
6. **Calibrate** — Already good / Not a finding per overlay rules.
7. **Finalize** — `pnpm review:gate` on deliverable.

## Shared rules

- **Scope:** Product code only; manifest `.review/runs/<run-id>/product-files.txt` ([Appendix A](../../docs/review/WHOLE_APP_REVIEW_METHODOLOGY.md#appendix-a-product-code-manifest)).
- **Citations:** Repo-relative; **one path per backtick pair**; no line numbers in backticks.
- **Output:** Findings register only — no remediation log.
- **Lanes A–F:** Same geography across vectors; overlay skill defines emphasis and questions.
- **Scratch:** Treat root `.review/` files as stale unless they are pointers into the current run directory.

## Lane map (geography)

| Lane | Surfaces |
| --- | --- |
| **A** | API routes, wrappers, validation, envelopes, scope |
| **B** | Domain services, status transitions, business rules |
| **C** | Reports, registries, report-server |
| **D** | Upload/import, discrepancies |
| **E** | Admin UI, hooks, client API usage |
| **F** | Packages, `schema.prisma` |

## Mechanical tooling

| Command | Purpose |
| --- | --- |
| `pnpm review:freeze <vector>` | Resolve vector from `scripts/review/vectors.conf`; create `.review/runs/<run-id>/`; write manifest + checksum + Basis block |
| `pnpm review:scans <vector>` | Scan-profile subset → run-local `scan-*.txt` |
| `pnpm review:test-map` | Product routes/schemas vs `__tests__/` mirror (validation vector), run-local output |
| `pnpm review:route-inventory` | API method → wrapper/privilege TSV for trust and PII reviews, run-local output |
| `pnpm review:report-matrix` | Report type contract TSV across schema/mapping/UI/worker, run-local output |
| `pnpm review:doctor` | Validate vector docs, skills, scripts, and stale workflow markers |
| `pnpm review:gate` | Cited paths vs run-local manifest |

Templates: [reference.md](reference.md).
