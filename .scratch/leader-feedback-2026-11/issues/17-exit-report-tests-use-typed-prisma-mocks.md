# 17 - Exit Report tests use typed Prisma mocks

Status: ready-for-agent

## Problem

The Exit Report branch extends the legacy `getMembershipMock` / `getAuditLogMock`
accessors and adds call-site `as never` / `as unknown as` casts in several changed
test suites. Those patterns erase the generated Prisma delegate types, so schema
or selected-row drift can compile unnoticed.

Follow `skills/test-type-safety/SKILL.md`: call `prismaMock.<model>.<method>`
directly, use named selected/include row shapes or `satisfies`-typed fixtures,
and keep unavoidable runtime-boundary casts in the shared test helpers.

## Acceptance criteria

- [ ] Changed Exit Report tests do not add uses of the untyped Prisma mock accessors.
- [ ] Changed Exit Report tests contain no casual `as never` or `as unknown as` casts.
- [ ] Selected/include query fixtures are checked against named shapes.
- [ ] Frontend `tsc --noEmit` and the affected suites pass.
