# 11: Report applied outcomes and capacity failures truthfully

**Status:** ready-for-agent

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

- [ ] Dry-run responses clearly identify their counts as planned outcomes.
- [ ] Successful apply responses contain an applied summary derived from writes that actually
      completed, while retaining the original plan for comparison.
- [ ] An apply-time active-elsewhere or unique-constraint conflict decrements actual activations,
      increments actual discrepancies, and leaves planned counts unchanged.
- [ ] Counts agree with the serialized activation/removal/discrepancy collections they describe.
- [x] A capacity failure on `dryRun: false` returns 422, names the committee, includes the structured
      `capacityFailures`, and performs no committee, membership, discrepancy or audit writes.
- [x] Unexpected parse, filesystem and database failures retain the generic 500 response.
- [ ] The response schemas from ticket 07 cover both planned and applied success bodies plus the
      structured capacity error.
- [ ] Tests include a live conflict arising after planning and prove the response does not claim the
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

Part (b), the applied summary, follows in a separate commit.
