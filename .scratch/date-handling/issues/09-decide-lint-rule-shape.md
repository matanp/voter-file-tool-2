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
ticket 11 sites. It matches by property name, so it misses aliased values (`const d = record.DOB`), `new Date(r?.DOB)` and
`new Date(r.DOB!)`, other calendar fields, and report-server. It also flags options passed as a variable, even one
that sets `timeZone`.

### 2026-11-19: PR #166 review

- Widened: the stopgap now also matches the field formatted directly (`r.DOB.toLocaleDateString()`), and a quoted
  `"timeZone"` key counts.
- Kept: any `timeZone` value silences it, `UTC` or not. Requiring `'UTC'` was rejected as too rigid for a stopgap.
  The risk: `timeZone: 'America/New_York'` passes lint and still renders the day early. Eastern is the zone people will
  reach for, since instants ("generated on", ticket 12) should use it. The real rule should take a position.
- Widened again: the field is matched anywhere inside `new Date(...)`, so `new Date(r.meetingDate ?? "")` and ternaries
  are caught. `r?.DOB` and `r.DOB!` are caught by this too.
- CI now runs frontend lint (`.github/workflows/test.yml`). Before, the rule only fired in local lint and `next build`.
- For this ticket: the stopgap only watches `toLocaleDateString`. These render a UTC-midnight calendar date a day early
  just the same and get through: `toLocaleString`, `toDateString`, `getDate`/`getMonth`/`getFullYear`, and
  `new Intl.DateTimeFormat().format(...)`. The real rule needs a position on each. Covering them by field name in the
  stopgap would fire on far more instant sites. It's a guard against ticket 11 coming back, not the answer to this ticket. Replace or widen
it once 06 fixes the module's entry points.
