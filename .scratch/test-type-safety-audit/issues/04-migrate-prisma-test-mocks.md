# 04 - Migrate Prisma test mocks

Status: blocked-by-03

Type: refactor

## Why

The shared `getXxxMock(prismaMock)` accessors expose raw `jest.Mock` methods. Their 506 current call
sites bypass generated Prisma argument and result types, defeating the main benefit of
`DeepMockProxy<PrismaClient>`.

## To do

1. Remove the membership, audit-log, eligibility-flag, discrepancy, and meeting-record accessors in
   favor of direct `prismaMock.<model>.<method>` calls.
2. When a production query selects a narrow result, derive its fixture type from an exported
   selector, `Prisma.*GetPayload`, or a production-owned consumed interface.
3. Use `satisfies Model` for complete rows and `satisfies SelectedShape` for selected rows.
4. Reserve `resolvesTo` for Prisma `mockImplementation` boundaries that cannot return a plain
   promise under the generated fluent-client type.
5. Replace raw delegate `as jest.Mock` casts with typed mocks or a narrowly named shared boundary
   helper.
6. Migrate in coherent groups, beginning with membership and audit tests.

## Acceptance

- No `getXxxMock(prismaMock)` accessors remain.
- Delegate `mockResolvedValue` inputs are checked against generated or production-derived types.
- Selected-shape fixtures do not require complete unrelated database fields.
- The test typecheck and affected Jest suites pass after every migration group.

