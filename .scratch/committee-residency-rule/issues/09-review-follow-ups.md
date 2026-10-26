# 09 - Follow-ups from the pre-deploy review of the branch

Status: resolved
Type: task

## Why

Before deploying `committee-residency-rule-module` (`main...bb7ecc8`: tickets 03, 08 and 06, plus
`5db65f3`, which batches the LTED imports), three reviews looked at the branch: standards, spec and
deploy safety. None found a blocker, and the branch was deployed. This ticket collects what they
flagged as non-blocking.

Some items concern the import routes from `5db65f3` (`.scratch/lted-import-timeouts/`) rather
than the residency rule. They are recorded here because they came out of the same review. Split
them out during triage if that's more useful.

Checks that passed at review time:
- the shared-prisma build and tests (35)
- the frontend typecheck and jest (125 suites, 1,718 tests)
- ESLint on the changed files
- `check-api-route-wrappers`
- `ltedImports.pg.integration.test.ts` against the local `voter_file_test` DB (3 of 3)

## Findings

### Import routes

1. **Concurrent crosswalk imports fail with a generic 500.**
   `apps/frontend/src/app/api/admin/crosswalk/import/route.ts` reads the existing rows with
   `findMany` outside the `$transaction`, then runs `createMany` inside it. If two imports run at
   once, the second hits P2002 on `@@unique([cityTown, legDistrict, electionDistrict])`. The
   transaction rolls back cleanly, so no data is harmed, but the admin sees only "Import failed".
   Fix: do the read inside the transaction, or catch P2002 and return a clear 409. This comes from
   the "State race" item in the `AGENTS.md` checklist.
2. **No negative auth tests for either import route.** `crosswalk/import.test.ts` and
   `weightedTableImport.test.ts` mock only Admin. Add tests for an unauthenticated request and for
   one below Admin (the "Negative auth" item in the `AGENTS.md` checklist). This gap predates the
   branch.
3. **The weighted-table import writes no audit entry.** The route rewrites `CommitteeList.ltedWeight`
   and `Seat.weight` without calling `logAuditEvent`, though the crosswalk import does call it. This
   predates the branch, but `5db65f3` rewrote this write path (the "Audit/state invariants" item in
   the `AGENTS.md` checklist).
4. **There's no bulk way to clear the crosswalk.** The batched import never deletes rows, and the
   only delete in the app removes one row at a time (`/api/admin/crosswalk/[id]`). Ticket 08's
   cleanup (removing the mislabelled rows) therefore needs direct DB access. Consider a "replace all"
   import mode, or an admin action that clears the table. Old rows aren't harmless: they can make
   the weighted import's LD/ED fallback skip a district as ambiguous.
5. **The meaning of the crosswalk summary changed.** `updated` now counts only rows whose values
   changed, where it used to count every key that already existed. `unchanged` and `duplicates`
   are new. This is documented in the import-timeouts ticket. Confirm that the admin UI copy and
   anyone reading these numbers expect it. No action is needed if so.

### Tests: `skills/test-type-safety/SKILL.md`

6. **Casual casts on `prismaMock` delegates.** The skill says to avoid `as never` and `as jest.Mock`
   at call sites, and to call `prismaMock.<model>.<method>` directly.
   - `crosswalk/import.test.ts`: `prismaMock.$executeRaw as unknown as jest.Mock`,
     `createMany as jest.Mock`, and `(prismaMock.ltedDistrictCrosswalk.findMany as jest.Mock)`,
     repeated about 4 times.
   - `weightedTableImport.test.ts`: the same `$executeRaw` cast,
     `committeeList.findMany.mockResolvedValue([...] as never)`,
     `ltedDistrictCrosswalk.findMany.mockResolvedValue([] as never)` and
     `(committeeGovernanceConfig.findFirst as jest.Mock)`.

   Fix: use `satisfies` row types with the typed delegates. The `db as unknown as PrismaClient`
   helpers in the shared-prisma tests are fine: each is a single named helper with a stated reason.
7. **The repeated `NextRequest` cast belongs in `mocks.ts`.** The skill says a cast used 3 or more
   times moves to `mocks.ts`. `{ formData: ... } as unknown as NextRequest` now appears 4 times,
   including in `ltedImports.pg.integration.test.ts`.

### Residency module and the code around it (judgement calls)

8. **The same LTED key is built twice, in different formats.** The crosswalk route's `crosswalkKey`
   uses `a|b|c` and `committeeResidency.ts`'s `ltedKey` uses `a::b::c`. Pick one and share it.
