# Review — CommitteeMembership Audit Subject Snapshots

Review of the local unstaged + untracked changes implementing `metadata.subject`
per `docs/AUDIT_TRAIL_MEMBERSHIP_SUBJECT.md`.

**Verdict:** The intention is fully realized at runtime — all 10 `CommitteeMembership`
audit call sites now snapshot who/where via the shared helper, the reader/UI consume
it, and the new unit tests pass (70/70 in the audit suites). However, the change
**introduces 9 net-new TypeScript errors** (baseline `tsc` errors: 34 → 43), almost
all from one design flaw in the helper's client type. This directly undercuts the
"maximize type safety" goal even though jest (transpile-only) is green.

---

## Coverage check (intention vs. implementation)

All files that log a `CommitteeMembership` audit event now attach a subject:

| Call site | Helper used | OK |
| --------- | ----------- | -- |
| `committee/add` | `buildMembershipAuditSubject` | ✅ |
| `committee/remove` | `buildMembershipAuditSubject` | ✅ |
| `committee/requestAdd` | `buildMembershipAuditSubject` | ✅ |
| `committee/handleRequest` | `fetchMembershipAuditSubject` / `…FromDb` | ✅ |
| `admin/bulkLoadCommittees` | `buildMembershipAuditSubject` (batched lookup) | ✅ |
| `admin/eligibility-flags/[id]/review` | `buildMembershipAuditSubject` (relation select) | ✅ |
| `admin/meetings/[meetingId]/decisions` | `fetchMembershipAuditSubject` | ✅ |
| `admin/handleCommitteeDiscrepancy` | `buildMembershipAuditSubject` | ✅ |
| `admin/petition-outcomes/record` | `buildMembershipAuditSubject` (batched map) | ✅ |
| `admin/audit/auditUtils` (reader) | `extractMembershipSubject` | ✅ |

No call site was missed. The reader validates untrusted JSON field-by-field in
`extractMembershipSubject`, which is the right call (audit rows are persisted JSON,
not trusted types) and is the strongest part of the change.

---

## Issues / gaps

### 1. (High) `AuditLogClient` type does not match Prisma — 7 of the 9 new `tsc` errors

`apps/frontend/src/lib/auditMembershipSubject.ts` defines a hand-rolled
`AuditLogClient` interface whose `findUnique` signatures
(`(args: Prisma.VoterRecordFindUniqueArgs) => Promise<VoterNameFields | null>`)
are **not structurally assignable from** Prisma's generic, overloaded client. As a
result every caller fails typecheck:

- `auditMembershipSubject.ts:146` — `fetchMembershipAuditSubjectFromDb` passing `prisma`
- `committee/handleRequest/route.ts:226, 288, 355` — passing `tx`
- `admin/meetings/[meetingId]/decisions/route.ts:175, 235` — passing `tx`
- `__tests__/lib/auditMembershipSubject.test.ts:71` — passing `prismaMock`

**Why it matters:** the abstraction exists to be type-safe and testable, but it is
currently typed in a way that no real or mocked Prisma client satisfies. It "works"
only because jest transpiles without typechecking.

**Suggested fix:** drop the custom interface and type the parameter as the actual
transaction-client type, which both `tx` and the full client satisfy:

```ts
import type { Prisma } from "@prisma/client";

export async function fetchMembershipAuditSubject(
  client: Prisma.TransactionClient,
  params: { … },
): Promise<AuditMembershipSubject> { … }
```

Keep the `select` projections as-is. This resolves all 7 errors and removes the
`VoterNameFields`/`CommitteeLocationFields`/`TermLabelFields` client-shape plumbing.

### 2. (Medium) New test mocks are not type-correct — 2 of the 9 new `tsc` errors

- `__tests__/api/admin/bulkLoadCommittees.bulkLoadUtils.test.ts:67` —
  `prismaMock.voterRecord.findMany.mockImplementation(({ where }: {…}) => …)` types the
  callback in a shape incompatible with Prisma's `findMany` overload (`args?` is
  optional/`SelectSubset`). Prefer `.mockImplementation((args) => { const ids = (args?.where?.VRCNUM as { in?: string[] })?.in ?? []; … })`
  with a locally typed accessor, or a single typed helper, rather than annotating the
  destructured parameter.
- `__tests__/lib/auditMembershipSubject.test.ts:63-69` —
  `prismaMock.committeeList.findUnique.mockResolvedValue({ …, term })` errors because the
  object literal is checked against the full `CommitteeList` type (which has no `term`
  and is missing `id/termId/ltedWeight`). Other suites work around this with
  `as never`/`as unknown as …` casts on mocked resolved values; this one should follow
  the same convention. (Note this is the same mock-vs-Prisma-type friction that
  pre-exists elsewhere in the suite, but these two are net-new.)

Both are confined to test files, but the task explicitly asked for type safety and
proper type conventions in the net-new tests, so they should be cleaned up.

### 3. (Low) `getName(voterRecord as VoterRecord)` cast in the helper

`buildMembershipAuditSubject` casts a `Pick<…>` to the full `VoterRecord` to satisfy
`getName`, even though `getName` only reads `firstName`/`middleInitial`/`lastName`.
Narrowing `getName`'s parameter to
`Pick<VoterRecord, "firstName" | "middleInitial" | "lastName">` would remove the
unsafe cast at the source and is a small, localized improvement. Acceptable to defer.

### 4. (Low) Redundant voter/term lookups per mutation

Several routes (`add`, `remove`, `requestAdd`, `handleCommitteeDiscrepancy`) add a
fresh `voterRecord.findUnique` / `committeeTerm.findUnique` purely for the subject,
even when the handler already loaded (or could load) the voter for eligibility/validation
just above. The doc positions `buildMembershipAuditSubject` as the "already-loaded"
path, but these sites re-fetch. Functionally fine and snapshot-faithful; worth a pass to
reuse already-loaded records where trivially available to avoid extra round-trips inside
hot mutation paths. `bulkLoad` and `petition-outcomes` already batch correctly — good.

---

## Things that are clean / done right

- Write-time snapshot semantics match the design doc (no read-time voter join).
- `mergeAuditMetadata` is idempotent and won't clobber an existing `subject`.
- Reader-side `extractMembershipSubject` does strict per-field runtime validation and
  correctly distinguishes `seatNumber: null` (present) from `undefined` (absent),
  mirroring the writer.
- `seatNumber` was added to the `afterValue` snapshots (`add`, `discrepancy`, `bulkLoad`)
  so the domain delta and the subject agree.
- UI changes are consistent with the doc: Entity ID column dropped from the table,
  copyable IDs + subject block added to the drawer, summaries now carry location/seat.
- Runtime behavior verified: `auditMembershipSubject.test.ts`, `auditUtils.test.ts`,
  `remove.test.ts`, `handleCommitteeDiscrepancy.test.ts`, `bulkLoadUtils.test.ts` pass.
  (`add.test.ts` fails only on an environmental missing build of
  `@voter-file-tool/shared-prisma`, unrelated to this change.)

---

## Bottom line

Functionally complete and faithful to the intention. The blocker for the stated
type-safety goal is **Issue #1** (one fix in `auditMembershipSubject.ts` clears 7 of the
9 new errors), followed by the two test-mock typings in **Issue #2**. Issues #3–#4 are
optional polish.
