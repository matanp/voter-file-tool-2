# 07 - Test-account filter: qa_agent, Developer, DEV identities

Status: resolved

## Problem

The PostHog project's test-account filter (Project settings → Product analytics → Filter out internal and test
users) has one rule: `$host` not matching localhost. As a result:

- `CLAUDE.md` says `?qa_agent=1` tabs are dropped by the test-account filter. The frontend change that registers
  `qa_agent: true` is in progress in `PostHog.tsx`, but **the filter has no `qa_agent` rule yet**, so agent QA
  traffic still counts as real usage.
- Developer accounts (about 460 sessions, more than all other roles combined) count as real users.
- Local-dev identities (`devMode: true`, names prefixed `DEV - `) count, except where the host happens to be
  localhost.

## Do (PostHog settings, not code)

Add these to the project's test-account filters:
- Event property `qa_agent` is not set (or ≠ `true`).
- Person property `privilegeLevel` ≠ `Developer`.
- Person property `devMode` ≠ `true`.

Then check that a trends insight with "Filter out internal and test users" drops them.
If testers from 05 should also be excluded by default, add `tester` ≠ `true` as well.

## Comments

2026-11-21: Done. The project's test-account filter now has six rules:

1. `$host` not matching localhost / 127.0.0.1
2. `$host` not matching `*.vercel.app` (previews)
3. Not in cohort 746194 "Internal team" (the maintainer's emails; add teammates there)
4. Event property `qa_agent` is not set
5. Person `privilegeLevel` ≠ `Developer`
6. Person `devMode` ≠ `true`

Rules 1–4 were added by hand earlier the same day. Rules 5–6 cover one Developer-role person outside the cohort and
two `DEV -` identities on a non-local host. Checked: 90-day pageviews by `privilegeLevel` with the filter on show
Admin / Leader / ReadAccess / no-value (anonymous) and no Developer rows. Testers from 05 aren't excluded yet; add
`tester` ≠ `true` when that property exists.
