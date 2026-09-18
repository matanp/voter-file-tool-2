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
