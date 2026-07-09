# Whole-App Review Methodology (base)

**Purpose:** Shared, vector-agnostic base for findings-only whole-app reviews at the current branch
tip. Each review **vector** is a thin *delta* overlay that inherits everything here and only states what differs —
axis, severity rubric, lane emphasis, scan triage, not-a-finding examples, final checklist. Read this
base plus one vector delta; do not read prior review deliverables.

**Vectors:** Prefix, scan profile, axis, and methodology-doc path all resolve from the vector
registry `scripts/review/vectors.conf` (name | prefix | scan_profile | axis). Pass the **vector name**
to the tooling — no env vars to export beyond `MODEL_SLUG`. Vector deltas and skills:

| Vector | Delta methodology | Overlay skill |
| --- | --- | --- |
| Architecture & maintainability | [WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md](./WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md) | `skills/whole-app-architecture-review/SKILL.md` |
| Trust boundary | [WHOLE_APP_TRUST_BOUNDARY_REVIEW_METHODOLOGY.md](./WHOLE_APP_TRUST_BOUNDARY_REVIEW_METHODOLOGY.md) | `skills/whole-app-trust-boundary-review/SKILL.md` |
| Domain invariants | [WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_METHODOLOGY.md](./WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_METHODOLOGY.md) | `skills/whole-app-domain-invariants-review/SKILL.md` |
| Cross-boundary contracts | [WHOLE_APP_CONTRACTS_REVIEW_METHODOLOGY.md](./WHOLE_APP_CONTRACTS_REVIEW_METHODOLOGY.md) | `skills/whole-app-contracts-review/SKILL.md` |
| Validation & testability | [WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_METHODOLOGY.md](./WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_METHODOLOGY.md) | `skills/whole-app-validation-testability-review/SKILL.md` |
| PII & data exposure | [WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_METHODOLOGY.md](./WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_METHODOLOGY.md) | `skills/whole-app-pii-review/SKILL.md` |
| Async reliability | [WHOLE_APP_ASYNC_RELIABILITY_REVIEW_METHODOLOGY.md](./WHOLE_APP_ASYNC_RELIABILITY_REVIEW_METHODOLOGY.md) | `skills/whole-app-async-reliability-review/SKILL.md` |
| Migration & data evolution | [WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_METHODOLOGY.md](./WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_METHODOLOGY.md) | `skills/whole-app-migration-review/SKILL.md` |
| Operations readiness | [WHOLE_APP_OPERATIONS_READINESS_REVIEW_METHODOLOGY.md](./WHOLE_APP_OPERATIONS_READINESS_REVIEW_METHODOLOGY.md) | `skills/whole-app-operations-review/SKILL.md` |

Base workflow skill: `skills/whole-app-review/SKILL.md`.

---

## Rules

