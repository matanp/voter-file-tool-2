# 10 - Write the spec

Type: task
Status: open
Blocked by: 05, 07, 08, 09
Parent: ../map.md

## Question

Assemble the resolved decisions into `.scratch/date-handling/spec.md`, executable by an implementing agent with nothing left to decide.

It covers:

- The Calendar Date module: its seam, its interface, its tests.
- The schema change and the backfill, if ticket 05 kept them.
- The call sites that migrate, sliced into pieces an agent can finish in one session, in dependency order.
- The display module and the deletion of what it replaces.
- The range filter and the off-by-one fix.
- `skills/date-handling/SKILL.md`, and the CLAUDE.md line pointing at it.
- The lint rule and its allowlist.

Reaching the end of this ticket is reaching the destination. Write it against `writing-for-agents` — its reader is an agent, not a person.
