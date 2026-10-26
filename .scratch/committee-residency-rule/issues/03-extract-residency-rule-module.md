# 03 - Extract one residency rule module

Status: ready-for-agent
Type: task

## Why

The rule "who may serve on this committee?" is currently written in several places:

- `isAssemblyDistrictMismatch` in `packages/shared-prisma/src/eligibilityPredicates.ts`
- an inline crosswalk `findUnique` in `apps/frontend/src/lib/eligibility.ts`
- `ltedKey` and `crosswalkByKey` in `packages/shared-prisma/src/boeEligibilityFlagging.ts`
- the search filters in `adapters.ts` and `AddCommitteeForm.tsx`

The search filter has already drifted from the gates. This ticket gives the rule a single home.
**It doesn't change behaviour**: both server gates already enforce the AD-only rule.

See the spec (`../spec.md`), Architecture review #1.

`requireAssemblyDistrictMatch` stays optional (ticket 01), so keep it as a parameter of the
module.

## To do

1. **Write characterization tests first.** They should pass on the current code.
   - `apps/frontend/src/__tests__/lib/eligibility.test.ts`: add a voter with a different ED, LD
     and town but the same AD → eligible. The cases "different AD → `ASSEMBLY_DISTRICT_MISMATCH`"
     (line 116) and "no crosswalk row → `ASSEMBLY_DISTRICT_MISMATCH`" (line 129) already exist.
     Keep them.
   - `apps/frontend/src/__tests__/lib/boeEligibilityFlagging.test.ts`: a member with a different
     ED but the same AD → no flag.

   These tests run against Prisma mocks, and the gate never reads the voter's ED, LD or town, so
   they pass trivially. Their job is to state the rule by name.
2. **Add a residency module in `packages/shared-prisma`.** Like `runBoeEligibilityFlagging`, its
   functions take a db client as a parameter, so the frontend can pass `~/lib/prisma`. It owns:
   - finding the committee's AD from its LTED, for one committee or a batch
     (trimmed; `null` when there's no row or the AD is empty).
     The single-committee lookup stays a `findUnique` on the
     `cityTown_legDistrict_electionDistrict` key. Several suites mock exactly that call
     (`setupEligibilityPass` in `apps/frontend/src/__tests__/utils/testUtils.ts`,
     `api/committee/eligibility.test.ts`, `api/admin/governance-config.integration.test.ts`).
     Don't route single lookups through the batch `findMany`.
   - checking a voter's `stateAssmblyDistrict` against it, honouring
     `requireAssemblyDistrictMatch`. When the flag is off, no crosswalk query runs at all
     (`eligibility.test.ts` line 153 asserts this).
   - the details to report on a mismatch (`expectedAssemblyDistrict`, `voterAssemblyDistrict`,
     each trimmed or `null`). Only BOE flagging uses these today. The admission gate records just
     the reason.

   Put the module's unit tests in `packages/shared-prisma/src/__tests__/`, next to
   `committeeDesignationWeight.test.ts`.
3. **Switch the callers.** `validateEligibility` and `detectFlagsForMembership` call the module, and
   their own crosswalk lookups and key helpers are removed. Fold `isAssemblyDistrictMismatch` into
   the module, and move its cases from
   `apps/frontend/src/__tests__/app/api/lib/eligibilityPredicates.test.ts` into the module's tests.
   Keep this behaviour in `validateEligibility`: when the committee row is missing and the flag is
   on, the result is `ASSEMBLY_DISTRICT_MISMATCH`.
4. **Delete `apps/frontend/src/app/api/lib/eligibilityService.ts`.** It only re-exports
   shared-prisma. Import from `@voter-file-tool/shared-prisma` directly. Two tests import through
   it:
   - `eligibilityPredicates.test.ts`: repoint its remaining imports (`normalizeEligibilityText`).
   - `eligibilityService.test.ts`: this is the only test of `getMostRecentImportVersion` and
     `isVoterPossiblyInactive`, so move its cases rather than delete them (import from
     shared-prisma; rename the file or move it into shared-prisma's `__tests__`).

Leave the search filter alone. That's ticket 04, which will also add a filter-building function to
this module.

## Acceptance

- The new tests pass, before and after the refactor.
- No crosswalk lookup for residency remains outside the module. (The admin crosswalk routes and
  the weighted-table import query the crosswalk for other reasons. They stay as they are.)
- No test coverage is lost for `getMostRecentImportVersion`, `isVoterPossiblyInactive`, or the AD
  mismatch cases.
- The frontend consumes shared-prisma's `dist`, so run
  `pnpm --filter @voter-file-tool/shared-prisma build` first. Then the shared-prisma tests, the
  frontend typecheck, and the existing eligibility and BOE flagging tests pass.

## Comments
