# 11: Report applied outcomes and capacity failures truthfully

**Status:** resolved

**Priority:** P2 (safe follow-up from the branch code review)

**What to fix:** The import response currently returns the pre-write plan as though it confirms the
applied result. During apply, the live active-elsewhere and unique-constraint guards can turn a
planned activation into a discrepancy. They mutate the discrepancy map and skip the membership
write, but `plan.activations` and `plan.counts` remain unchanged. The response can therefore say a
membership was activated when it was not, and its discrepancy count can disagree with the
serialized discrepancy list.

Separately, an apply request that fails the pre-write capacity assertion constructs a clear message
naming the committee, then the route replaces it with the generic 500 body. This is safe—the guard
runs before writes—but needlessly opaque.

Keep planned and applied facts distinct. A dry run returns planned counts only. A successful apply
returns the same plan plus an explicit applied summary accumulated from completed mutation outcomes.
Do not rewrite the plan in place to make it look prophetic. If a live guard changes an outcome, the
applied summary records the skipped activation and resulting discrepancy.

Map expected capacity failures to a structured client-visible 422 response that includes every
capacity failure and the existing human-readable committee message. Unexpected failures remain
500s and must not expose stack traces or arbitrary exception text.

**Blocked by:** 07

## Acceptance criteria

- [x] Dry-run responses clearly identify their counts as planned outcomes.
- [x] Successful apply responses contain an applied summary derived from writes that actually
      completed, while retaining the original plan for comparison.
- [x] An apply-time active-elsewhere or unique-constraint conflict decrements actual activations,
      increments actual discrepancies, and leaves planned counts unchanged.
- [x] Counts agree with the serialized activation/removal/discrepancy collections they describe.
- [x] A capacity failure on `dryRun: false` returns 422, names the committee, includes the structured
      `capacityFailures`, and performs no committee, membership, discrepancy or audit writes.
- [x] Unexpected parse, filesystem and database failures retain the generic 500 response.
- [x] The response schemas from ticket 07 cover both planned and applied success bodies plus the
      structured capacity error.
- [x] Tests include a live conflict arising after planning and prove the response does not claim the
      skipped membership was written.

## Out of scope

- Changing the existing per-committee transaction boundary into one all-import transaction.
- Persisting import plans or runs.
- Retrying a membership conflict automatically.

## Comments

Part (a), the capacity error, is done. `assertWithinCapacity` now throws an exported
`RosterCapacityError` carrying every `PlannedCapacityFailure` with the same committee-naming
message as before; the route catches it ahead of the generic handler and answers
`422 { success: false, error, capacityFailures }`. `bulkLoadCommitteesErrorSchema` gained an
optional `capacityFailures` so the route test parses that body at runtime. The route test
proves no `$transaction` or discrepancy write happens, and the importer test asserts the
thrown error's class, message and failures. Unexpected failures are unchanged at 500.

Part (b), the applied summary, is done. `applyRosterImport` now returns
`{ plan, applied }`. It clones the plan's discrepancy map before the committee loop, so a live
active-elsewhere or unique-constraint guard adds to the applied map and never rewrites the
plan. `AppliedSummary` accumulates `activations` (with seat numbers), `removals` and
`skippedActivations` (`reason: "active-elsewhere"`) per committee, appended only after that
committee's transaction commits, so a rolled-back retry never counts; `applied.counts` is
derived from those collections and the applied map's size.

On the wire, `applied` changed from `boolean` to `AppliedSummary | null`: `null` on a dry
run, otherwise `{ counts: { activations, removals, discrepancies, skippedActivations },
activations[], removals[], skippedActivations[] }` with committees as plain identity values.
`counts` stays the plan's numbers on both. On an apply the route persists and serializes the
applied discrepancy map, so `discrepanciesMap.length === applied.counts.discrepancies`. The
message states the shortfall: `Applied: 1 of 2 planned activations written, 1 skipped as live
conflicts, 0 removed`. The schemas are strict and exported from shared-validators.

Tests: the importer test simulates the race (bulk `findMany` sees no active memberships at
plan time; per-voter `findFirst` finds one at apply time) and proves the plan is untouched,
the applied counts drop by one, the skipped voter is named and no membership write happened
for them. The PostgreSQL trigger test asserts the same against the real unique index. The
route test proves the response carries both the plan and the applied summary, and that the
persisted discrepancies are the applied ones.
