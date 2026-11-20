# 21 - Parse electionDistrict strictly

Status: ready-for-agent
Merge blocking: no

## Problem

Several committee schemas in `apps/frontend/src/lib/validations/committee.ts`
parse `electionDistrict` with a bare `z.coerce.number().int().positive(...)`,
which runs `Number(...)` on any input. That lets junk through:

- `true` → 1
- `[5]` and `["5"]` → 5

Values that coerce to 0 or NaN (`0`, `"x"`, `null`, `false`, `[]`) are still
rejected.

The affected schemas:

- `committeeMemberTargetSchema` (shared by `removeCommitteeDataSchema`,
  `resignCommitteeDataSchema`, and `reportExitDataSchema`)
- `committeeDataSchema`
- `committeeRequestDataSchema`

`fetchCommitteeListQuerySchema` already uses a digits-only regex and is fine.

Ticket 19 stopped `legDistrict` from accepting this kind of junk in the Exit
Report. `electionDistrict` has the same problem. It's low-stakes, because every
client sends a real number, so only hand-crafted requests can hit it.

## Acceptance criteria

- [ ] One shared `electionDistrict` parser accepts only a number or a numeric
      string (trimmed) and produces a positive integer. It mirrors the
      `legDistrict` parser but is required.
- [ ] All the schemas listed above use it.
- [ ] Tests show that `true`, `[5]`, and `["5"]` are rejected, and that numbers
      and numeric strings still parse as before.
- [ ] Clients (`memberKey()` / `legDistrictParam()` in
      `apps/frontend/src/app/committees/workspace/adapters.ts`, and the
      `committeeDataSchema` / `committeeRequestDataSchema` callers) still send
      payloads the new parser accepts.

## Comments

- 2026-11-07: Split out of ticket 19 (see its Comments), after PR #138 merged.
