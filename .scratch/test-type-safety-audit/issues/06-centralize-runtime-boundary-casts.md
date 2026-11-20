# 06 - Centralize runtime-boundary casts

Status: blocked-by-03

Type: refactor

## Why

Some assertions are unavoidable at framework boundaries such as global `fetch`, custom
`NextRequest` objects, `FormData`, xlsx mocks, raw SQL tagged-template mocks, and Jest asymmetric
matchers. Repeating those assertions at call sites makes legitimate exceptions indistinguishable
from domain-contract erasure.

## To do

1. Inventory repeated boundary casts and classify each as legitimate, replaceable, or domain
   erasure.
2. Extend `mocks.ts` or another focused utility with named helpers for legitimate boundaries.
3. Migrate component tests that directly assign `global.fetch` to `installFetchMock` or an improved
   equivalent.
4. Centralize NextRequest, xlsx, FormData, raw SQL, and matcher assertions when the same pattern
   appears in three or more files.
5. Add approved helper files to the scanner allowlist from ticket 03.
6. Keep invalid-input test data as `unknown` or `Record<string, unknown>` until it reaches the public
   runtime boundary.

## Acceptance

- Repeated boundary assertions are replaced by helpers whose names state the boundary.
- Approved casts are concentrated in a small, documented allowlist.
- Domain objects are not forced into valid types merely to reach validation code.
- A reviewer can distinguish an intentional boundary from an accidental type escape without
  reconstructing the test's entire control flow.