9. **The import route constants are duplicated.** `maxDuration = 60` and
   `IMPORT_TRANSACTION_TIMEOUT_MS = 30_000`, with the same comment, appear in both import routes.
   So does the `UPDATE … FROM unnest(...)` statement inside a transaction.
10. **The LTED type is duplicated.** `CommitteeListLted` in `apps/frontend/src/lib/eligibilityPreflight.ts`
    is the same shape as shared-prisma's `CommitteeLted`. Import the shared one.
11. **Some exports are used only by tests.** `checkAssemblyDistrictResidency`,
    `findCommitteeAssemblyDistricts` and `CommitteeAssemblyDistrictLookup` are exported from
    shared-prisma's `index.ts`, but no app code uses them. Leave them alone if ticket 04 will use
    them; otherwise stop exporting them.
12. **`checkCommitteeResidency` reads backwards.** It returns a mismatch, or `null`, so
    `if (await checkCommitteeResidency(...))` means the voter *failed*. Rename it to something like
    `findResidencyMismatch`.

### Docs and tracker

13. **`docs/SHARED_PRISMA_ARCHITECTURE.md` is out of date.** It still calls shared-prisma a
    "Type-only package (no runtime dependencies)". The doc's own anti-patterns section allows
    server-only query helpers there, and `committeeResidency.ts` adds more of them, so update the
    overview. Ticket 07 could take this on.
14. **Ticket statuses aren't canonical.** Ticket 03 says `done` and ticket 06 says `resolved`; neither
    is one of the five canonical triage roles in `docs/agents/triage-labels.md`. Agree on one
    terminal status and use it.

## Acceptance

- Each finding is fixed, split into its own ticket, or marked won't-fix with a reason, recorded
  under `## Comments`.

## Comments

### 2026-10-25: triage

All 14 findings were checked against `main` (`b0023f7`), and all still applied. The fixes are on
branch `committee-residency-review-follow-ups`.

- **1. Concurrent crosswalk imports: wontfix.** Imports are rare and done by admins, two at once
  is very unlikely, and the transaction already rolls back cleanly. A clearer error isn't worth
  the code.
- **2. Negative auth tests: fixed** (`8c67e2e`). Both import routes now test an unauthenticated
  request (401) and requests from Leader, RequestAccess and ReadAccess (403), and check that
  nothing is read or written. The shared generator's Developer case was left out on purpose:
  Developer outranks Admin, and that case returns 403 only because the permission check is mocked.
- **3. Weighted-table audit entry: fixed** (`8c67e2e`). The route now writes a new
  `WEIGHTED_TABLE_IMPORTED` audit action, which adds migration
  `20261025000000_add_weighted_table_imported_audit_action`. Reusing `CROSSWALK_IMPORTED` would
  have broken the crosswalk's "last imported" time, which is read from its latest audit row.
- **4. Bulk crosswalk clear: split** into ticket 12 (`ready-for-human`). Choosing between the
  options is a product decision.
- **5. Crosswalk summary semantics: no action.** `LtedCrosswalkTab.tsx` already shows the Updated,
  Unchanged, Skipped and duplicates counts.
- **6, 7. Test casts: wontfix as a ticket.** They're cosmetic. Clean them up next time those test
  files are touched.
- **8. Two LTED key formats: wontfix.** Both are private `Map` keys that are never compared.
- **9. Duplicated import constants: wontfix.** There are only two copies, and a shared helper would
  couple two routes that are otherwise independent.
- **10. Duplicate LTED type: wontfix.** TypeScript compares the two by shape, so they can't drift
  into a bug. Fold it into any later change to `eligibilityPreflight.ts`.
- **11. Test-only exports: wontfix.** They're harmless: `checkAssemblyDistrictResidency`, now
  `findAssemblyDistrictMismatch`, is the pure rule, and exporting it doesn't let anyone bypass it.
- **12. Backwards name: fixed** (`c535000`). `checkCommitteeResidency` is now
  `findResidencyMismatch`, and `checkAssemblyDistrictResidency` is now
  `findAssemblyDistrictMismatch`. Behaviour is unchanged.
- **13. Stale shared-prisma doc: fixed** (`c535000`, `52bf2a3`). The doc now describes types plus
  server-only helpers, and also corrects the stale "frontend has no shared-prisma dependency" line.
- **14. Non-canonical statuses: fixed.** `resolved` is now the official terminal status in
  `docs/agents/triage-labels.md`. Every `done` in `.scratch/` became `resolved`. `open` was left
  alone, because `/wayfinder` uses it to mean "unclaimed".
