# 01 - Restore a green test-typecheck baseline

Status: ready-for-agent

Type: maintenance

## Why

A required typecheck cannot be introduced while the intended commands fail. The current failures
are useful contract-drift findings, not reasons to omit the gate.

## To do

1. Update frontend membership fixtures that claim to satisfy `CommitteeMembership` with
   `exitReportedAt`, `exitReportedById`, and `exitReportedKind`.
2. Update the report-server `CommitteeWithMembers` fixture with the same fields.
3. Add labels for `MEMBER_EXIT_REPORTED` and `MEMBER_EXIT_REPORT_REJECTED` to the frontend
   `AuditAction` label map, using the product's established wording.
4. Fix the shared-validator self-import in `searchQueryUtilsDateRange.test.ts`. Prefer a test
   configuration that resolves the public package entry point if the test is intentionally checking
   exports; otherwise use the appropriate source import.
5. Run all four test-inclusive TypeScript checks and record any newly exposed errors.

## Acceptance

- Frontend, report-server, shared-validator, and voter-import test-inclusive TypeScript checks pass.
- The fixes do not use `as never`, double assertions, raw `any`, or raw `jest.Mock` to hide the
  reported drift.
- Existing Jest suites affected by fixture changes still pass.

