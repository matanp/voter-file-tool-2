# 05 - Schema-validate public response contracts

Status: ready-after-02

Type: test-hardening

## Why

`parseJsonResponse<T>()` asserts a compile-time type without checking the runtime body. The safer
`parseJsonResponseWith(response, schema)` helper exists but currently has no call sites.

## To do

1. Inventory response schemas for public APIs, reports, auth, uploads, invites, audit routes, and
   generated worker payloads.
2. Reuse shared production schemas when available.
3. Add response schemas at the shared contract boundary when none exists; avoid test-only schemas
   that can drift independently from production.
4. Migrate high-risk tests from `parseJsonResponse<T>()` to `parseJsonResponseWith()`.
5. Retain the generic assertion helper only for genuinely low-risk unit-test responses.
6. Add at least one regression test showing that an incompatible runtime response fails schema
   parsing.

## Acceptance

- All named high-risk contract categories parse runtime response bodies through a production-owned
  Zod schema.
- A response shape drift causes a clear test failure containing Zod issues.
- Low-risk uses of the generic helper are documented and limited.