- **Scope:** Product code only. Every scan and citation traces to `.review/product-files.txt`
  ([Appendix A](#appendix-a-product-code-manifest)). Exclude tests, mocks, coverage, node packages,
  build output, docs, lockfiles, generated artifacts, data dumps, and infrastructure unless a
  product boundary requires a brief mention. `packages/xlsx-tester/**` is always out of scope.
- **Manifest:** Run inventory and all scans from the repo root. Paths are repo-relative everywhere.
  Artifacts live under `.review/` (gitignored; not `/tmp/`). Do not widen `find` roots or ad-hoc
  exclusion globs.
- **Output:** Findings register only — no remediation log, phases, tickets, or proposed code changes.
  One-sentence **Opportunity** per finding is OK; solution design belongs in a later pass.
- **Count:** **8–20** combined Findings + Backlog-only notes **after merge**. Lanes report
  unbounded; the final editor deduplicates and lands in range. Merge same-root-cause nits; prefer
  ownership-framed entries over symptoms.
- **Paths in findings:** Repo-relative, **one path per backtick pair** (e.g.
  `` `apps/frontend/src/foo.ts` `` — repeat for each file). Never comma-separate, brace-expand, or
  glob inside backticks; the scope gate treats the whole string as one path. No bare paths, line
  numbers, or colon suffixes. Required for the mechanical scope gate.
- **Skills:** Lane A → `skills/auth-check-patterns/SKILL.md` (mandatory). Any lane touching
  auth/privileges/scope → same. Report extensibility → `skills/adding-reports/SKILL.md`.
  Base workflow → `skills/whole-app-review/SKILL.md`. Each vector adds its own overlay skill (see
  the vector table above).
- **Axis:** Each vector delta names its axis and what it prioritizes over noise. Stay on that axis;
  route off-axis observations to the matching vector rather than reporting them here.
- **Reading:** Summarize by subsystem first; read 3–8 related files at a time; stop once evidence
  is met; keep a "not a finding" list; do not read docs for implementation (skills excepted).

---

## Deliverable

**Path:** `docs/<PREFIX>_<model-slug>_YYYY-MM-DD.md` — the vector `<PREFIX>` from
`scripts/review/vectors.conf`, the reviewer **model slug** (e.g. `claude-sonnet-5`,
`composer-2.5-fast`), and the run **date** (same as Basis). `pnpm review:freeze <vector>` prints the
exact path. Pass it to the scope gate.

| # | Section | Content |
|---|---------|---------|
| 1 | Basis | Branch, commit, date, model, file count, sha256 checksum, axis |
| 2 | At a glance | Prioritized table: severity, blast, opportunity |
| 3 | Subsystem map | Product areas and defining files/routes/packages |
| 4 | Findings | Evidence-backed; High/Medium/Low; ordered by leverage |
| 5 | Already good | Patterns to preserve |
| 6 | Backlog-only notes | Real but deferred; no severity |
| 7 | Not a finding | Rejected candidates, one line each |
| 8 | Escalations | Optional; some vectors use it (see delta), others fold bare bugs into Findings |

### Templates

```md
## Basis
- **Branch:** `feat/...` · **Commit:** `abc1234` · **Date:** YYYY-MM-DD · **Model:** `<model-slug>`
- **Deliverable:** `docs/<PREFIX>_<model-slug>_YYYY-MM-DD.md`
- **Product files:** N · **checksum:** `<sha256>` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze <vector>` ([Appendix A](#appendix-a-product-code-manifest))
- **Axis:** per vector delta
```

```md
## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Short title | High | large | Terse direction (≤8 words) |
**Counts:** N findings · M backlog-only notes · K escalations (omit K if the vector has no Escalations)
```

```md
### N. Short, specific finding title
**Severity: High|Medium|Low · Blast radius: large|medium|small**
**What & where.** One repo-relative path per backtick pair ([Rules](#rules)).
**Why it hurts.** Risk statement for this vector's axis.
**Opportunity.** One sentence; no implementation design.
**Evidence.** Commands, comparisons, or reading that proved it.
```

```md
### B1. Short deferred / boundary note title
**What & where.** Same backtick path rules.
**Why defer.** Migration cost or low leverage.
**Future direction.** One sentence if a later pass should revisit.
```

**Not a finding** (section 7):
```md
- **Tempting candidate** — one sentence why rejected.
- **Invite validity vs display split** — `apps/frontend/src/lib/invites/validity.ts` and
  `apps/frontend/src/lib/invites/display.ts` are intentionally separate concerns; not enough drift
  to merge.
```

**Blast radius:** large = spans app + report-server or many families; medium = one subsystem,
several entry points; small = one route/component/helper/package.

---

## Workflow

1. **Freeze basis** — Run `pnpm review:freeze <vector>` ([Appendix A](#appendix-a-product-code-manifest));
   record branch, commit, date, model, file count, sha256 checksum in Basis. Set the reviewer slug
   with `MODEL_SLUG=… pnpm review:freeze <vector>`.
2. **Subsystem map** — Read [Appendix B boundary files](#appendix-b-boundary-files--subsystem-buckets)
   first; map by product capability ([Appendix B table](#appendix-b-boundary-files--subsystem-buckets));
   mark each bucket high/medium/light depth.
3. **Mechanical scans** — Run `pnpm review:scans`; triage `.review/scan-*.txt` ([Mechanical scans](#mechanical-scans));
   group hits by repeated product concept, not text similarity.
4. **Lane deep-dives** — Work [lanes A–F](#review-lanes) per the vector's lane emphasis; write
   findings immediately after each.
5. **Draft & dedupe** — Same root cause → one finding; order by leverage; target 8–20 combined
   Findings + Backlog-only notes at merge.
6. **Calibrate** — Add Already good / Not a finding; downgrade cosmetic items; apply the vector's
   backlog-vs-finding triage.
7. **Finalize** — At-a-glance table, counts, `pnpm review:gate <deliverable>` ([scope gate](#evidence--scope-gate)); resolve every gate hit.

**Parallel runs:** Split by lane; same manifest for all reviewers. Lane drafts:
`.review/lane-<A-F>_<model-slug>.md` (e.g. `.review/lane-A_composer-2.5-fast.md`). Lanes uncapped.
Final editor reads all lane files + `.review/product-files.txt`, merges subsystem map, dedupes,
enforces evidence standard, lands 8–20 combined Findings + Backlog-only notes, orders by leverage,
writes the deliverable under `docs/`.

---

## Review lanes

Lanes are a fixed **geography** across all vectors; each vector delta sets per-lane depth and the
questions to ask. Same lettering everywhere so parallel reviewers and drafts line up.

| Lane | Surfaces |
| --- | --- |
| **A** | API route contracts & trust boundaries: `withPrivilege`/`withBackendCheck`/`withPublic`; `validateRequest` + shared Zod vs ad-hoc validation; response envelopes; data scope (owner, jurisdiction, PII); transactions, P2002, audit writes. |
| **B** | Domain services & business rules: membership request/confirm/reject/remove/replace; eligibility/BOE flagging; seats, roster, designation weight; petitions; report job lifecycle; import normalization. |
| **C** | Reports & report-server extensibility: UI cards/forms/labels; Zod unions; `scopeReportRegistry`; API route maps; report-server fetch/transform/HTML/XLSX; shared registries. |
| **D** | Upload/import & discrepancy flows: presigned uploads, import normalization, discrepancy resolution/undo; repeated upload state, validation, submit, toast patterns. |
| **E** | Admin UI, shared UI & hooks: CRUD tables/dialogs; search controls; report status tracking; confirm/destructive/undo; loading/empty/toast consistency; `useApi*` usage. |
| **F** | Shared packages & Prisma schema: package ownership (`shared-validators`, `shared-prisma`, `voter-import-processor`, report-server imports); boundary inversions; `schema.prisma` invariants. |

For each subsystem bucket, also record: entry points; shared dependencies; repeated concepts
(enums, scope checks, labels, envelopes, audit metadata, report types); abstractions worth preserving.

---

## Mechanical scans

Run from repo root in an **unsandboxed shell** (normal terminal, Codex VM, or Cursor with full
permissions). Use the repo scripts:

```sh
pnpm review:freeze <vector>   # manifest → .review/product-files.txt; Basis block + deliverable path
pnpm review:scans             # scan-*.txt under .review/ (profile from the frozen basis or a vector arg)
pnpm review:route-inventory   # API method/wrapper/privilege TSV
pnpm review:report-matrix     # report schema/mapping/UI/worker TSV
pnpm review:doctor            # sanity-check review docs, skills, registry, and scripts
```

The scan profile (which `scan-*.txt` files are produced) is resolved from the vector's
`scan_profile` column in `scripts/review/vectors.conf`. Implementation:
`scripts/review/run-scans.sh` (sources `scripts/review/lib.sh`; scan patterns and profile→scan
lists are data tables there). Some agent sandboxes break `xargs`
(`sysconf(_SC_ARG_MAX) failed`); the script falls back automatically. Pipe the manifest into `rg` —
never scan raw directory trees.

**Full scan catalog** (a vector's profile selects a subset): `scan-api-routes.txt`,
`scan-validation.txt`, `scan-parse-casts-params.txt`, `scan-domain-enums.txt`,
`scan-prisma-writes.txt`, `scan-client-api-ui.txt`, `scan-upload.txt`, `scan-messages-envelopes.txt`,
`scan-labels.txt`, `scan-shared-helpers.txt`, `scan-pii-data.txt`, `scan-async-jobs.txt`,
`scan-migration-data.txt`, `scan-operations.txt`, `scan-api-route-wrappers.txt` (from
`pnpm check:api-routes`). The vector delta lists which scans its profile emits and the triage order.

Additional review artifacts:

- `api-route-inventory.tsv` — route, method, wrapper, and `withPrivilege` argument.
- `report-contract-matrix.tsv` — report type presence across Prisma enum, shared schemas, mappings,
  scoped UI registry, and report-server branches.
- `test-coverage-map.txt` — route/schema test mirror heuristic for the validation vector.

Manual `scan()` for ad-hoc patterns (requires `.review/product-files.txt`):

```sh
source scripts/review/lib.sh
scan_manifest 'your-pattern' 'optional/subpath/filter'   # stdout
```

Clone/similarity tools are triage only — a finding requires duplicated responsibility, a real
contract/invariant mismatch, or likely drift, per the vector's axis.

**High signal (general):** same rule in API/UI/worker/package; parallel registries/unions/labels;
inconsistent route contracts; repeated upload/form scaffolding; rebuilt query scope or jurisdiction
filters; duplicate status transitions; server/client display formatting.

**Low signal (general):** small JSX repetition; intentional domain duplication; one-off boundary
adapters; generated UI primitives unless inconsistently modified.

---

## Evidence & scope gate

Every finding: concrete backticked files; repeated symbols/handlers; observed drift, mismatch, or
invariant gap; terse opportunity. Answer *similar/divergent in what responsibility, and why does it
matter?* on the vector's axis.

```sh
pnpm review:gate docs/<PREFIX>_<model-slug>_YYYY-MM-DD.md
# or: REVIEW_DOC=docs/... pnpm review:gate
```

Implementation: `scripts/review/scope-gate.sh`. Writes `.review/cited-files.txt` and reports
violations. Expected: no output except `scripts/` paths (tag as boundary context in the finding).
Fix missed paths in the finding text — do not hand-edit `.review/cited-files.txt`. Every other line is
a scope violation: drop the finding or tag as boundary context. Comma-separated or brace-expanded
paths inside a single backtick pair fail the gate even when each file is in the manifest — cite
each file in its own pair ([Rules](#rules)).

Checksum helper: macOS `shasum -a 256`; Linux `sha256sum` (used by `pnpm review:freeze`).

---

## Appendix A: Product-code manifest

**In scope:** `apps/frontend/src/**`, `apps/frontend/prisma/schema.prisma`, `apps/report-server/src/**`,
`packages/shared-prisma/src/**`, `packages/shared-validators/src/**`,
`packages/voter-import-processor/src/**`, plus boundary configs (`next.config.ts`, in-scope
`package.json` files).

**Light touch, not in `find` roots:** `apps/frontend/scripts/**`, top-level `scripts/**` — cite
only with a boundary-context tag; the gate surfaces `scripts/` hits so they can't slip through.

**Light touch, in the manifest:** legacy `apps/report-server/components/**` is a `find` root (so
it lands in `.review/product-files.txt`). Product report UI lives under
`apps/report-server/src/components/**`; cite legacy files only if something still imports
`report-server/components` (expected: no matches).

**Out of scope:** tests/mocks/fixtures; `node_modules`/`.next`/`.vercel`/build output; docs/plans;
migrations (use `schema.prisma`); lockfiles; CSS; `packages/xlsx-tester/**`.

```sh
pnpm review:freeze <vector>
# optional: MODEL_SLUG=composer-2.5-fast pnpm review:freeze <vector>
```

Implementation: `scripts/review/freeze-basis.sh`. Equivalent manual inventory:

```sh
mkdir -p .review
find \
  apps/frontend/src apps/frontend/prisma apps/frontend/next.config.ts apps/frontend/package.json \
  apps/report-server/src apps/report-server/components apps/report-server/package.json \
  packages/shared-prisma/src packages/shared-prisma/package.json \
  packages/shared-validators/src packages/shared-validators/package.json \
  packages/voter-import-processor/src packages/voter-import-processor/package.json \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
    -o -name '*.prisma' -o -name 'package.json' \) \
  -not -path '*/__tests__/*' -not -name '*.test.*' -not -name '*.spec.*' \
  -not -path '*/__mocks__/*' -not -path '*/coverage/*' \
  -not -path '*/dist/*' -not -path '*/build/*' \
  2>/dev/null | sort > .review/product-files.txt
wc -l < .review/product-files.txt
shasum -a 256 .review/product-files.txt    # macOS; Linux: sha256sum
```

Record file count and checksum in Basis. Checksum is an in-run integrity marker, not cross-time
reproducibility. Rough size when drafted: ~352 files. If `apps/frontend/src/middleware.ts` is
added, include it in `find` roots and Appendix B.

---

## Appendix B: Boundary files & subsystem buckets

### Boundary files (read before lane work)

| File / pattern | Why |
| --- | --- |
| `apps/frontend/src/auth.ts` | NextAuth, session/privilege callbacks |
| `apps/frontend/src/app/api/auth/[...nextauth]/route.ts` | Auth route entry |
| `apps/frontend/src/app/api/lib/withPrivilege.ts` | API trust-boundary wrappers |
| `apps/frontend/src/app/api/lib/validateRequest.ts` | Shared request-body/query validation |
| `apps/frontend/src/env.js` | Env validation |
| `apps/frontend/next.config.ts` | Transpilation, monorepo resolution |
| `apps/frontend/package.json`, `apps/report-server/package.json` | Workspace deps |
| `packages/shared-prisma/src/index.ts` | Shared Prisma-shaped helpers |
| `packages/shared-validators/src/index.ts` | Schemas, registries |
| `packages/shared-validators/src/scopeReportRegistry.ts` | Scoped report descriptor registry |
| `packages/voter-import-processor/src/index.ts` | Import/normalization surface |
| `packages/*/package.json` (in-scope) | Exports, dependency boundaries |
| `apps/report-server/src/reportProcessors/index.ts` | Report processor barrel |
| `apps/report-server/components/**` | Legacy orphan; product uses `src/components/**` |

### Subsystem buckets

| Subsystem | Surfaces | Depth |
| --- | --- | --- |
| Auth, invites, users, role-gated UI | `auth.ts`, `api/auth/**`, `lib/invites/**`, `admin/users/**`, `components/providers/GlobalContext.tsx`, `components/ui/authcheck.tsx`, `api/admin/jurisdictions/**` (Leader assignment) | high |
| API route infrastructure | `api/lib/**`, `withPrivilege`/`withBackendCheck`/`withPublic`, validators, envelopes | high |
| Voter search & query processing | `recordsearch/**`, `components/search/**`, `api/fetchFilteredData/**`, `searchQuery*` (shared-validators), `lib/searchFieldProcessor.ts`, `contexts/VoterSearchContext.tsx` | medium |
| Committee membership core | `committees/**`, `api/committee/{add,remove,requestAdd,handleRequest,…}`, seat utilities, eligibility preflight/service | high |
| Committee roster & seat views | roster APIs/table, designation weight, report triggers | medium |
| Governance config, terms, jurisdictions | `admin/governance-config/**`, `admin/terms/**`, `api/admin/{governance-config,terms,jurisdictions}/**` | medium |
| Admin data hub & election reference data | `admin/data/**`, `admin/dashboard/**`, `config/adminNav.ts`, `AdminSidebar.tsx`, election dates/offices CRUD | medium |
| LTED crosswalk & weighted import | `admin/data/{LtedCrosswalkTab,WeightedTableImport}`, `api/admin/{crosswalk,weightedTable}/**`, `lib/lted/**` | medium |
| Meetings & executive confirmation | `admin/meetings/**`, confirmation service, decisions/submissions APIs | medium |
| Petition reports & outcomes admin | `/petitions`, designated petition schema, `admin/petition-outcomes/**`, membership confirmation tie-in | medium |
| Reports UI, jobs & realtime status | report hubs/forms/grids, `reportJobs`/`reports`/`reportComplete`, Ably/token, status trackers | high |
| Non-scoped & advanced reports | `committee-reports/**`, `voter-list-reports/**`, absentee/voter-import report paths | medium |
| Report server generation | `apps/report-server/src/**`, processors, xlsx/html, webhooks | high |
| Upload/import workflows | voter/absentee import, presigned uploads, `voter-import-processor`, S3 helpers | high |
| Committee discrepancy & bulk load | `admin/data/CommitteeUploadDiscrepancies.tsx`, discrepancy routes/undo, `bulkLoadCommittees`/`bulkLoadData` | medium |
| Eligibility flagging | eligibility flags admin, BOE flagging, review/run routes | medium |
| Audit trail | audit helpers, admin UI, export/detail, metadata formatting | medium |
| Shared validators & shared prisma | schemas, registries, cross-package source-of-truth | high |
| Shared UI & hooks | `components/ui`, `components/search`, `hooks/useApi*`, `useFileUpload` | medium |
| Prisma domain model | `schema.prisma`, invariants, constraints, relations | high |
