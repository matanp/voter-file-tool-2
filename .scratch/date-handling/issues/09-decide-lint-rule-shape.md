# 09 - Decide the lint rule's shape and its allowlist

Type: grilling
Status: open
Blocked by: 06
Parent: ../map.md

## Question

What exactly does the lint rule forbid, and where?

Charting settled the posture: a rule scoped to calendar-date paths with an allowlist for instant handling, not an app-wide ban. A rule that fires on 126 sites when a fraction are wrong teaches everyone to write disable comments, and a disabled rule holds nothing.

Settle:

- What the rule matches — `new Date(` by path, by identifier, by the Prisma model being written, or something narrower.
- Which paths it covers, drawing on ticket 01's classification.
- How an instant site declares itself legitimate, and whether that is a disable comment or a call to a sibling module.
- Whether it is `no-restricted-syntax` or a small custom rule.
- Whether it fails CI or only warns, on the first pass.

## Comments

### 2026-11-19: stopgap rule landed on `chore/calendar-date-lint`

`apps/frontend/.eslintrc.cjs` has a `no-restricted-syntax` error for `new Date(x.<field>).toLocaleDateString(...)` with
no `timeZone` option, where `<field>` is `DOB`, `originalRegDate`, `meetingDate` or `petitionPrimaryDate`. These are the
ticket 11 sites. It matches by property name, so it misses aliased values (`const d = record.DOB`), other calendar
fields, and report-server. It's a guard against ticket 11 coming back, not the answer to this ticket. Replace or widen
it once 06 fixes the module's entry points.
