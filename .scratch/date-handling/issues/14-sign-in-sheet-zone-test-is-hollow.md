# 14 - Sign-in sheet "same day in every zone" test doesn't change zones

Status: ready-for-agent
Source: PR #166 review

## Problem

`apps/report-server/src/__tests__/signInSheetHelpers.test.ts` (around line 296) runs
`it.each(['America/Los_Angeles', 'UTC', 'Pacific/Auckland'])` and sets `process.env.TZ` inside each case. Setting `TZ`
inside a Jest test file doesn't reach Node's ICU (see `apps/report-server/jest.globalSetup.cjs`), so all three cases run
in the suite's zone (`America/New_York` since PR #166). The test passes, but it says nothing about Los Angeles, UTC or
Auckland.

## Fix

Replace the `it.each` with one assertion under the global zone, plus a comment saying why. Or, if per-zone coverage
is worth it, run that file under separate Jest projects with their own `TZ`. Also drop the `afterEach` that restores
`process.env.TZ`.

## Acceptance criteria

- [ ] No report-server test sets `process.env.TZ` in a test body.
- [ ] Any per-zone claim left in a test name is backed by a run in that zone.
