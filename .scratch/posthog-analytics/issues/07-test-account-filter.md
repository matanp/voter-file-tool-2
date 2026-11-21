# 07 - Test-account filter: qa_agent, Developer, DEV identities

Status: ready-for-human

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
